"use client";
import { useState, useRef } from "react";

type JobData = {
  job_done: string;
  location: string | null;
  time_taken: string | null;
  parts_used: string | null;
  parts_needed: string | null;
  issues_found: string | null;
  follow_up_needed: boolean;
  customer_message: string;
};

type InventoryResult = {
  found: boolean;
  partNumber?: string;
  partName?: string;
  stock?: number;
  minStock?: number;
  isLow?: boolean;
  message: string;
};

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("tap to start recording");
  const [transcript, setTranscript] = useState("");
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [inventory, setInventory] = useState<InventoryResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setInventory(null);
        setJobData(null);

        setStatus("transcribing...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
        const transcribeData = await transcribeRes.json();
        const text = transcribeData.transcript;
        setTranscript(text);

        setStatus("understanding...");
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        });
        const extractData = await extractRes.json();
        setJobData(extractData.data);

        setStatus("saving to sheet...");
        const saveRes = await fetch("/api/save-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobData: extractData.data }),
        });
        const saveData = await saveRes.json();

        if (!saveData.success) {
          setStatus("error: " + saveData.error);
          return;
        }

        if (extractData.data.parts_needed) {
          setStatus("checking inventory...");
          const invRes = await fetch("/api/check-inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumber: extractData.data.parts_needed.trim() }),
          });
          const invData = await invRes.json();
          setInventory(invData);
        }

        setStatus("done — tap to speak again");
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setStatus("recording... tap to stop");

    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatus(err.name === "NotAllowedError"
          ? "mic blocked — allow access and retry"
          : "error: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setStatus("processing...");
  };

  return (
    <main style={{
      fontFamily: "'Syne', sans-serif",
      background: "#0A0A0B",
      minHeight: "100vh",
      color: "#F0F0F0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingBottom: "60px",
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .mic-ring::before {
          content:'';
          position:absolute;
          inset:-1px;
          border-radius:50%;
          background: conic-gradient(#E8FF47 0deg, transparent 120deg, #FF6B35 240deg, transparent 360deg);
          animation: spin 4s linear infinite;
        }
        .mic-ring::after {
          content:'';
          position:absolute;
          inset:3px;
          border-radius:50%;
          background:#0A0A0B;
        }
        .mic-btn:hover { transform: scale(1.03); }
        .mic-btn:active { transform: scale(0.97); }
      `}</style>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:480, padding:"32px 24px 0", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#E8FF47", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:3 }}>
            v1.0 · field ops
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.03em" }}>FieldAgent</div>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, padding:"5px 10px", borderRadius:20, background:"#1A2A0A", color:"#4AFF91", border:"1px solid #2A3A1A", display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#4AFF91", animation:"pulse 2s infinite" }} />
          LIVE
        </div>
      </div>

      {/* Mic */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, padding:"40px 24px 0", width:"100%", maxWidth:480 }}>
        <div className="mic-ring" style={{ position:"relative", width:160, height:160, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="mic-btn"
            style={{
              position:"relative", zIndex:1,
              width:148, height:148, borderRadius:"50%",
              background: isRecording ? "#1A0A08" : "#1A1A1E",
              border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:6, transition:"transform 0.15s",
            }}
          >
            <span style={{ fontSize:32, lineHeight:1 }}>{isRecording ? "⏹️" : "🎙️"}</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color: isRecording ? "#FF4A6B" : "#666672" }}>
              {isRecording ? "Stop" : "Speak"}
            </span>
          </button>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: isRecording ? "#E8FF47" : "#666672", letterSpacing:"0.05em", textAlign:"center", minHeight:18 }}>
          {status}
        </div>
      </div>

      {/* Divider */}
      {(transcript || jobData) && (
        <div style={{ width:"100%", maxWidth:480, padding:"32px 24px 0", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1, height:1, background:"#2A2A30" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#666672", letterSpacing:"0.1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>Job report</div>
          <div style={{ flex:1, height:1, background:"#2A2A30" }} />
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="fade-up" style={{ width:"calc(100% - 48px)", maxWidth:480, marginTop:16, padding:"18px 20px", background:"#111113", border:"1px solid #2A2A30", borderRadius:16, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#E8FF47,transparent)" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#666672", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>▸ Transcript</div>
          <div style={{ fontSize:14, color:"#F0F0F0", lineHeight:1.6, opacity:0.85 }}>{transcript}</div>
        </div>
      )}

      {/* Job grid */}
      {jobData && (
        <div className="fade-up" style={{ width:"calc(100% - 48px)", maxWidth:480, marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {jobData.job_done && <JobCard label="Job done" value={jobData.job_done} />}
          {jobData.location && <JobCard label="Location" value={jobData.location} accent />}
          {jobData.time_taken && <JobCard label="Time taken" value={jobData.time_taken} />}
          {jobData.parts_needed && <JobCard label="Parts needed" value={jobData.parts_needed} warn />}
          {jobData.parts_used && <JobCard label="Parts used" value={jobData.parts_used} />}
          {jobData.issues_found && <JobCard label="Issues found" value={jobData.issues_found} warn wide />}
          <JobCard label="Follow up" value={jobData.follow_up_needed ? "Required" : "Not required"} wide />
        </div>
      )}

      {/* SMS */}
      {jobData?.customer_message && (
        <div className="fade-up" style={{ width:"calc(100% - 48px)", maxWidth:480, marginTop:10, padding:"16px 20px", background:"#0D1A0D", border:"1px solid #1E3A1E", borderRadius:16, position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#4AFF91,transparent)" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#3A7A3A", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>📱 Customer SMS</div>
          <div style={{ fontSize:13, color:"#8ACA8A", lineHeight:1.5 }}>{jobData.customer_message}</div>
        </div>
      )}

      {/* Inventory */}
      {inventory && (
        <div className="fade-up" style={{
          width:"calc(100% - 48px)", maxWidth:480, marginTop:10, padding:"16px 20px", borderRadius:16, position:"relative",
          background: inventory.isLow ? "#1A0A08" : "#0D1A0D",
          border: inventory.isLow ? "1px solid #3A1A10" : "1px solid #1E3A1E",
        }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background: inventory.isLow ? "linear-gradient(90deg,#FF4A6B,transparent)" : "linear-gradient(90deg,#4AFF91,transparent)" }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color: inventory.isLow ? "#7A3A3A" : "#3A7A3A", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>📦 Inventory</div>
          <div style={{ fontSize:14, fontWeight:600, color: inventory.isLow ? "#FF4A6B" : "#4AFF91", marginBottom:12 }}>{inventory.message}</div>
          {inventory.found && (
            <div style={{ display:"flex", gap:24 }}>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#666672", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>In stock</div>
                <div style={{ fontSize:24, fontWeight:700, color: inventory.isLow ? "#FF4A6B" : "#4AFF91" }}>{inventory.stock}</div>
              </div>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#666672", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>Min required</div>
                <div style={{ fontSize:24, fontWeight:700, color: inventory.isLow ? "#FF4A6B" : "#4AFF91" }}>{inventory.minStock}</div>
              </div>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#666672", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>Part</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#F0F0F0", paddingTop:4 }}>{inventory.partNumber}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function JobCard({ label, value, accent, warn, wide }: { label:string; value:string; accent?:boolean; warn?:boolean; wide?:boolean }) {
  return (
    <div style={{
      background:"#111113", border:"1px solid #2A2A30", borderRadius:12,
      padding:"14px 16px", gridColumn: wide ? "1 / -1" : undefined,
    }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#666672", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color: accent ? "#E8FF47" : warn ? "#FF6B35" : "#F0F0F0" }}>{value}</div>
    </div>
  );
}