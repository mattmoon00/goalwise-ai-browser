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
  const mt = new Date(utc + mtOffset * 60 * 60 * 1000);
  return mt.toISOString().split("T")[0];
}

router.post("/", async (req, res) => {
  const { budgetItems, goals, transactions, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const currentHash = hashData({ budgetItems, goals, transactions });
  const today = toMountainDateString(new Date());

  // Fetch user subscription plan + profile info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan, name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("❌ Supabase profile fetch error:", profileError?.message || profileError);
    return res.status(500).json({ error: "Failed to determine subscription plan" });
  }

  const plan = profile.subscription_plan;
  const userName = profile.name;

  // Check if insights already exist for this hash and today
  const { data: existingRow } = await supabase
    .from("user_insights")
    .select("insights, last_updated, data_hash")
    .eq("user_id", userId)
    .single();

  if (
    existingRow &&
    existingRow.data_hash === currentHash &&
    existingRow.last_updated?.split("T")[0] === today
  ) {
    return res.json({ insights: existingRow.insights });
  }

  try {
    const prompt =
      plan === "premium"
        ? generateAiCoachPrompt(budgetItems, goals, transactions, userName)
        : generateBasicPrompt(budgetItems, goals, transactions);

    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content || "";
    console.log("🧠 Raw AI response:\n", raw);

    let insights;
    try {
      const repaired = jsonrepair(raw);
      insights = JSON.parse(repaired);
    } catch (jsonErr) {
      console.error("❌ JSON parsing failed:", jsonErr.message);
      return res.status(500).json({
        error: "Failed to parse AI response",
        rawResponse: raw,
        details: jsonErr.message,
      });
    }

    await supabase.from("user_insights").upsert({
      user_id: userId,
      insights,
      data_hash: currentHash,
      last_updated: new Date().toISOString(),
    });

    res.json({ insights });
  } catch (err) {
    console.error("❌ Error generating insights:", err.message || err);
    res.status(500).json({
      error: "Failed to generate insights",
      details: err.message || err,
    });
  }
});

// PROMPTS
function generateBasicPrompt(budgetItems: any[], goals: any[], transactions: any[]) {
  return `
You are a budgeting assistant. Based on the following data, return 3 concise tips in JSON format. Each tip should be a short string under 160 characters.

Tips should follow a smart priority: prioritize debt payoff first, then emergency funds, then investments or fun savings like trips or cars.

Return format:
[
  { "tip": "..." },
  { "tip": "..." },
  { "tip": "..." }
]

Budget Items:
${JSON.stringify(budgetItems, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Transactions:
${JSON.stringify(transactions, null, 2)}
`;
}

function generateAiCoachPrompt(
  budgetItems: any[],
  goals: any[],
  transactions: any[],
  name?: string
) {
  const greeting = name ? `Hey ${name},` : "Hello,";

  return `
You are a world-class financial coach trained in behavioral finance and practical budgeting. You are creating a monthly review of a user's finances. 

✅ ONLY return a valid JSON object matching this format:
{
  "summary": "One paragraph overview of their financial situation in plain language.",
  "actionItems": ["Do this", "And this", "Don't forget to..."],
  "nextSteps": ["First step to take", "Another suggestion"]
}

❌ DO NOT include markdown, bullet points, or explanations outside of this JSON structure.

Greet the user with: "${greeting}" in the summary. Your tone should be warm and motivational, but also honest. Keep it under 300 words total.

Prioritize debt payoff first, then emergency funds, then savings/fun goals. Provide clear, concise advice and next steps.

---

Budget Items:
${JSON.stringify(budgetItems, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Transactions:
${JSON.stringify(transactions, null, 2)}
`;
}


export default router;
