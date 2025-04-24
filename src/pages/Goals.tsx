// src/pages/Goals.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

interface Goal {
  id?: string;
  name: string;
  type: "save" | "payoff";
  target: number;
  saved: number;
  monthlyContribution?: number;
  deadline?: string;
  priority?: "Low" | "Medium" | "High" | "Highest";
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ type: "save", priority: "Medium" });
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: goalData }, { data: profileData }] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("subscription_plan").eq("id", user.id).single(),
    ]);

    if (profileData) setSubscriptionPlan(profileData.subscription_plan);

    if (goalData) {
      const formattedGoals = goalData.map((goal) => ({
        id: goal.id,
        name: goal.name,
        type: goal.type,
        target: goal.target_amount,
        saved: goal.current_saved,
        monthlyContribution: goal.monthly_contribution,
        deadline: goal.target_date,
        priority: goal.priority || "Medium",
      }));
      setGoals(formattedGoals);
    }

    setLoading(false);
  };

  const goalLimit = subscriptionPlan === "free" ? 1 : subscriptionPlan === "growth" ? 3 : Infinity;

  const handleSave = async () => {
    if (!newGoal.name || !newGoal.target || !user || !newGoal.type) return;

    if (!editingGoalId && goals.length >= goalLimit) {
      alert(`Your current plan allows only ${goalLimit} goal${goalLimit > 1 ? "s" : ""}. Upgrade to add more.`);
      return;
    }

    const goalPayload = {
      name: newGoal.name,
      target_amount: newGoal.target,
      current_saved: newGoal.saved || 0,
      monthly_contribution: newGoal.monthlyContribution || 0,
      target_date: newGoal.deadline || null,
      type: newGoal.type,
      user_id: user.id,
      priority: newGoal.priority || "Medium",
    };

    if (editingGoalId) {
      await supabase.from("goals").update(goalPayload).eq("id", editingGoalId).eq("user_id", user.id);
    } else {
      await supabase.from("goals").insert([goalPayload]);
    }

    setShowForm(false);
    setNewGoal({ type: "save", priority: "Medium" });
    setEditingGoalId(null);
    fetchGoals();
  };

  const handleProgressUpdate = async (goalId: string, additionalAmount: number) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedAmount = goal.saved + additionalAmount;

    await supabase.from("goals").update({ current_saved: updatedAmount }).eq("id", goalId);
    toast.success("Progress updated!");
    confetti();
    fetchGoals();
  };

  const estimateTimeline = (goal: Goal) => {
    if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return null;
    const monthsNeeded = Math.ceil((goal.target - goal.saved) / goal.monthlyContribution);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsNeeded);
    return payoffDate.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoalId(goal.id || null);
    setShowForm(true);
    setNewGoal({
      name: goal.name,
      type: goal.type,
      target: goal.target,
      saved: goal.saved,
      monthlyContribution: goal.monthlyContribution,
      deadline: goal.deadline || "",
      priority: goal.priority || "Medium",
    });
  };

  const handleDelete = async (id?: string) => {
    if (!id || !user) return;
    await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
    setGoals(goals.filter((g) => g.id !== id));
  };

  const renderGoalCard = (goal: Goal) => {
    const progress = (goal.saved / goal.target) * 100;
    const reverseProgress = (1 - goal.saved / goal.target) * 100;
    const timeline = estimateTimeline(goal);

    return (
      <div key={goal.id} className="space-y-1 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">
            <p>{goal.name}</p>
            <p className="text-muted-foreground text-xs">
              {goal.type === "payoff"
                ? `Remaining: $${(goal.target - goal.saved).toLocaleString()} / $${goal.target.toLocaleString()}`
                : `Saved: $${goal.saved.toLocaleString()} / $${goal.target.toLocaleString()}`}
            </p>
            {timeline && (
              <p className="text-xs text-muted-foreground">Est. Completion: {timeline}</p>
            )}
            {goal.priority && (
              <p className="text-xs text-muted-foreground">Priority: {goal.priority}</p>
            )}
            <input
              type="number"
              className="mt-2 border rounded px-2 py-1 text-xs"
              placeholder="Add to progress"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = e.currentTarget as HTMLInputElement;
                  const value = parseFloat(input.value);
                  if (!isNaN(value)) {
                    handleProgressUpdate(goal.id!, value);
                    input.value = "";
                    input.blur();
                  }
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(goal)}
              className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(goal.id)}
              className="text-sm px-2 py-1 bg-red-100 text-red-800 rounded"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${goal.type === "payoff" ? "bg-red-500" : "bg-green-600"}`}
            style={{ width: `${Math.min(goal.type === "payoff" ? reverseProgress : progress, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  return (
    <div className="space-y-10">
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Your Goals</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setNewGoal({ type: "save", priority: "Medium" });
              setEditingGoalId(null);
            }}
            className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
          >
            {showForm ? "Cancel" : "Add Goal"}
          </button>
        </div>

        {showForm && (
          <div className="space-y-4 mb-6">
            <select
              value={newGoal.type}
              onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as "save" | "payoff" })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            >
              <option value="save">Savings Goal</option>
              <option value="payoff">Debt Payoff Goal</option>
            </select>
            <select
              value={newGoal.priority}
              onChange={(e) =>
                setNewGoal({ ...newGoal, priority: e.target.value as Goal["priority"] })
              }
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            >
              <option value="Highest">Highest Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <input
              type="text"
              placeholder="Goal name"
              value={newGoal.name || ""}
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            />
            <input
              type="number"
              placeholder={newGoal.type === "payoff" ? "Total debt amount" : "Target savings amount"}
              value={newGoal.target || ""}
              onChange={(e) => setNewGoal({ ...newGoal, target: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            />
            <input
              type="number"
              placeholder={newGoal.type === "payoff" ? "Amount paid so far" : "Amount saved so far"}
              value={newGoal.saved || ""}
              onChange={(e) => setNewGoal({ ...newGoal, saved: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Monthly contribution"
              value={newGoal.monthlyContribution || ""}
              onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            />
            <input
              type="date"
              value={newGoal.deadline || ""}
              onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm"
            />
            <button
              onClick={handleSave}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              {editingGoalId ? "Update Goal" : "Save Goal"}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading goals...</p>
        ) : (
          goals.map(renderGoalCard)
        )}
      </section>
    </div>
  );
}
