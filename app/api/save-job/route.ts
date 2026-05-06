import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function POST(req: NextRequest) {
  const { jobData } = await req.json();

  if (!jobData) {
    return NextResponse.json({ error: "No job data" }, { status: 400 });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      new Date().toLocaleString(),
      jobData.job_done || "",
      jobData.location || "",
      jobData.time_taken || "",
      jobData.parts_used || "",
      jobData.parts_needed || "",
      jobData.issues_found || "",
      jobData.follow_up_needed ? "Yes" : "No",
      jobData.customer_message || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}