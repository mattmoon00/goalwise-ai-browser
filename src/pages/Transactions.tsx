// src/pages/Transactions.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

interface Transaction {
  id: string;
  date: string;
  name: string;
  category: string | null;
  amount: number;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<"free" | "growth" | "premium" | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setSubscription(data?.subscription_plan ?? "free");

        if (data?.subscription_plan !== "free") {
          return supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false });
        } else {
          return { data: [], error: null };
        }
      })
      .then(({ data, error }) => {
        if (error) {
          console.error("❌ Failed to fetch transactions:", error);
        } else {
          setTransactions(data || []);
        }
        setLoading(false);
      });
  }, [user]);

  if (subscription === "free") {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded text-center">
        <h2 className="text-xl font-semibold mb-2">Manual Transactions</h2>
        <p className="text-muted-foreground">
          You’re on the Free plan. Connect your bank and sync transactions automatically by upgrading.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-foreground">Transactions</h2>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="px-4 py-3">{tx.date}</td>
                  <td className="px-4 py-3">{tx.name}</td>
                  <td className="px-4 py-3">{tx.category ?? "—"}</td>
                  <td className={`px-4 py-3 font-medium ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                    {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
