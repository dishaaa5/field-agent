import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File;

  if (!audio) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  const transcription = await groq.audio.transcriptions.create({
    file: audio,
    model: "whisper-large-v3",
  });

  return NextResponse.json({ transcript: transcription.text });
}