// backend/server/routes/webhook.ts

import express from "express";
import Stripe from "stripe";
import { supabase } from "../lib/supabaseClient.mts";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Stripe webhook handler
router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        webhookSecret
      );
    } catch (err: any) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;

      try {
        const customer = await stripe.customers.retrieve(customerId);
        const supabaseId = (customer as any).metadata?.supabase_id;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0].price.id;

        let plan = "free";
        if (priceId === process.env.STRIPE_PRICE_GROWTH) plan = "growth";
        if (priceId === process.env.STRIPE_PRICE_PREMIUM) plan = "premium";

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_plan: plan,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
          })
          .eq("id", supabaseId);

        if (error) {
          console.error("❌ Supabase update failed:", error);
          return res.status(500).json({ error: "Failed to update subscription in DB" });
        }

        console.log(`✅ User ${supabaseId} subscription updated to ${plan}`);
      } catch (err) {
        console.error("❌ Error processing subscription:", err);
        return res.status(500).json({ error: "Error processing webhook" });
      }
    }

    res.sendStatus(200);
  }
);

export default router;
