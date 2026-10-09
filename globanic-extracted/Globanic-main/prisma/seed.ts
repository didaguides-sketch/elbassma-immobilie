import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DOMAINS: { name: string; slug: string; specialties: { name: string; slug: string }[] }[] = [
  {
    name: "Droit",
    slug: "droit",
    specialties: [
      { name: "Droit administratif", slug: "droit-administratif" },
      { name: "Droit privé", slug: "droit-prive" },
      { name: "Droit pénal", slug: "droit-penal" },
    ],
  },
  {
    name: "Informatique",
    slug: "informatique",
    specialties: [
      { name: "Intelligence artificielle", slug: "intelligence-artificielle" },
      { name: "Développement", slug: "developpement" },
      { name: "Cybersécurité", slug: "cybersecurite" },
    ],
  },
  { name: "Médecine", slug: "medecine", specialties: [] },
  { name: "Économie", slug: "economie", specialties: [] },
  { name: "Ingénierie", slug: "ingenierie", specialties: [] },
  { name: "Gestion", slug: "gestion", specialties: [] },
  { name: "Sciences politiques", slug: "sciences-politiques", specialties: [] },
  { name: "Lettres & langues", slug: "lettres-langues", specialties: [] },
];

const UNIVERSITIES = [
  { name: "Université d'Alger 1", slug: "universite-dalger-1", city: "Alger", country: "Algérie" },
  { name: "Université Oran 1", slug: "universite-oran-1", city: "Oran", country: "Algérie" },
  {
    name: "Université Constantine 1",
    slug: "universite-constantine-1",
    city: "Constantine",
    country: "Algérie",
  },
];

/**
 * Reads a required seed-password env var, or throws immediately. There is
 * deliberately no hardcoded fallback (e.g. "ChangeMe123") — a previous
 * version of this script fell back to one silently, which meant a
 * production seed run with an unset env var would create a SUPER_ADMIN
 * account with a publicly-known default password. Failing loudly here is
 * the fix (see README.md "Production Deployment" for the required vars).
 */
function requireSeedPassword(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} is not set. Refusing to seed this account with a hardcoded default password. ` +
        `Set ${envVar} before running "npm run db:seed" (see README.md "Production Deployment").`,
    );
  }
  return value;
}

async function seedSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@globanic.com";
  const password = requireSeedPassword("SEED_SUPER_ADMIN_PASSWORD");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      profile: { create: { fullName: "Globanic Super Admin" } },
    },
  });

  console.log(`Created SUPER_ADMIN: ${email} / ${password} — change the password immediately.`);
}

async function seedTestPublisher() {
  const email = process.env.SEED_PUBLISHER_EMAIL ?? "publisher@globanic.com";
  const password = requireSeedPassword("SEED_PUBLISHER_PASSWORD");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Test publisher already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "PUBLISHER",
      status: "ACTIVE",
      profile: { create: { fullName: "Test Publisher" } },
    },
  });

  console.log(`Created PUBLISHER: ${email} / ${password} — for testing the resource workflow.`);
}

async function seedTaxonomy() {
  for (const [index, domain] of DOMAINS.entries()) {
    const created = await prisma.domain.upsert({
      where: { slug: domain.slug },
      update: {},
      create: { name: domain.name, slug: domain.slug, order: index },
    });

    for (const [sIndex, specialty] of domain.specialties.entries()) {
      await prisma.specialty.upsert({
        where: { slug: specialty.slug },
        update: {},
        create: { name: specialty.name, slug: specialty.slug, domainId: created.id, order: sIndex },
      });
    }
  }
  console.log(`Seeded ${DOMAINS.length} domains.`);
}

async function seedUniversities() {
  for (const uni of UNIVERSITIES) {
    await prisma.university.upsert({
      where: { slug: uni.slug },
      update: {},
      create: uni,
    });
  }
  console.log(`Seeded ${UNIVERSITIES.length} universities.`);
}

async function main() {
  await seedSuperAdmin();
  await seedTestPublisher();
  await seedTaxonomy();
  await seedUniversities();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
