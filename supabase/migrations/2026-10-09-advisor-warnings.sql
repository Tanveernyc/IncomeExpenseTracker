-- SECURITY ADVISOR WARNINGS — clears the three database warnings from 2026-10-09.
-- Idempotent: safe to run more than once.
--
-- 1. properties_sync_legacy_type() had no fixed search_path, so a caller who
--    could create objects earlier on the path could shadow what it references.
--
-- 2. enforce_own_references() is SECURITY DEFINER. "revoke ... from public" is
--    not enough on Supabase, which grants EXECUTE to anon and authenticated
--    directly. It is a trigger function, so neither role could call it anyway,
--    but nobody needs EXECUTE: Postgres checks it only when a trigger is
--    created, never when the trigger fires.

alter function properties_sync_legacy_type() set search_path = public, pg_temp;

revoke execute on function enforce_own_references() from anon, authenticated;
