import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import * as schema from './schema';
import { PERMISSION_DEFINITIONS } from '../permissions/permissions.seed';

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('Seeding permissions...');
  for (const def of PERMISSION_DEFINITIONS) {
    await db.insert(schema.permissions).values(def).onConflictDoNothing();
  }
  const allPermissions = await db.select().from(schema.permissions);
  console.log(`  ${allPermissions.length} permissions ready.`);

  console.log('Seeding system roles...');
  const systemRoles = [
    { name: 'System Administrator', description: 'Full system access', isSystem: true },
    { name: 'Organization Administrator', description: 'Manages users, departments, and roles within an organization', isSystem: true },
    { name: 'Workflow Designer', description: 'Can create and publish workflows and forms', isSystem: true },
    { name: 'Requester', description: 'Can submit workflow requests', isSystem: true },
    { name: 'Reviewer', description: 'Can view and comment on requests', isSystem: true },
    { name: 'Approver', description: 'Can approve, reject, or return requests', isSystem: true },
    { name: 'Viewer', description: 'Read-only access', isSystem: true },
  ];

  for (const role of systemRoles) {
    const [existing] = await db.select().from(schema.roles).where(eq(schema.roles.name, role.name));
    if (!existing) {
      await db.insert(schema.roles).values(role);
    }
  }
  const allRoles = await db.select().from(schema.roles).where(eq(schema.roles.isSystem, true));
  console.log(`  ${allRoles.length} roles ready.`);

  console.log('Assigning permissions to System Administrator role...');
  const sysAdminRole = allRoles.find((r) => r.name === 'System Administrator');
  if (sysAdminRole) {
    await db.delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, sysAdminRole.id));

    await db.insert(schema.rolePermissions)
      .values(allPermissions.map((p) => ({ roleId: sysAdminRole.id, permissionId: p.id })))
      .onConflictDoNothing();
    console.log(`  Assigned all ${allPermissions.length} permissions to System Administrator.`);
  }

  console.log('Seeding super admin user...');
  const email = 'admin@flowforge.dev';
  const password = 'Admin@1234';
  const passwordHash = await hash(password);

  const [existing] = await db.select().from(schema.users)
    .where(eq(schema.users.email, email));

  if (existing) {
    console.log(`  User ${email} already exists, skipping.`);
  } else {
    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
      isEmailVerified: true,
    }).returning();

    if (sysAdminRole) {
      await db.insert(schema.userRoles).values({
        userId: user.id,
        roleId: sysAdminRole.id,
      });
    }

    console.log(`  Created super admin: ${email} / ${password}`);
  }

  console.log('\nSeed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
