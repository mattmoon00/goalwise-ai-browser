// src/api/insights.ts
import { Request, Response } from "express";
import { ChatGroq } from "groq-sdk"; // Assuming you use an SDK or REST client
import dotenv from "dotenv";
dotenv.config();

const groq = new ChatGroq({ apiKey: process.env.GROQ_API_KEY });

export const generateInsights = async (req: Request, res: Response) => {
  const { budgetItems, goals } = req.body;

  const prompt = `
You are a budgeting assistant. Analyze the user's budget and goals.

Budget Items:
${JSON.stringify(budgetItems, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Return short, helpful tips for allocating extra income to goals or paying off debt. Format:
- [Insight 1]
- [Insight 2]
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
    });

    const insights = completion.choices[0].message.content;
    res.json({ insights });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
};
