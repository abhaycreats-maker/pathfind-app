// server.js
// Simple Express backend for the Career Guide app.
// - Serves the frontend (public/ folder)
// - Serves the structured career database (data/courses.json)
// - Talks to Groq's free AI API for the "Confused? Let AI guide you" chat feature

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY; // put this in your .env file (see .env.example)

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Load the career database once at startup
const coursesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "courses.json"), "utf-8")
);

// GET all streams (used to build the selection UI)
app.get("/api/streams", (req, res) => {
  const streams = coursesData.streams.map((s) => ({ id: s.id, name: s.name }));
  res.json(streams);
});

// GET interests for a given stream
app.get("/api/streams/:streamId/interests", (req, res) => {
  const stream = coursesData.streams.find((s) => s.id === req.params.streamId);
  if (!stream) return res.status(404).json({ error: "Stream not found" });
  const interests = stream.interests.map((i) => ({ id: i.id, name: i.name }));
  res.json(interests);
});

// GET careers for a given stream + interest, optionally filtered by mode (government/private)
app.get("/api/streams/:streamId/interests/:interestId/careers", (req, res) => {
  const stream = coursesData.streams.find((s) => s.id === req.params.streamId);
  if (!stream) return res.status(404).json({ error: "Stream not found" });
  const interest = stream.interests.find((i) => i.id === req.params.interestId);
  if (!interest) return res.status(404).json({ error: "Interest not found" });

  const mode = req.query.mode; // "government" | "private" | undefined (= both)
  let careers = interest.careers;
  if (mode === "government" || mode === "private") {
    careers = careers.filter((c) => c.mode === mode || c.mode === "both");
  }
  res.json({ stream: stream.name, interest: interest.name, careers });
});

// POST /api/chat  ->  For students who are confused and don't know their stream/interest.
// Uses Groq's free LLM API to have a short guided conversation, then suggests a stream + interest
// from OUR OWN database (so results stay grounded in real facts, not AI-invented ones).
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body; // full conversation so far: [{role, content}, ...]

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error:
          "GROQ_API_KEY missing. Add it to your .env file. See README for how to get a free key.",
      });
    }

    const streamList = coursesData.streams
      .map((s) => `${s.id}: ${s.name} (${s.interests.map((i) => i.id).join(", ")})`)
      .join("\n");

    const systemPrompt = `You are a warm, funny, thoughtful career counsellor for Indian students who have NO idea what to choose.
Have a real conversation — ask about their interests, subjects they enjoy, personality, and what work environment excites them.
Explain your thinking briefly when it helps (2-4 sentences, don't be robotic or overly terse). Be encouraging, specific, and a little funny — like a smart senior who genuinely wants to help.

These are the ONLY valid streams and interest ids you are allowed to recommend (do not invent new ones):
${streamList}

Ask 3-5 thoughtful questions total before deciding. Once confident, reply with a final message starting EXACTLY with
"RESULT:" followed by a JSON object like:
RESULT: {"streamId": "science-pcm", "interestId": "engineering", "reason": "2-3 line reason explaining WHY this fits them"}`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // free Groq model, fast + good quality
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", errText);
      return res.status(502).json({ error: "AI service error", details: errText });
    }

    const data = await groqResponse.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Career Guide server running at http://localhost:${PORT}`);
});