export default async function handler(req: any, res: any) {
  try {
    const { prompt } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "Return EXACTLY 5 distinct responses as a numbered list (1. ... 2. ... 3. ...)"
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    const text = data?.choices?.[0]?.message?.content || "";

    // 🔥 SMART PARSING (handles numbered responses)
    let responses = text
      .split(/\n?\d+\.\s/) // split by "1. ", "2. ", etc.
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    // 🔁 fallback if model didn't follow numbering
    if (responses.length < 2) {
      responses = text
        .split("\n")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
    }

    // 🚨 final safety fallback
    if (responses.length === 0) {
      responses = ["No response generated"];
    }

    // limit to 5
    responses = responses.slice(0, 5);

    // 🧪 debug (check in Vercel logs)
    console.log("Generated responses:", responses);

    res.status(200).json(responses);

  } catch (err: any) {
    console.error("Generate API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
