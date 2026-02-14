
CREATE OR REPLACE FUNCTION public.sha256_hex(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(coalesce(t,''), 'sha256'), 'hex');
$$;
