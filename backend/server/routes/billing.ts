import express from "express";
import Stripe from "stripe";
import { supabase } from "../lib/supabaseClient.mts";
import dotenv from "dotenv";

dotenv.config();

// console.log("🔑 STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY); 


const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

router.post("/create-checkout-session", async (req, res) => {
  const { userId, priceId } = req.body;

  try {
    // Fetch the user profile
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("❌ Failed to fetch user:", error);
      return res.status(400).json({ error: "User not found" });
    }

    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { supabase_id: userId } });
      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Failed to update customer ID in Supabase:", updateError);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${CLIENT_URL}/success`,
      cancel_url: `${CLIENT_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Optional: return price IDs to frontend
router.get("/prices", (_req, res) => {
  res.json({
    growth: process.env.STRIPE_PRICE_GROWTH,
    premium: process.env.STRIPE_PRICE_PREMIUM,
  });
});

export default router;
