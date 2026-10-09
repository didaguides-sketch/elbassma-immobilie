/**
 * Runs once before any test file, before any application code (including
 * src/lib/prisma.ts) is imported — that ordering matters, because
 * PrismaClient reads DATABASE_URL from process.env at construction time.
 *
 * REQUIRES a real Postgres database dedicated to tests. This file
 * refuses to run against anything that isn't clearly a test database —
 * see the guard below. It never touches production data, and it does
 * not fall back to DATABASE_URL if TEST_DATABASE_URL is unset, because
 * silently falling back to whatever DATABASE_URL happens to be set to
 * in the environment running the tests is exactly how a test suite
 * ends up truncating a real database.
 *
 * Setup required before `npm test` actually runs (none of this has been
 * done in this sandbox — no network, no local Postgres):
 *   1. A real Postgres instance reachable from the test environment.
 *   2. TEST_DATABASE_URL pointing at a database used ONLY for tests,
 *      e.g. postgresql://user:pass@localhost:5432/globanic_test
 *   3. Schema applied: `TEST_DATABASE_URL=... npx prisma migrate deploy`
 *      (using TEST_DATABASE_URL, not DATABASE_URL) before running tests.
 */

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests require a real, " +
      "dedicated Postgres test database — refusing to run against " +
      "DATABASE_URL (which may be a real/production database) or to " +
      "silently skip. Set TEST_DATABASE_URL and run " +
      "`prisma migrate deploy` against it first.",
  );
}

if (!/test/i.test(testUrl)) {
  // Cheap but meaningful guard: the test database's name should say so.
  // This will not catch every misconfiguration, but it catches the
  // single most damaging one — accidentally pointing tests at a
  // database that doesn't obviously look like a throwaway test DB.
  throw new Error(
    `TEST_DATABASE_URL ("${testUrl.replace(/:[^:@]*@/, ":****@")}") does not ` +
      `contain "test" in its name. Refusing to run — point this at a ` +
      `dedicated test database, e.g. .../globanic_test.`,
  );
}

process.env.DATABASE_URL = testUrl;

// Deterministic 32-byte test key — decodes from an obviously-fake ASCII
// string ("0123456789abcdef" x2), not a real generated secret. Used ONLY
// for tests. Tests that specifically exercise the fail-closed behavior
// when this is missing (see ccp-security.test.ts) delete it from
// process.env for the duration of that one test and restore it
// afterward, rather than relying on it being globally absent.
if (!process.env.PAYOUT_ENCRYPTION_KEY) {
  process.env.PAYOUT_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
}
