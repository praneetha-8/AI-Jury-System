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
            content: "Generate EXACTLY 5 different responses. Separate each response clearly with '###'."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    console.log("RAW GROQ:", data); // 🔥 debug

    const text = data?.choices?.[0]?.message?.content || "";

    // 🔥 SPLIT USING CUSTOM DELIMITER
    let responses = text
      .split("###")
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    // fallback if model ignores format
    if (responses.length < 2) {
      responses = text
        .split("\n")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);
    }

    // final safety
    if (responses.length === 0) {
      responses = ["No response generated"];
    }

    responses = responses.slice(0, 5);

    console.log("PARSED:", responses); // 🔥 debug

    return res.status(200).json(responses);

  } catch (err: any) {
    console.error("Generate API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
