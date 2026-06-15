import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "No query" }, { status: 400 });
  }

  try {
    const res = await fetch("http://localhost:8001/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: 3 }),
    });

    const data = await res.json();
    return NextResponse.json(data);

  } catch {
    return NextResponse.json(
      { error: "RAG server not running" },
      { status: 500 }
    );
  }
}