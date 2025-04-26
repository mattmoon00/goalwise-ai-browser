// scripts/sync.ts
import { syncTransactionsForPremiumUsers } from "../backend/server/jobs/syncTransactions.ts";

syncTransactionsForPremiumUsers().then(() => {
  console.log("🔁 Sync complete");
  process.exit(0);
}).catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
