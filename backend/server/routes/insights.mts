// server/routes/insights.mts
import express from "express";
import { supabase } from "../lib/supabaseClient.mts";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";
import { jsonrepair } from "jsonrepair";
import crypto from "crypto";
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY });

function hashData(data: any) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
function toMountainDateString(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const mtOffset = -6;
  return new Date(utc + mtOffset * 3600000).toISOString().split("T")[0];
}

function sanitizeInsights(raw: any, plan: string) {
  if (
    plan === "premium" &&
    typeof raw === "object" &&
    raw.summary &&
    raw.actionItems &&
    raw.nextSteps
  ) {
    return {
      summary: String(raw.summary).trim(),
      actionItems: Array.isArray(raw.actionItems)
        ? raw.actionItems.map(i => String(i).trim())
        : [],
      nextSteps: Array.isArray(raw.nextSteps)
        ? raw.nextSteps.map(i => String(i).trim())
        : [],
    };
  }

  if (plan === "growth" && Array.isArray(raw)) {
    return {
      tips: raw
        .filter((t: any) => t && typeof t.tip === "string")
        .map((t: any) => t.tip.trim())
        .filter(Boolean),
    };
  }

  return null;
}

router.post("/", async (req, res) => {
  const { budgetItems, goals, transactions, userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const currentHash = hashData({ budgetItems, goals, transactions });
  const today = toMountainDateString(new Date());

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan, name")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    console.error("❌ Supabase fetch profile:", profileError);
    return res.status(500).json({ error: "Could not fetch profile" });
  }
  const plan = profile.subscription_plan;
  const userName = profile.name;

  const { data: existing } = await supabase
    .from("user_insights")
    .select("insights, last_updated, data_hash")
    .eq("user_id", userId)
    .single();
  if (
    existing &&
    existing.data_hash === currentHash &&
    existing.last_updated?.split("T")[0] === today
  ) {
    return res.json({ insights: existing.insights });
  }

  // choose prompt
  const prompt =
    plan === "premium"
      ? generateAiCoachPrompt(budgetItems, goals, transactions, userName)
      : generateBasicPrompt(budgetItems, goals, transactions);

  try {
    const aiResponse = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const raw = aiResponse.choices[0]?.message?.content || "";
    console.log("🧠 Raw AI response:\n", raw);

    // pull out only the JSON block
    const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    const repaired = jsonrepair(jsonMatch[0]);
    const parsed = JSON.parse(repaired);

    const insights = sanitizeInsights(parsed, plan);
    if (!insights) {
      console.warn("⚠️ Sanitization failed");
      return res.json({ insights: null });
    }

    await supabase.from("user_insights").upsert({
      user_id: userId,
      insights,
      data_hash: currentHash,
      last_updated: new Date().toISOString(),
    });

    return res.json({ insights });
  } catch (err: any) {
    console.error("❌ Insight generation error:", err);
    return res.status(500).json({ error: "AI processing failed" });
  }
});

// ——— PROMPTS ———

function generateBasicPrompt(
  budgetItems: any[],
  goals: any[],
  transactions: any[]
): string {
  return `
You are a budgeting assistant. Analyze the user's data and return exactly three concise tips.  
1) List the top 3 spending categories.  
2) Show their income vs expenses ratio.  
3) Highlight a single large transaction.  

**Output ONLY** this JSON array, nothing else:
[
  { "tip": "..." },
  { "tip": "..." },
  { "tip": "..." }
]

BudgetItems: ${JSON.stringify(budgetItems, null, 2)}  
Goals:       ${JSON.stringify(goals, null, 2)}  
Transactions:${JSON.stringify(transactions, null, 2)}
`;
}

function generateAiCoachPrompt(
  budgetItems: any[],
  goals: any[],
  transactions: any[],
  name?: string
): string {
  const greeting = name ? `Hey ${name},` : "";
  return `
You are an elite financial coach. Respond with **only** this JSON object and nothing else:

{
  "summary":    "One motivational paragraph covering income vs expenses, progress toward each goal, and category insights.",
  "actionItems":["Three clear tasks to do this month."],
  "nextSteps":  ["Three sequential next steps for ongoing improvement."]
}

Include:
• Percent spent per top category  
• Percent progress per goal  
• Call out any anomaly >20% of income  
• Personalize with "${greeting}"

DATA  
BudgetItems: ${JSON.stringify(budgetItems, null, 2)}  
Goals:       ${JSON.stringify(goals, null, 2)}  
Transactions:${JSON.stringify(transactions, null, 2)}
`;
}

export default router;
