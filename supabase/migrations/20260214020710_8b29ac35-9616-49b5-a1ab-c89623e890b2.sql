
CREATE OR REPLACE FUNCTION public.gen_telauthorium_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ts text := to_char(now(), 'YYYYMMDD-HH24MISS');
  rand text := substr(md5(gen_random_uuid()::text), 1, 8);
BEGIN
  RETURN 'TELA-' || ts || '-' || rand;
END;
$$;
