/**
 * Rescores every listing's completeness.
 *
 * Runs on every deploy. It is cheap, and it keeps the stored number honest
 * after a change to how completeness is weighted, which would otherwise leave
 * the enrichment filters selecting on a stale figure.
 */
import { db } from "../src/lib/db";
import { recomputeAll } from "../src/lib/completeness";

async function main(): Promise<void> {
  const result = await recomputeAll();
  console.log(`Rescored ${result.scored} listings.`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
