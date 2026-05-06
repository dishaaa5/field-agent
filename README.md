# FieldAgent 🎙️

> Voice-powered job logging for field service technicians. Speak naturally after a job — AI handles the rest.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Groq](https://img.shields.io/badge/Groq-Whisper%20%2B%20Llama3-orange?style=flat-square)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-MCP%20Connector-green?style=flat-square&logo=google-sheets)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## What is this?

Field technicians waste 30–45 minutes every day on paperwork after each job. FieldAgent eliminates that.

The technician speaks into their phone:
> *"Fixed the main valve at Oak Street. Took 2 hours. Customer was happy. Need to order part PV22 for next visit."*

FieldAgent automatically:
- Transcribes the voice using **Groq Whisper**
- Extracts structured job data using **Groq Llama 3**
- Logs the job to **Google Sheets**
- Checks **inventory levels** for mentioned parts
- Raises a **reorder flag** if stock is low

All in under 5 seconds. Hands-free.

---

## Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | One-tap recording in the browser, no app install needed |
| 🤖 AI Extraction | Pulls job type, location, time taken, parts used/needed, issues |
| 📋 Auto Job Logging | Every job saved as a row in Google Sheets instantly |
| 📦 Inventory Check | Looks up mentioned parts in inventory sheet automatically |
| 🔴 Reorder Alerts | Flags low stock and marks sheet status as `REORDER NEEDED` |
| 🌑 Dark UI | Clean industrial interface built for field use |

---

## Tech Stack

```
Voice Input     →   Groq Whisper (STT)
Transcription   →   Groq Llama 3.1 (LLM)
Database        →   Google Sheets (via Sheets API)
Backend         →   Next.js API Routes
Frontend        →   Next.js + Tailwind CSS
Auth            →   Google Service Account
```

---

## Project Structure

```
field-agent/
├── app/
│   ├── page.tsx                      
│   └── api/
│       ├── transcribe/route.ts       
│       ├── extract/route.ts          
│       ├── save-job/route.ts         
│       └── check-inventory/route.ts  
├── .env.local                        
├── service-account.json              
└── package.json
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/field-agent.git
cd field-agent
npm install
```

### 2. Get your API keys

**Groq API key**
- Go to [console.groq.com](https://console.groq.com)
- Create a free account → API Keys → Create key

**Google Sheets API**
- Go to [console.cloud.google.com](https://console.cloud.google.com)
- Create a new project → Enable **Google Sheets API**
- Create a **Service Account** → download the JSON key file
- Rename it to `service-account.json` and place it in the project root

### 3. Create Google Sheets

**Jobs Sheet** — columns in order:
```
Date | Job Done | Location | Time Taken | Parts Used | Parts Needed | Issues Found | Follow Up | Customer SMS
```

**Inventory Sheet** — columns in order:
```
Part Number | Part Name | Stock | Min Stock | Status
```

Share both sheets with the `client_email` from your `service-account.json` as **Editor**.

### 4. Configure environment

Create `.env.local` in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_SHEET_ID=your_jobs_sheet_id_here
GOOGLE_INVENTORY_SHEET_ID=your_inventory_sheet_id_here
```

> The Sheet ID is the long string in the Google Sheets URL between `/d/` and `/edit`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to use

1. Open the app on your phone or browser
2. Tap **Speak**
3. Say what you did — naturally, like leaving a voice note
4. Tap **Stop**
5. Watch the AI extract, log, and check inventory automatically

### Example voice input
> *"Replaced the water pump at 14 Green Avenue. Took about 45 minutes. Had to use part WP10. Customer was satisfied. No follow-up needed."*

### What gets saved
```json
{
  "job_done": "Replaced the water pump",
  "location": "14 Green Avenue",
  "time_taken": "45 minutes",
  "parts_used": "WP10",
  "parts_needed": null,
  "issues_found": null,
  "follow_up_needed": false,
  "customer_message": "Water pump replaced successfully. All good!"
}
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key for Whisper + Llama 3 |
| `GOOGLE_SHEET_ID` | ID of the jobs Google Sheet |
| `GOOGLE_INVENTORY_SHEET_ID` | ID of the inventory Google Sheet |

---

## Security

- `.env.local` is gitignored — never committed
- `service-account.json` is gitignored — never committed
- No user data stored in the app — everything goes to your own Google Sheets

---


## License

MIT — free to use, modify, and build on.

