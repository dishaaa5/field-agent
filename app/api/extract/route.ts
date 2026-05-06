import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();

  if (!transcript) {
    return NextResponse.json({ error: "No transcript" }, { status: 400 });
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a field service job logger. 
Extract job details from what the technician said.
Always reply with ONLY a valid JSON object, no extra text, no markdown.
JSON format:
{
  "job_done": "what was done",
  "location": "where it was done or null",
  "time_taken": "how long it took or null",
  "parts_used": "parts used or null",
  "parts_needed": "parts to order or null",
  "issues_found": "any problems noticed or null",
  "follow_up_needed": true or false,
  "customer_message": "a short friendly SMS to send to customer"
}`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    temperature: 0.1,
  });

  const raw = response.choices[0].message.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({ data: parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse", raw }, { status: 500 });
  }
}