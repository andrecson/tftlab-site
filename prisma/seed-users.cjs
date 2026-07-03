/**
 * Production user seed — runs INSIDE the standalone Docker image (plain CommonJS,
 * no tsx / no `src/` aliases, unlike prisma/seed.ts). Creates the ADMIN + EDITOR
 * (curator) logins so the admin panel is reachable right after deploy. The
 * catalog is then imported from the admin ("Re-importar catálogo").
 *
 * Run on the VPS:  docker compose exec site node prisma/seed-users.cjs
 * Idempotent (upsert on the unique email). Reads credentials from env.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function upsertUser(email, name, role, password) {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.upsert({
    where: { email: normalized },
    update: { passwordHash, role },
    create: { email: normalized, name, role, passwordHash },
  });
  console.log(`OK: ${name} (${normalized}) — role ${role}.`);
}

async function main() {
  await upsertUser(
    process.env.ADMIN_EMAIL || "admin@metacomps.gg",
    "Admin",
    "ADMIN",
    process.env.ADMIN_PASSWORD || "admin1234",
  );
  await upsertUser(
    process.env.CURATOR_EMAIL || "tftlab",
    "Curador",
    "EDITOR",
    process.env.CURATOR_PASSWORD || "tftlab",
  );
}

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
