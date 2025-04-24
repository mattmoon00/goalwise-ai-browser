// src/components/NewGoalForm.tsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function NewGoalForm({ onGoalCreated }: { onGoalCreated?: () => void }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      name,
      target_amount: parseFloat(targetAmount),
      target_date: targetDate || null,
    });

    if (error) setError(error.message);
    else {
      setName("");
      setTargetAmount("");
      setTargetDate("");
      if (onGoalCreated) onGoalCreated();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold text-foreground">Create a New Goal</h2>
      <input
        type="text"
        placeholder="Goal Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="number"
        placeholder="Target Amount"
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="w-full border p-2 rounded"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 transition"
      >
        {loading ? "Creating..." : "Create Goal"}
      </button>
    </form>
  );
}
