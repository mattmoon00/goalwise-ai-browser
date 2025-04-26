// src/lib/getInsights.ts
export async function getInsights(budgetItems: any[], goals: any[], transactions: any[]) {
    try {
      const response = await fetch("http://localhost:3001/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetItems, goals, transactions }),
      });
  
      const data = await response.json();
      return data.insights || [];
    } catch (err) {
      console.error("Error fetching insights:", err);
      return [];
    }
  }
  