import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "service-account.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function POST(req: NextRequest) {
  const { partNumber } = await req.json();

  if (!partNumber) {
    return NextResponse.json({ error: "No part number" }, { status: 400 });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Read all inventory rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_INVENTORY_SHEET_ID,
      range: "Sheet1!A:E",
    });

    const rows = response.data.values || [];

    // Skip header row, find matching part
    const part = rows.slice(1).find(
      (row) => row[0]?.toString().toUpperCase() === partNumber.toUpperCase()
    );

    if (!part) {
      return NextResponse.json({
        found: false,
        message: `Part ${partNumber} not found in inventory`,
      });
    }

    const stock = parseInt(part[2]) || 0;
    const minStock = parseInt(part[3]) || 0;
    const isLow = stock <= minStock;

    // If low stock — update status in sheet
    if (isLow) {
      const rowIndex = rows.findIndex(
        (row) => row[0]?.toString().toUpperCase() === partNumber.toUpperCase()
      );

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_INVENTORY_SHEET_ID,
        range: `Sheet1!E${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["REORDER NEEDED"]],
        },
      });
    }

    return NextResponse.json({
      found: true,
      partNumber: part[0],
      partName: part[1],
      stock,
      minStock,
      isLow,
      message: isLow
        ? `⚠️ ${part[1]} — only ${stock} left in stock. Reorder raised!`
        : `✅ ${part[1]} — ${stock} in stock, good.`,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("INVENTORY ERROR:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}