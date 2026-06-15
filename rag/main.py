from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import gspread
from google.oauth2.service_account import Credentials
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load embedding model ──────────────────────────────────────────────────────
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded!")

# ── Google Sheets connection ──────────────────────────────────────────────────
def get_sheet_data():
    creds = Credentials.from_service_account_file(
        r"C:\Users\Dell\OneDrive\Disha_AI\field agent\field-agent\service-account.json",
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
    client = gspread.authorize(creds)
    sheet_id = "1NVeaW_rRDxFxjPS8vmArVcUdnDerijreZDHktAgWC7E"
    sheet = client.open_by_key(sheet_id)
    worksheet = sheet.get_worksheet(0)
    rows = worksheet.get_all_records()
    return rows

# ── FAISS index (in memory) ───────────────────────────────────────────────────
index = None
job_records = []

def build_index():
    global index, job_records

    print("Fetching jobs from Google Sheets...")
    rows = get_sheet_data()

    if not rows:
        print("No jobs found in sheet.")
        return

    # Combine job fields into one searchable text per job
    job_records = []
    texts = []

    for row in rows:
        text = f"{row.get('Job Done','')} at {row.get('Location','')}. " \
               f"Time: {row.get('Time Taken','')}. " \
               f"Parts used: {row.get('Parts Used','')}. " \
               f"Parts needed: {row.get('Parts Needed','')}. " \
               f"Issues: {row.get('Issues Found','')}."
        texts.append(text)
        job_records.append({
            "text": text,
            "date": row.get("Date", ""),
            "job_done": row.get("Job Done", ""),
            "location": row.get("Location", ""),
            "time_taken": row.get("Time Taken", ""),
            "parts_used": row.get("Parts Used", ""),
            "parts_needed": row.get("Parts Needed", ""),
        })

    print(f"Embedding {len(texts)} jobs...")
    embeddings = model.encode(texts, convert_to_numpy=True)

    # Build FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype(np.float32))

    print(f"FAISS index built with {index.ntotal} vectors.")

# ── Routes ────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

class RebuildRequest(BaseModel):
    pass

@app.on_event("startup")
async def startup():
    try:
        build_index()
    except Exception as e:
        print(f"Startup warning: {e}")
        print("Server running — call /rebuild after fixing sheet access.")

@app.post("/search")
async def search(req: QueryRequest):
    global index, job_records

    if index is None or index.ntotal == 0:
        return {"results": [], "message": "No jobs indexed yet"}

    # Embed the query
    query_vector = model.encode([req.query], convert_to_numpy=True)

    # Search FAISS
    distances, indices = index.search(
        query_vector.astype(np.float32), req.top_k
    )

    results = []
    for i, idx in enumerate(indices[0]):
        if idx < len(job_records):
            results.append({
                "score": float(distances[0][i]),
                "job": job_records[idx]
            })

    return {"results": results}

@app.post("/rebuild")
async def rebuild():
    build_index()
    return {"success": True, "total": index.ntotal if index else 0}

@app.get("/status")
async def status():
    return {
        "indexed_jobs": index.ntotal if index else 0,
        "ready": index is not None
    }