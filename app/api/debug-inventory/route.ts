import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function GET() {
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_INVENTORY_SHEET_ID,
    range: "Sheet1!A:E",
  });

  return NextResponse.json({ rows: response.data.values });
}