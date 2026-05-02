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
            role: "user",
            content: `Generate 5 different responses for:\n${prompt}`
          }
        ]
      })
    });

    const data = await response.json();

    const text = data.choices?.[0]?.message?.content || "";

    const responses = text
      .split("\n")
      .filter((r: string) => r.trim().length > 0)
      .slice(0, 5);

    res.status(200).json(responses);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
