-- Prisma's own internal migration-history table is not declared in
-- schema.prisma (it's auto-created by Prisma Migrate), so it was missed by
-- the prior migration that enabled RLS on every app table. Supabase's
-- advisor still flags it since it's a public-schema table exposed to the
-- same anon/authenticated PostgREST roles. Same fix, same reasoning: no
-- policies, so those roles get zero rows; the app's own Prisma connection
-- (table owner) is unaffected.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
