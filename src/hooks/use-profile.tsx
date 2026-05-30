import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return {
        profile,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });
}

export function hasAnyRole(roles: AppRole[] | undefined, ...allowed: AppRole[]) {
  if (!roles) return false;
  return roles.some((r) => allowed.includes(r));
}
