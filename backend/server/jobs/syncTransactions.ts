// backend/server/jobs/syncTransactions.ts

import { supabase } from "../lib/supabaseClient.mts";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import dotenv from "dotenv";

dotenv.config();

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[
      process.env.PLAID_ENV as keyof typeof PlaidEnvironments
    ],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
      },
    },
  })
);

export async function syncTransactionsForPremiumUsers() {
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, plaid_access_token, last_synced")
    .eq("subscription_plan", "premium");

  if (error) {
    console.error("❌ Failed to fetch users:", error);
    return;
  }

  for (const user of users) {
    if (!user.plaid_access_token) continue;

    try {
      const now = new Date().toISOString();
      const since =
        user.last_synced ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // last 30 days fallback

      const response = await plaidClient.transactionsGet({
        access_token: user.plaid_access_token,
        start_date: since.split("T")[0],
        end_date: now.split("T")[0],
      });

      const transactions = response.data.transactions;

      for (const txn of transactions) {
        await supabase.from("transactions").upsert({
          user_id: user.id,
          plaid_transaction_id: txn.transaction_id,
          name: txn.name,
          amount: txn.amount,
          date: txn.date,
          category: txn.category?.[0] || null,
        });
      }

      await supabase
        .from("profiles")
        .update({ last_synced: now })
        .eq("id", user.id);

      console.log(`✅ Synced ${transactions.length} transactions for user ${user.id}`);
    } catch (err) {
      console.error(`❌ Failed to sync for ${user.id}:`, err);
    }
  }
}
