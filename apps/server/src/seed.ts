import "dotenv/config";
import { auth } from "@epl-fellows-platform/auth";
import { db, tenants, userTenants } from "@epl-fellows-platform/db";
import { user } from "@epl-fellows-platform/db/schema/auth";
import { eq, and } from "drizzle-orm";

async function seedSuperAdmin() {
  console.log("🌱 Creating Super Admin user...");

  const adminEmail = "test@gmail.com";
  const adminPassword = "12345678";
  const adminName = "Super Admin";

  try {
    // 1. Create or ensure Default Tenant exists
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "default"),
    });

    if (!tenant) {
      const [newTenant] = await db
        .insert(tenants)
        .values({
          name: "EPL Global Platform",
          slug: "default",
          countryCode: "GLOBAL",
          isActive: true,
        })
        .returning();
      tenant = newTenant;
    }

    if (!tenant) {
      throw new Error("Failed to create or retrieve tenant");
    }

    console.log(`✅ Tenant ready: ${tenant.name} (${tenant.id})`);

    // 2. Register user via Better Auth API
    let createdUser;
    try {
      const authResult = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName,
        },
      });
      createdUser = authResult.user;
      console.log(`✅ Super Admin created via Better Auth: ${createdUser.email} (${createdUser.id})`);
    } catch (err: any) {
      // If user already exists in auth table, retrieve user
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, adminEmail),
      });

      if (existingUser) {
        createdUser = existingUser;
        console.log(`ℹ️ User already exists in database: ${createdUser.email} (${createdUser.id})`);
      } else {
        console.warn("Notice during sign up:", err?.message || err);
        const fallbackUser = await db.query.user.findFirst({
          where: eq(user.email, adminEmail),
        });
        if (fallbackUser) {
          createdUser = fallbackUser;
        } else {
          throw err;
        }
      }
    }

    // 3. Assign super_admin role in userTenants table
    const existingUserTenant = await db.query.userTenants.findFirst({
      where: and(eq(userTenants.userId, createdUser.id), eq(userTenants.tenantId, tenant.id)),
    });

    if (!existingUserTenant) {
      await db.insert(userTenants).values({
        userId: createdUser.id,
        tenantId: tenant.id,
        role: "super_admin",
        permissions: { all: true },
      });
      console.log(`✅ Assigned 'super_admin' role to ${createdUser.email} for tenant ${tenant.name}`);
    } else {
      console.log(`ℹ️ 'super_admin' role already assigned to ${createdUser.email}`);
    }

    console.log("\n🎉 Super Admin setup complete!");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: super_admin`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create Super Admin:", error);
    process.exit(1);
  }
}

seedSuperAdmin();
