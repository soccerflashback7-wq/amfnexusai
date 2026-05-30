
-- ============ ROLES ENUM ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'employee', 'viewer');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status public.approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ has_role (SECURITY DEFINER, no recursion) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- ============ APPROVAL REQUESTS ============
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  reason TEXT,
  requested_role public.app_role NOT NULL DEFAULT 'employee',
  status public.approval_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at DESC);

-- ============ RLS POLICIES — profiles ============
CREATE POLICY "users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "users update own profile basic fields" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins update any profile" ON public.profiles
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ RLS POLICIES — user_roles ============
CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins read all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "admins manage roles (insert)" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid())
  AND (role <> 'super_admin' OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "admins manage roles (delete)" ON public.user_roles
FOR DELETE TO authenticated USING (
  public.is_admin(auth.uid())
  AND (role <> 'super_admin' OR public.has_role(auth.uid(), 'super_admin'))
);

-- ============ RLS POLICIES — approval_requests ============
CREATE POLICY "users read own request" ON public.approval_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins read all requests" ON public.approval_requests
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update requests" ON public.approval_requests
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ RLS POLICIES — activity_logs ============
CREATE POLICY "users read own logs" ON public.activity_logs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins read all logs" ON public.activity_logs
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "authenticated insert own logs" ON public.activity_logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  is_first_user BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  is_first_user := (user_count = 0);

  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN is_first_user THEN 'approved'::public.approval_status ELSE 'pending'::public.approval_status END
  );

  IF is_first_user THEN
    -- Bootstrap: first user becomes super_admin and is auto-approved
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.approval_requests (user_id, email, full_name, reason, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'reason',
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ APPROVAL TRIGGER ============
-- When an approval_request is updated to approved, propagate to profile + grant role.
CREATE OR REPLACE FUNCTION public.handle_approval_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    UPDATE public.profiles SET status = 'approved' WHERE user_id = NEW.user_id;
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, NEW.requested_role, auth.uid())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.profiles SET status = 'rejected' WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'suspended' THEN
    UPDATE public.profiles SET status = 'suspended' WHERE user_id = NEW.user_id;
  END IF;

  NEW.reviewed_at := now();
  NEW.reviewed_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_approval_decision
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_approval_decision();
