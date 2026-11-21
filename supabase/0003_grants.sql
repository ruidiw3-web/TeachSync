-- ============================================================
-- 授权：让 anon / authenticated / service_role 能访问 public schema
-- Supabase 用 SQL Editor 手工建表时，默认不会自动授权，必须显式执行本段
-- 用法：SQL Editor → 粘贴 → Run（幂等，可重复执行）
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- 以后新建的表自动授权，避免再次踩坑
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;
