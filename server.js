const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: true
}));

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get("/", (req, res) => {
  res.send("City Care AI Backend Running!");
});

async function askGroq(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages,
        temperature: 0.5
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Groq request failed:", response.status);
    throw new Error("AI provider request failed");
  }

  return result.choices?.[0]?.message?.content || "";
}

app.post("/assistant", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const answer = await askGroq([
      {
        role: "system",
        content:
          "You are Smart Complaint AI, a helpful assistant for reporting and understanding civic issues. Give clear, concise answers."
      },
      { role: "user", content: message }
    ]);

    res.json({ answer });
  } catch (error) {
    console.error("Assistant error:", error.message);
    res.status(502).json({ error: "AI Assistant is temporarily unavailable" });
  }
});

app.post("/analyze-complaint", async (req, res) => {
  try {
    const description = String(req.body.description || "").trim();

    if (!description) {
      return res.status(400).json({
        error: "Complaint description is required"
      });
    }

    const answer = await askGroq([
      {
        role: "system",
        content: `Classify the civic complaint. Return only valid JSON with these fields:
{"category":"string","priority":"Low, Medium, or High","department":"string","resolutionTime":"string","summary":"string"}`
      },
      { role: "user", content: description }
    ]);

    const cleaned = answer
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const analysis = JSON.parse(cleaned);
    res.json(analysis);
  } catch (error) {
    console.error("Complaint analysis error:", error.message);
    res.status(502).json({
      error: "Complaint AI analysis is temporarily unavailable"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`City Care backend listening on port ${PORT}`);
});
