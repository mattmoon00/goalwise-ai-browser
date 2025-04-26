// backend/server/routes/plaid.mts
import express from "express";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import dotenv from "dotenv";
import { supabase } from "../lib/supabaseClient.mts";

dotenv.config();

const router = express.Router();

// configure Plaid client using PLAID_ENV from your .env
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[
    process.env.PLAID_ENV as keyof typeof PlaidEnvironments
  ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

/**
 * 1) Create a Link Token
 *    - We’re using a static “unique_user_id” here so your front end
 *      can keep working without needing to pass userId in every call.
 */
router.post("/create_link_token", async (_req, res) => {
  try {
    const { data } = await plaidClient.linkTokenCreate({
      user: { client_user_id: "unique_user_id" },
      client_name: "Goalwise",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    return res.json({ link_token: data.link_token });
  } catch (err) {
    console.error("❌ Plaid.linkTokenCreate failed:", err);
    return res.status(500).json({ error: "Failed to create link token" });
  }
});

/**
 * 2) Exchange Public Token for an Access Token
 *    - Front end must POST { public_token, user_id }
 *    - We then persist `access_token` into your Supabase `profiles.plaid_access_token`
 */
router.post("/exchange_public_token", async (req, res) => {
  const { public_token, user_id } = req.body;
  if (!public_token || !user_id) {
    return res
      .status(400)
      .json({ error: "Missing public_token or user_id in body" });
  }

  try {
    // exchange for a long-lived access_token
    const { data } = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    const access_token = data.access_token;

    // save it in Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ plaid_access_token: access_token })
      .eq("id", user_id);

    if (error) {
      console.error("❌ Supabase update failed:", error);
      return res
        .status(500)
        .json({ error: "Failed to save access token in database" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Plaid.itemPublicTokenExchange failed:", err);
    return res
      .status(500)
      .json({ error: "Failed to exchange public token" });
  }
});

export default router;
