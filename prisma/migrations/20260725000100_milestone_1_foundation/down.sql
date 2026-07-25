-- Optional manual rollback for a disposable environment.
-- Back up production data before applying. Prisma does not execute this file.
DROP TABLE IF EXISTS "ActivityLog";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "MembershipLocation";
DROP TABLE IF EXISTS "OrganisationMembership";
DROP TABLE IF EXISTS "RolePermission";
DROP TABLE IF EXISTS "Permission";
DROP TABLE IF EXISTS "Role";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "ServiceLocation";
DROP TABLE IF EXISTS "Organisation";
DROP TYPE IF EXISTS "ActivityAction";
DROP TYPE IF EXISTS "MembershipStatus";
