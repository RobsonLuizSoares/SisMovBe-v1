-- Função para listar profiles com email (apenas admins)
CREATE OR REPLACE FUNCTION public.get_profiles_with_email()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role user_role,
  unit_id uuid,
  active boolean,
  created_at timestamptz,
  unit_name text,
  unit_ul_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    au.email::text,
    p.full_name,
    p.role,
    p.unit_id,
    p.active,
    p.created_at,
    u.name,
    u.ul_code::text
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.units u ON u.id = p.unit_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles caller
    WHERE caller.user_id = auth.uid()
    AND caller.active = true
    AND caller.role IN ('PATRIMONIO_ADMIN', 'SEAME_ADMIN')
  )
  ORDER BY p.created_at DESC;
$$;
