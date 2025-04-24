// src/pages/Dashboard.tsx
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
  const [subscription, setSubscription] = useState<string | null>(null);
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

  const fetchData = async () => {
    if (!user) return;

    const [budgetRes, goalsRes, profileRes] = await Promise.all([
      supabase.from("budget_items").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("subscription_plan").eq("id", user.id).single(),
    ]);

    if (budgetRes.data) setBudgetItems(budgetRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (profileRes.data?.subscription_plan) setSubscription(profileRes.data.subscription_plan);
  };

  const fetchInsights = async (budgetData: BudgetItem[], goalsData: Goal[]) => {
    if (!user || subscription === "free") return;

    const transactions = [];
    const hash = await hashData({ budgetItems: budgetData, goals: goalsData, transactions });
    const today = toMountainDateString(new Date());

    const cached = localStorage.getItem("ai_insights_cache");
    if (cached) {
      try {
        const { insights, lastUpdated, dataHash } = JSON.parse(cached);
        const isSameDay = lastUpdated === today;
        const isSameData = dataHash === hash;

        if (isSameDay && isSameData) {
          setInsights(insights);
          return;
        }
      } catch {
        console.warn("Corrupt cache, ignoring.");
      }
    }

    try {
      const res = await fetch("http://localhost:3001/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetItems: budgetData,
          goals: goalsData,
          transactions,
          userId: user.id,
        }),
      });

      const result = await res.json();
      console.log("🧠 AI response:", result);

      if (result.insights) {
        setInsights(result.insights);
        localStorage.setItem(
          "ai_insights_cache",
          JSON.stringify({ insights: result.insights, lastUpdated: today, dataHash: hash })
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch AI insights:", err);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    run();
  }, [user]);

  useEffect(() => {
    if (budgetItems.length > 0 || goals.length > 0) {
      fetchInsights(budgetItems, goals);
    }
  }, [budgetItems, goals, subscription]);

  const income = budgetItems
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + monthlyAmount(item), 0);

  const expenses = budgetItems
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + monthlyAmount(item), 0);

  const net = income - expenses;

  return (
    <div className="space-y-10">
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Monthly Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-100 p-4 rounded">
            <p className="text-sm text-green-800">Income</p>
            <p className="text-xl font-bold text-green-800">${income.toFixed(2)}</p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <p className="text-sm text-red-800">Expenses</p>
            <p className="text-xl font-bold text-red-800">${expenses.toFixed(2)}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-sm text-blue-800">Net</p>
            <p className="text-xl font-bold text-blue-800">${net.toFixed(2)}</p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Goals Overview</h2>
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress =
              goal.type === "payoff"
                ? ((goal.target_amount - goal.current_saved) / goal.target_amount) * 100
                : (goal.current_saved / goal.target_amount) * 100;

            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>{goal.name}</span>
                  <span className="text-muted-foreground">
                    {goal.type === "payoff"
                      ? `$${(goal.target_amount - goal.current_saved).toLocaleString()} left / $${goal.target_amount.toLocaleString()}`
                      : `$${goal.current_saved.toLocaleString()} / $${goal.target_amount.toLocaleString()}`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${
                      goal.type === "payoff" ? "bg-red-500" : "bg-green-500"
                    } h-2.5 rounded-full`}
                    style={{
                      width: `${
                        goal.type === "payoff"
                          ? 100 - Math.min(progress, 100)
                          : Math.min(progress, 100)
                      }%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">AI Insights</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading AI insights...</p>
        ) : subscription === "free" ? (
          <p className="text-sm text-muted-foreground">
            Upgrade to Growth or Premium to unlock AI insights.
          </p>
        ) : insights ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Summary:</strong>{" "}
              {insights?.summary ?? "No summary provided."}
            </p>
            <div>
              <strong>Action Items:</strong>
              <ul className="list-disc pl-5 space-y-1">
                {(insights?.actionItems ?? []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Next Steps:</strong>
              <ul className="list-disc pl-5 space-y-1">
                {(insights?.nextSteps ?? []).map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No insights available.</p>
        )}
      </section>
    </div>
  );
}
