-- Grant execution rights required by RLS policies

grant execute on function public.is_admin(uuid)
to authenticated;

grant execute on function public.has_role(uuid, public.app_role)
to authenticated;

grant execute on function public.is_admin(uuid)
to service_role;

grant execute on function public.has_role(uuid, public.app_role)
to service_role;