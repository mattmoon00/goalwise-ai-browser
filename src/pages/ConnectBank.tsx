// src/pages/ConnectBank.tsx
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function ConnectBank() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<"free" | "growth" | "premium" | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1️⃣ Fetch the user's plan
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("❌ Could not fetch plan:", error);
        setPlan("free");
      } else {
        setPlan(data?.subscription_plan ?? "free");
      }
    })();
  }, [user]);

  // 2️⃣ When plan is Growth or Premium, get a link token
// src/pages/ConnectBank.tsx
// …
useEffect(() => {
  if (!user || plan === "free") return;

  setLoadingLink(true);
  fetch("http://localhost:3001/api/plaid/create_link_token", {
    method: "POST",
  })
  .then(res => {
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  })
  .then(body => setLinkToken(body.link_token))
  .catch(err => {
    console.error("❌ Failed to create link token:", err);
    setError("Unable to generate bank link. Please try again.");
  })
  .finally(() => setLoadingLink(false));
}, [user, plan]);


  // 3️⃣ Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: async (public_token) => {
      try {
        const res = await fetch("/api/plaid/exchange_public_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, user_id: user?.id }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Exchange failed");
        console.log("🎉 Plaid exchange success:", result);
      } catch (err) {
        console.error("❌ Error exchanging public token:", err);
        setError("Bank connection failed. Please try again.");
      }
    },
  });

  // 4️⃣ Render
  // Plan not loaded yet
  if (plan === null) {
    return <p className="text-center mt-10">Loading…</p>;
  }

  // Free users get an upsell
  if (plan === "free") {
    return (
      <div className="max-w-md mx-auto mt-10 text-center text-gray-700">
        <h2 className="text-2xl font-bold mb-4">Link Your Bank</h2>
        <p className="text-muted-foreground">
          Upgrade to Growth or Premium to connect your bank and get real-time
          spending insights!
        </p>
      </div>
    );
  }

  // Growth & Premium users
  return (
    <div className="max-w-md mx-auto mt-10 text-center">
      <h2 className="text-2xl font-bold mb-4">Link Your Bank</h2>

      {/* Error banner */}
      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Loading link token */}
      {loadingLink ? (
        <p className="text-gray-500">Generating link token…</p>
      ) : (
        <button
          onClick={() => open()}
          disabled={!ready}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded"
        >
          {plan === "growth"
            ? "Connect Sandbox Bank"
            : "Connect Your Bank"}
        </button>
      )}
    </div>
  );
}
