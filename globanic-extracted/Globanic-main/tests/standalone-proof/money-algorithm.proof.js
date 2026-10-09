// This file is NOT one of the "tests written" for the deliverable
// Vitest suite, and running it is NOT equivalent to running that suite.
// It exists solely because it is the one thing in this entire task that
// can actually execute in a sandbox with no network access and no
// node_modules: it reimplements the corrected largest-remainder
// distribution algorithm from src/server/services/revenue-period.service.ts
// using only built-in Node APIs (no Prisma.Decimal, no zod, nothing from
// node_modules), so it can be run with `node --test` right now, with
// zero installed dependencies, and give a genuine pass/fail signal on
// the core financial algorithm's correctness.
//
// It does NOT execute src/server/services/revenue-period.service.ts
// itself, does NOT touch a database, and does NOT prove the actual
// production code is bug-free — only that the *algorithm design* it
// implements is arithmetically sound. The real proof that the
// production TypeScript is correct is the Vitest suite in
// tests/integration/, which requires `npm install` + a real Postgres
// database, neither available here.

const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Reimplementation of the corrected algorithm, using plain integer
 * arithmetic in "millionths of a cent" (a fixed-point integer, not a
 * float) to avoid floating-point error entirely, without importing any
 * decimal library. This is deliberately NOT using Prisma.Decimal (not
 * installed) — it is independent-by-construction from the production
 * implementation, which is the point of a second, standalone check.
 */
const SCALE = 1_000_000n; // fixed-point scale: 6 decimal digits of precision

function computeAmounts(totalRevenueCents, viewsAndShares) {
  const totalViews = viewsAndShares.reduce((s, x) => s + x.views, 0n);
  const computed = viewsAndShares.map(({ views, sharePctTimes10000 }) => {
    // rawScaled = totalRevenueCents * views * sharePct / (totalViews * 100) , all as scaled integers
    const numerator = totalRevenueCents * views * sharePctTimes10000 * SCALE;
    const denominator = totalViews * 100n * 10000n;
    const rawScaled = numerator / denominator; // integer division = floor for non-negative values
    const flooredCents = rawScaled / SCALE;
    const remainderScaled = rawScaled - flooredCents * SCALE;
    return { flooredCents, remainderScaled };
  });

  const distributedCents = computed.reduce((s, c) => s + c.flooredCents, 0n);
  const sumRemaindersScaled = computed.reduce((s, c) => s + c.remainderScaled, 0n);
  // round half up: add SCALE/2 then floor-divide
  let leftoverCents = (sumRemaindersScaled + SCALE / 2n) / SCALE;

  const order = computed
    .map((c, i) => i)
    .sort((a, b) => (computed[b].remainderScaled > computed[a].remainderScaled ? 1 : -1));

  const final = computed.map((c) => c.flooredCents);
  for (const i of order) {
    if (leftoverCents <= 0n) break;
    final[i] += 1n;
    leftoverCents -= 1n;
  }
  return final.map((n) => Number(n));
}

test("proof: equal shares, non-divisible total (the classic 1/3 case) reconciles exactly", () => {
  // 100 cents, 3 publishers, equal views, 50% share each -> owed = 50 cents total
  const amounts = computeAmounts(100n, [
    { views: 1n, sharePctTimes10000: 500000n },
    { views: 1n, sharePctTimes10000: 500000n },
    { views: 1n, sharePctTimes10000: 500000n },
  ]);
  const sum = amounts.reduce((a, b) => a + b, 0);
  assert.equal(sum, 50, `expected sum 50, got ${sum} (amounts: ${amounts})`);
});

test("proof: mixed share percentages sum to the true weighted total, not totalRevenueCents", () => {
  // THIS is the exact shape of the bug found while building the test
  // suite: reconciling against totalRevenueCents instead of the true
  // owed total. 10000 cents, 2 publishers 50/50 views, both at 50% share
  // -> true owed total is 5000, NOT 10000.
  const amounts = computeAmounts(10000n, [
    { views: 30n, sharePctTimes10000: 500000n },
    { views: 70n, sharePctTimes10000: 500000n },
  ]);
  const sum = amounts.reduce((a, b) => a + b, 0);
  assert.equal(sum, 5000, `expected sum 5000 (50% of 10000), got ${sum}`);
  assert.notEqual(sum, 10000, "must NOT equal the full period revenue — that was the actual production bug");
});

test("proof: uneven views + uneven share percentages reconcile to the exact weighted-average total", () => {
  const totalRevenueCents = 10000n;
  const amounts = computeAmounts(totalRevenueCents, [
    { views: 50n, sharePctTimes10000: 300000n }, // 30%
    { views: 50n, sharePctTimes10000: 700000n }, // 70%
  ]);
  const sum = amounts.reduce((a, b) => a + b, 0);
  // expected: 10000*0.5*0.3 + 10000*0.5*0.7 = 1500 + 3500 = 5000
  assert.equal(sum, 5000);
  assert.equal(amounts[0], 1500);
  assert.equal(amounts[1], 3500);
});

test("proof: 100% share means the publisher receives the full weighted amount, no remainder lost", () => {
  const amounts = computeAmounts(9999n, [{ views: 1n, sharePctTimes10000: 1000000n }]);
  assert.equal(amounts[0], 9999);
});

test("proof: 0% share yields exactly zero, not a rounding artifact", () => {
  const amounts = computeAmounts(9999n, [{ views: 1n, sharePctTimes10000: 0n }]);
  assert.equal(amounts[0], 0);
});

test("proof: large revenue amount reconciles exactly with no drift", () => {
  const amounts = computeAmounts(1_000_000_000n, [
    { views: 777n, sharePctTimes10000: 500000n },
    { views: 223n, sharePctTimes10000: 500000n },
  ]);
  const sum = amounts.reduce((a, b) => a + b, 0);
  assert.equal(sum, 500_000_000);
});

test("proof: every individual amount is a non-negative integer", () => {
  const amounts = computeAmounts(10007n, [
    { views: 17n, sharePctTimes10000: 600000n },
    { views: 33n, sharePctTimes10000: 600000n },
    { views: 50n, sharePctTimes10000: 600000n },
  ]);
  for (const a of amounts) {
    assert.ok(Number.isInteger(a), `${a} is not an integer`);
    assert.ok(a >= 0, `${a} is negative`);
  }
  const sum = amounts.reduce((a, b) => a + b, 0);
  assert.equal(sum, 6004); // round(10007 * 0.6)
});
