import { auth } from "@epl-fellows-platform/auth";
import { db } from "./index.js";
import { tenants, userTenants } from "./schema/epl.js";
import { user } from "./schema/auth.js";
import { eq } from "drizzle-orm";

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
      console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);
    } else {
      console.log(`ℹ️ Tenant already exists: ${tenant.name} (${tenant.id})`);
    }

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
        throw err;
      }
    }

    // 3. Assign super_admin role in userTenants table
    const existingUserTenant = await db.query.userTenants.findFirst({
      where: (ut, { eq, and }) =>
        and(eq(ut.userId, createdUser.id), eq(ut.tenantId, tenant.id)),
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
  } catch (error) {
    console.error("❌ Failed to create Super Admin:", error);
  }
}

seedSuperAdmin();
