# FieldAgent 🎙️

A voice-driven field service agent. Technicians speak naturally after completing a job — the AI transcribes, extracts structured data, checks inventory, and logs everything to Google Sheets automatically.

## Stack
- **Next.js 16** — frontend + API routes
- **Groq Whisper** — speech to text
- **Groq Llama 3** — job data extraction
- **Google Sheets** — job log + inventory database

## Features
- 🎙️ Voice recording in browser
- 🤖 AI extracts job, location, time, parts from natural speech
- 📋 Auto saves to Google Sheets
- 📦 Inventory check with low stock alerts
- 🔴 Reorder flag raised automatically

## Setup
1. Clone the repo
2. Run `npm install`
3. Create `.env.local` with your keys (see below)
4. Add `service-account.json` from Google Cloud Console
5. Run `npm run dev`

## Environment Variables

GROQ_API_KEY=
GOOGLE_SHEET_ID=
GOOGLE_INVENTORY_SHEET_ID=

## Built with
Groq · Next.js · Google Sheets API · Tailwind CSS