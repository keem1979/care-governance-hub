import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_PERMISSION_MAP,
  type RoleKey,
} from "../src/lib/permissions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
const DEMO_PASSWORD = "DemoCare!2026";

const roles: Record<RoleKey, { name: string; description: string }> = {
  [ROLE_KEYS.OWNER]: {
    name: "Organisation Owner",
    description: "Full organisation administration and access.",
  },
  [ROLE_KEYS.NOMINATED_INDIVIDUAL]: {
    name: "Nominated Individual",
    description: "Organisation-wide governance review and reporting.",
  },
  [ROLE_KEYS.REGISTERED_MANAGER]: {
    name: "Registered Manager",
    description: "Manages governance records for assigned service locations.",
  },
  [ROLE_KEYS.QUALITY_MANAGER]: {
    name: "Quality or Compliance Manager",
    description: "Reviews and edits governance records across assigned locations.",
  },
  [ROLE_KEYS.AUDITOR]: {
    name: "Auditor or Consultant",
    description: "Completes audits for explicitly assigned locations.",
  },
  [ROLE_KEYS.STAFF]: {
    name: "Staff Contributor",
    description: "Uploads evidence and completes assigned work.",
  },
  [ROLE_KEYS.VIEWER]: {
    name: "Read-Only Viewer",
    description: "Views authorised governance records without changing them.",
  },
};

const users: Array<{
  name: string;
  email: string;
  role: RoleKey;
  allLocations: boolean;
}> = [
  {
    name: "Olivia Owner",
    email: "owner@meadowview.demo",
    role: ROLE_KEYS.OWNER,
    allLocations: true,
  },
  {
    name: "Nina Nominated",
    email: "nominated@meadowview.demo",
    role: ROLE_KEYS.NOMINATED_INDIVIDUAL,
    allLocations: true,
  },
  {
    name: "Ravi Manager",
    email: "manager@meadowview.demo",
    role: ROLE_KEYS.REGISTERED_MANAGER,
    allLocations: false,
  },
  {
    name: "Quinn Quality",
    email: "quality@meadowview.demo",
    role: ROLE_KEYS.QUALITY_MANAGER,
    allLocations: true,
  },
  {
    name: "Avery Auditor",
    email: "auditor@meadowview.demo",
    role: ROLE_KEYS.AUDITOR,
    allLocations: false,
  },
  {
    name: "Sam Contributor",
    email: "staff@meadowview.demo",
    role: ROLE_KEYS.STAFF,
    allLocations: false,
  },
  {
    name: "Robin Viewer",
    email: "viewer@meadowview.demo",
    role: ROLE_KEYS.VIEWER,
    allLocations: false,
  },
];

async function main() {
  const permissionRows = await Promise.all(
    Object.entries(PERMISSIONS).map(([, key]) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          description: key.replaceAll(":", " ").replaceAll("-", " "),
        },
      }),
    ),
  );
  const permissionIdByKey = new Map(
    permissionRows.map(({ id, key }) => [key, id]),
  );

  for (const [key, definition] of Object.entries(roles) as Array<
    [RoleKey, (typeof roles)[RoleKey]]
  >) {
    const role = await prisma.role.upsert({
      where: { key },
      update: definition,
      create: { key, ...definition },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSION_MAP[key].map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionIdByKey.get(permissionKey)!,
      })),
    });
  }

  const organisation = await prisma.organisation.upsert({
    where: { slug: "meadow-view-home-care" },
    update: { name: "Meadow View Home Care Ltd", isDemo: true },
    create: {
      name: "Meadow View Home Care Ltd",
      slug: "meadow-view-home-care",
      isDemo: true,
    },
  });
  const location = await prisma.serviceLocation.upsert({
    where: {
      organisationId_code: {
        organisationId: organisation.id,
        code: "BASINGSTOKE",
      },
    },
    update: { name: "Basingstoke Branch", isActive: true },
    create: {
      organisationId: organisation.id,
      name: "Basingstoke Branch",
      code: "BASINGSTOKE",
      town: "Basingstoke",
    },
  });

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  for (const demo of users) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { name: demo.name, passwordHash, isActive: true },
      create: {
        email: demo.email,
        name: demo.name,
        passwordHash,
        isActive: true,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { key: demo.role },
    });
    const membership = await prisma.organisationMembership.upsert({
      where: {
        organisationId_userId: {
          organisationId: organisation.id,
          userId: user.id,
        },
      },
      update: {
        roleId: role.id,
        status: "ACTIVE",
        allLocations: demo.allLocations,
        joinedAt: new Date(),
        deactivatedAt: null,
      },
      create: {
        organisationId: organisation.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
        allLocations: demo.allLocations,
        joinedAt: new Date(),
      },
    });
    if (!demo.allLocations) {
      await prisma.membershipLocation.upsert({
        where: {
          membershipId_locationId: {
            membershipId: membership.id,
            locationId: location.id,
          },
        },
        update: {},
        create: { membershipId: membership.id, locationId: location.id },
      });
    }
  }

  console.info(
    "Seeded fictional demo organisation, location and seven role-based users.",
  );
  console.info("Demo password for all demo users:", DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
