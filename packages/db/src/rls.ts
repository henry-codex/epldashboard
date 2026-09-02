import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

export interface RLSContext {
  userId: string;
  tenantId: string;
  role: string;
}

/**
 * Execute database queries within a PostgreSQL transaction configured with RLS context session variables.
 */
export async function withRLS<T>(
  db: PgDatabase<any, any, any>,
  ctx: RLSContext,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set PostgreSQL local session variables for RLS policies
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_role', ${ctx.role}, true)`);

    return callback(tx);
  });
}

/**
 * SQL statements to enable Row-Level Security and create RLS policies for multi-tenant tables.
 */
export const RLS_MIGRATION_SQL = `
-- Enable Row Level Security on core tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fellows ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 1. Tenant Isolation Policy on 'fellows' table
DROP POLICY IF EXISTS fellows_tenant_isolation ON fellows;
CREATE POLICY fellows_tenant_isolation ON fellows
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
    OR tenant_id::text = current_setting('app.current_tenant_id', true)
    OR profile_id = current_setting('app.current_user_id', true)
  );

-- 2. Tenant Isolation Policy on 'placements' table
DROP POLICY IF EXISTS placements_tenant_isolation ON placements;
CREATE POLICY placements_tenant_isolation ON placements
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
    OR tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- 3. Tenant & Ownership Isolation Policy on 'check_ins' table
DROP POLICY IF EXISTS checkins_tenant_isolation ON check_ins;
CREATE POLICY checkins_tenant_isolation ON check_ins
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
    OR tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- 4. Activity Log Isolation Policy
DROP POLICY IF EXISTS activity_log_tenant_isolation ON activity_log;
CREATE POLICY activity_log_tenant_isolation ON activity_log
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
    OR tenant_id::text = current_setting('app.current_tenant_id', true)
  );
`;
