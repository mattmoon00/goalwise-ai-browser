// src/pages/Budget.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

interface BudgetItem {
  id?: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  frequency?: "weekly" | "monthly" | "yearly";
}

export default function Budget() {
  const { user } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({ type: "expense", frequency: "monthly" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data);
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.type || !newItem.amount || !user) return;

    const { data, error } = await supabase
      .from("budget_items")
      .insert([
        {
          name: newItem.name,
          type: newItem.type,
          amount: newItem.amount,
          frequency: newItem.frequency || "monthly",
          user_id: user.id,
        },
      ])
      .select();

    if (!error && data) {
      setItems([data[0], ...items]);
      setNewItem({ type: "expense", frequency: "monthly" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from("budget_items").delete().eq("id", id);
    if (!error) setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = async (item: BudgetItem) => {
    const { error } = await supabase
      .from("budget_items")
      .update({
        name: item.name,
        amount: item.amount,
        type: item.type,
        frequency: item.frequency,
      })
      .eq("id", item.id);

    if (!error) {
      setItems(items.map((i) => (i.id === item.id ? item : i)));
      setEditingId(null);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const totalIncome = items.filter(i => i.type === "income").reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = items.filter(i => i.type === "expense").reduce((sum, i) => sum + i.amount, 0);
  const net = totalIncome - totalExpenses;

  return (
    <div className="space-y-10">
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Budget Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-green-100 p-4 rounded">
            <p className="text-sm text-green-800">Income</p>
            <p className="text-xl font-bold text-green-800">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <p className="text-sm text-red-800">Expenses</p>
            <p className="text-xl font-bold text-red-800">${totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-sm text-blue-800">Net</p>
            <p className="text-xl font-bold text-blue-800">${net.toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Add Budget Item</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newItem.name || ""}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="border border-gray-300 rounded px-4 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            value={newItem.amount || ""}
            onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) })}
            className="border border-gray-300 rounded px-4 py-2 text-sm"
          />
          <select
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as "income" | "expense" })}
            className="border border-gray-300 rounded px-4 py-2 text-sm"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={newItem.frequency}
            onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value as any })}
            className="border border-gray-300 rounded px-4 py-2 text-sm"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <button
          onClick={handleAddItem}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Add Item
        </button>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Your Budget Items</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading items...</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm flex-wrap gap-2">
                {editingId === item.id ? (
                  <>
                    <input
                      value={item.name}
                      onChange={(e) =>
                        setItems(items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))
                      }
                      className="border px-2 py-1 rounded w-[22%]"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        setItems(items.map(i => i.id === item.id ? { ...i, amount: parseFloat(e.target.value) } : i))
                      }
                      className="border px-2 py-1 rounded w-[20%]"
                    />
                    <select
                      value={item.type}
                      onChange={(e) =>
                        setItems(items.map(i => i.id === item.id ? { ...i, type: e.target.value as any } : i))
                      }
                      className="border px-2 py-1 rounded"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <select
                      value={item.frequency || "monthly"}
                      onChange={(e) =>
                        setItems(items.map(i => i.id === item.id ? { ...i, frequency: e.target.value as any } : i))
                      }
                      className="border px-2 py-1 rounded"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <button onClick={() => handleUpdateItem(item)} className="text-sm text-green-600 ml-2">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-600 ml-2">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="w-[22%] truncate">{item.name}</span>
                    <span className="w-[20%]">${item.amount.toLocaleString()}</span>
                    <span className="capitalize">{item.type}</span>
                    <span className="text-muted-foreground capitalize">{item.frequency}</span>
                    <button onClick={() => setEditingId(item.id!)} className="text-sm text-blue-600 ml-2">Edit</button>
                    <button onClick={() => handleDeleteItem(item.id!)} className="text-sm text-red-600 ml-2">Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
