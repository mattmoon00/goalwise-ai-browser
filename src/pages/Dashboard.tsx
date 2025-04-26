import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  frequency?: "monthly" | "weekly" | "yearly";
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_saved: number;
  type: "save" | "payoff";
  monthly_contribution?: number;
}

interface AiInsights {
  summary?: string;
  actionItems?: string[];
  nextSteps?: string[];
  tips?: string[];  // <- now a flat string array
}

function toMountainDateString(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const mtOffset = -6;
  const mt = new Date(utc + mtOffset * 60 * 60 * 1000);
  return mt.toISOString().split("T")[0];
}

async function hashData(data: any) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Dashboard() {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [subscription, setSubscription] = useState<
    "free" | "growth" | "premium" | null
  >(null);
  const [loading, setLoading] = useState(true);

  const monthlyAmount = (item: BudgetItem) => {
    switch (item.frequency) {
      case "weekly":
        return item.amount * 4.33;
      case "yearly":
        return item.amount / 12;
      default:
        return item.amount;
    }
  };

  // load budget, goals and plan
  const fetchData = async () => {
    if (!user) return;
    const [budgetRes, goalsRes, profileRes] = await Promise.all([
      supabase
        .from("budget_items")
        .select("*")
        .eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single(),
    ]);
    if (budgetRes.data) setBudgetItems(budgetRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (profileRes.data?.subscription_plan)
      setSubscription(profileRes.data.subscription_plan);
  };

  // call /api/insights when data+plan loaded
  const fetchInsights = async (
    budgetData: BudgetItem[],
    goalsData: Goal[]
  ) => {
    if (!user || subscription === "free") return;

    const transactions: any[] = [];
    const hash = await hashData({
      budgetItems: budgetData,
      goals: goalsData,
      transactions,
    });
    const today = toMountainDateString(new Date());

    // cache check
    const cached = localStorage.getItem("ai_insights_cache");
    if (cached) {
      try {
        const { insights, lastUpdated, dataHash } = JSON.parse(cached);
        if (lastUpdated === today && dataHash === hash) {
          setInsights(insights);
          return;
        }
      } catch {
        console.warn("⚠️ Ignoring corrupt cache.");
      }
    }

    try {
      const res = await fetch(
        "http://localhost:3001/api/insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetItems: budgetData,
            goals: goalsData,
            transactions,
            userId: user.id,
          }),
        }
      );
      const result = await res.json();
      if (result.insights) {
        setInsights(result.insights);
        localStorage.setItem(
          "ai_insights_cache",
          JSON.stringify({
            insights: result.insights,
            lastUpdated: today,
            dataHash: hash,
          })
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch AI insights:", err);
    }
  };

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    })();
  }, [user]);

  // fetch insights when budget/goals/plan arrive
  useEffect(() => {
    if (
      subscription &&
      user &&
      (budgetItems.length > 0 || goals.length > 0)
    ) {
      fetchInsights(budgetItems, goals);
    }
  }, [budgetItems, goals, subscription, user]);

  const income = budgetItems
    .filter((i) => i.type === "income")
    .reduce((s, i) => s + monthlyAmount(i), 0);
  const expenses = budgetItems
    .filter((i) => i.type === "expense")
    .reduce((s, i) => s + monthlyAmount(i), 0);
  const net = income - expenses;

  // now just a flat string array
  const formattedTips: string[] = Array.isArray(insights?.tips)
    ? insights.tips.filter((t) => typeof t === "string")
    : [];

  return (
    <div className="space-y-10">
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Monthly Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-100 p-4 rounded">
            <p className="text-sm text-green-800">Income</p>
            <p className="text-xl font-bold text-green-800">
              ${income.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <p className="text-sm text-red-800">Expenses</p>
            <p className="text-xl font-bold text-red-800">
              ${expenses.toFixed(2)}
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-sm text-blue-800">Net</p>
            <p className="text-xl font-bold text-blue-800">
              ${net.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          AI Insights
        </h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : subscription === "free" ? (
          <p className="text-muted-foreground text-sm">
            Upgrade to access AI insights.
          </p>
        ) : subscription === "growth" && formattedTips.length > 0 ? (
          <>
            <p className="text-muted-foreground text-sm mb-2">
              Basic insights enabled. Upgrade to Premium for full AI
              coaching.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
              {formattedTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </>
        ) : subscription === "premium" && insights ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Summary:</strong> {insights.summary ?? "No summary provided."}
            </p>
            <div>
              <strong>Action Items:</strong>
              <ul className="list-disc pl-5">
                {insights.actionItems?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Next Steps:</strong>
              <ul className="list-disc pl-5">
                {insights.nextSteps?.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No insights available.
          </p>
        )}
      </section>
    </div>
  );
}
