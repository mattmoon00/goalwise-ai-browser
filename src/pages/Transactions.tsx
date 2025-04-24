// src/pages/Transactions.tsx
import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  date: string;
  name: string;
  category: string;
  amount: number;
  type: "income" | "expense";
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Mock transaction data — eventually replace with Plaid
    setTransactions([
      {
        id: "1",
        date: "2025-04-21",
        name: "Starbucks",
        category: "Dining",
        amount: 5.75,
        type: "expense",
      },
      {
        id: "2",
        date: "2025-04-20",
        name: "Paycheck",
        category: "Salary",
        amount: 2200,
        type: "income",
      },
      {
        id: "3",
        date: "2025-04-18",
        name: "Walmart",
        category: "Groceries",
        amount: 92.13,
        type: "expense",
      },
      {
        id: "4",
        date: "2025-04-17",
        name: "Spotify",
        category: "Subscription",
        amount: 10.99,
        type: "expense",
      },
      {
        id: "5",
        date: "2025-04-15",
        name: "Venmo Transfer",
        category: "Other",
        amount: 100,
        type: "income",
      },
    ]);
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-foreground">Transactions</h2>

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
                <td className="px-4 py-3">{tx.category}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    tx.type === "income" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "expense" ? "-" : "+"}${tx.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
