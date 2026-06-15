# FieldAgent 🎙️

> Voice-powered AI agent for field service technicians. Speak naturally after a job — the AI handles everything else.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Groq](https://img.shields.io/badge/Groq-Whisper%20%2B%20Llama3-orange?style=flat-square)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-MCP%20Connector-green?style=flat-square&logo=google-sheets)
![FAISS](https://img.shields.io/badge/FAISS-Vector%20Search-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## What is this?

Field technicians waste 30–45 minutes every day on paperwork after each job. FieldAgent eliminates that.

The technician speaks into their phone:
> *"Fixed the main valve at Oak Street. Took 2 hours. Customer was happy. Need to order part PV22 for next visit."*

FieldAgent automatically:
- Transcribes the voice using **Groq Whisper**
- Runs an **AI agent** that decides what tools to call
- Extracts structured job data using **Groq Llama 3**
- Logs the job to **Google Sheets**
- Checks **inventory levels** for mentioned parts
- Raises a **reorder flag** if stock is low
- Indexes the job for **semantic search** using FAISS embeddings

All in under 5 seconds. Hands-free.

---

## Features

| Feature | Description |
|---|---|
| 🎙️ Voice Recording | One-tap recording in the browser |
| 🤖 Agentic AI | One agent brain decides which tools to call dynamically |
| 📋 Auto Job Logging | Every job saved as a row in Google Sheets instantly |
| 📦 Inventory Check | Looks up mentioned parts in inventory sheet automatically |
| 🔴 Reorder Alerts | Flags low stock and marks sheet status as `REORDER NEEDED` |
| 🔍 Semantic Search | Search past jobs by meaning using RAG + FAISS vector embeddings |
| 🌑 Dark UI | Clean industrial interface built for field use |

---

## ML Concepts Used

| Concept | Implementation | Used By |
|---|---|---|
| **Agentic Function Calling** | Groq Llama 3 decides tools dynamically | OpenAI, Anthropic, every AI agent |
| **RAG** | Past jobs embedded + FAISS vector search | Notion, Perplexity, enterprise AI |
| **Embeddings** | `all-MiniLM-L6-v2` via sentence-transformers | Google, OpenAI, every semantic search |
| **Vector Search** | FAISS IndexFlatL2 similarity search | Meta, used in production everywhere |

---

## Tech Stack

```
Voice Input       →   Groq Whisper (STT)
Transcription     →   Groq Llama 3.1 (Agentic LLM)
MCP Connectors    →   Google Sheets API (jobs + inventory)
Vector DB         →   FAISS (in-memory)
Embeddings        →   sentence-transformers (all-MiniLM-L6-v2)
RAG Server        →   Python FastAPI (port 8001)
Backend           →   Next.js API Routes (port 3000)
Frontend          →   Next.js + Tailwind CSS
Auth              →   Google Service Account
```

---

## Project Structure

```
field-agent/
├── app/
│   ├── page.tsx                        # Main UI
│   └── api/
│       ├── transcribe/route.ts         # Groq Whisper — voice to text
│       ├── agent/route.ts              # Agentic loop — function calling
│       ├── extract/route.ts            # Groq Llama 3 — extract job details
│       ├── save-job/route.ts           # Save to Google Sheets
│       ├── check-inventory/route.ts    # Check + update inventory sheet
│       └── rag-search/route.ts         # Proxy to RAG Python server
├── rag/
│   └── main.py                         # FastAPI RAG server (FAISS + embeddings)
├── .env.local                          # API keys (not committed)
├── service-account.json                # Google credentials (not committed)
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

### 5. Setup RAG server

```bash
cd rag
python -m venv venv
venv\Scripts\activate        

pip install fastapi uvicorn faiss-cpu sentence-transformers gspread google-auth pandas numpy
```

Update the hardcoded paths in `rag/main.py`:
- `service-account.json` absolute path
- `GOOGLE_SHEET_ID` value

---

## Running the app

You need **2 terminals open at the same time.**

**Terminal 1 — Next.js:**
```bash
npm run dev
```

**Terminal 2 — RAG server:**
```bash
cd rag
venv\Scripts\activate
uvicorn main:app --port 8001
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to use

1. Open the app on your phone or browser
2. Tap **Speak**
3. Say what you did — naturally, like leaving a voice note
4. Tap **Stop**
5. The AI agent automatically extracts, logs, and checks inventory
6. Scroll down → type in the search box → find similar past jobs semantically

### Example voice input
> *"Replaced the water pump at 14 Green Avenue. Took about 45 minutes. Had to use part WP10. Customer was satisfied. No follow-up needed."*

### What gets extracted
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

### Semantic search example
Search: `"pump issue"` → finds `"Replaced water pump"`, `"Fixed compressor"`, `"Pressure problem"` — even without exact keyword match.

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
- `rag/venv/` is gitignored — never committed
- No user data stored in the app — everything goes to your own Google Sheets

---


## License

MIT — free to use, modify, and build on.

---

