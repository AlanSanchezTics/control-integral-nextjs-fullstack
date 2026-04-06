-- JWT-only authentication cleanup
-- Compatibility rollout:
-- 1) Deploy app code that no longer depends on `sessions`
-- 2) Apply this migration

ALTER TABLE `sessions`
  DROP FOREIGN KEY `sessions_user_id_fkey`;

DROP TABLE `sessions`;
