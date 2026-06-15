import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ─── Tool definitions ────────────────────────────────────────────────────────

const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "extract_job_details",
      description: "Extract structured job details from a technician's transcript",
      parameters: {
        type: "object",
        properties: {
          job_done:          { type: "string",  description: "What job was done" },
          location:          { type: "string",  description: "Where the job was done" },
          time_taken:        { type: "string",  description: "How long it took" },
          parts_used:        { type: "string",  description: "Parts used during job" },
          parts_needed:      { type: "string",  description: "Parts to order" },
          issues_found:      { type: "string",  description: "Any problems noticed" },
          follow_up_needed:  { type: "boolean", description: "Whether follow-up is needed" },
          customer_message:  { type: "string",  description: "Short SMS to send customer" },
        },
        required: ["job_done", "follow_up_needed", "customer_message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_inventory",
      description: "Check stock level of a part in inventory. Call this whenever a part number is mentioned.",
      parameters: {
        type: "object",
        properties: {
          part_number: { type: "string", description: "The part number to check" },
        },
        required: ["part_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_job",
      description: "Save the completed job details to Google Sheets. Always call this last after extracting job details.",
      parameters: {
        type: "object",
        properties: {
          job_done:         { type: "string" },
          location:         { type: "string" },
          time_taken:       { type: "string" },
          parts_used:       { type: "string" },
          parts_needed:     { type: "string" },
          issues_found:     { type: "string" },
          follow_up_needed: { type: "boolean" },
          customer_message: { type: "string" },
          sentiment:        { type: "string", description: "positive, neutral or negative" },
        },
        required: ["job_done"],
      },
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

async function extract_job_details(args: Record<string, unknown>) {
  // Just return the args — Groq already extracted them
  return { success: true, data: args };
}

async function check_inventory(args: { part_number: string }) {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_INVENTORY_SHEET_ID,
    range: "Sheet1!A:E",
  });

  const rows = response.data.values || [];
  const part = rows.slice(1).find(
    (row) => row[0]?.toString().trim().toUpperCase() === args.part_number.trim().toUpperCase()
  );

  if (!part) return { found: false, message: `Part ${args.part_number} not found in inventory` };

  const stock    = parseInt(part[2]) || 0;
  const minStock = parseInt(part[3]) || 0;
  const isLow    = stock <= minStock;

  if (isLow) {
    const rowIndex = rows.findIndex(
      (row) => row[0]?.toString().trim().toUpperCase() === args.part_number.trim().toUpperCase()
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_INVENTORY_SHEET_ID,
      range: `Sheet1!E${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["REORDER NEEDED"]] },
    });
  }

  return {
    found: true,
    partNumber: part[0],
    partName:   part[1],
    stock,
    minStock,
    isLow,
    message: isLow
      ? `⚠️ ${part[1]} — only ${stock} left. Reorder raised!`
      : `✅ ${part[1]} — ${stock} in stock, good.`,
  };
}

async function save_job(args: Record<string, unknown>) {
  const sheets = google.sheets({ version: "v4", auth });
  const row = [
    new Date().toLocaleString(),
    args.job_done         || "",
    args.location         || "",
    args.time_taken       || "",
    args.parts_used       || "",
    args.parts_needed     || "",
    args.issues_found     || "",
    args.follow_up_needed ? "Yes" : "No",
    args.customer_message || "",
    args.sentiment        || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:J",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return { success: true };
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function runTool(name: string, args: Record<string, unknown>) {
  if (name === "extract_job_details") return await extract_job_details(args);
  if (name === "check_inventory")     return await check_inventory(args as { part_number: string });
  if (name === "save_job")            return await save_job(args);
  return { error: "Unknown tool" };
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();
  if (!transcript) return NextResponse.json({ error: "No transcript" }, { status: 400 });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a field service AI agent. When given a technician's job report:
1. ALWAYS call extract_job_details first to get structured data
2. If any part number is mentioned in parts_used or parts_needed, call check_inventory with the FULL part number including letters (e.g. PV45 not just 45, WP10 not just 10)
3. ALWAYS call save_job last with the extracted details
Also detect sentiment — positive if customer was happy, negative if issues/complaints, neutral otherwise.
Be decisive. Don't ask questions. Just act.`,
    },
    {
      role: "user",
      content: transcript,
    },
  ];

  const toolResults: Record<string, unknown> = {};

  // Agentic loop — keeps running until agent says it's done
  while (true) {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.1,
    });

    const choice = response.choices[0];

    // Agent is done
    if (choice.finish_reason === "stop") {
      break;
    }

    // Agent wants to call tools
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const args   = JSON.parse(toolCall.function.arguments);
        const result = await runTool(toolCall.function.name, args);

        toolResults[toolCall.function.name] = result;

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      break;
    }
  }

  return NextResponse.json({ success: true, results: toolResults });
}