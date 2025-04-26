import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Upgrade() {
  const { user } = useAuth();
  const [prices, setPrices] = useState<{ growth: string; premium: string } | null>(null);
  const [plan, setPlan] = useState<"free" | "growth" | "premium" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPricesAndPlan = async () => {
      try {
        const pricesRes = await fetch("http://localhost:3001/api/billing/prices");
        const pricesData = await pricesRes.json();
        console.log("✅ Prices fetched:", pricesData);
        setPrices(pricesData);
      } catch (err) {
        console.error("❌ Failed to fetch prices:", err);
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        const currentPlan = data?.subscription_plan || "free";
        console.log("📦 Subscription plan from Supabase:", currentPlan);
        setPlan(currentPlan);
      } catch (err) {
        console.error("❌ Failed to fetch subscription plan from Supabase:", err);
      }
    };

    fetchPricesAndPlan();
  }, [user]);

  const handleUpgrade = async (priceId: string) => {
    if (!user) return;
    setLoading(true);

    const res = await fetch("http://localhost:3001/api/billing/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, priceId }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("Checkout session failed:", data.error);
      setLoading(false);
    }
  };

  if (!user || !prices || !plan) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
        <h2 className="text-2xl font-bold mb-6">Choose a Plan</h2>
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  if (plan === "premium") {
    return null; // Hide the Upgrade page for Premium users
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-6">Choose a Plan</h2>
      <div className="space-y-4">
        {plan === "free" && (
          <button
            onClick={() => handleUpgrade(prices.growth)}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
          >
            Upgrade to Growth – $9/month
          </button>
        )}
        {(plan === "free" || plan === "growth") && (
          <button
            onClick={() => handleUpgrade(prices.premium)}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded hover:bg-purple-700 transition"
          >
            Upgrade to Premium – $19/month
          </button>
        )}
      </div>
    </div>
  );
}
