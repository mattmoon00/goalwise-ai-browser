// src/lib/groqClient.ts
export async function fetchGroqInsight(prompt: string): Promise<string | null> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
  
    if (!res.ok) {
      console.error("Groq API error:", await res.text());
      return null;
    }
  
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  }
  