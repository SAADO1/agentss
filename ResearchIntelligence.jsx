import { useState, useRef, useEffect } from "react";

const PIPELINE_STEPS = [
  { id: "search", step: "01", label: "Search Agent", desc: "Scanning the web for relevant sources…" },
  { id: "scrape", step: "02", label: "Reader Agent", desc: "Scraping deep content from top URLs…" },
  { id: "write",  step: "03", label: "Writer Agent", desc: "Composing the research report…" },
  { id: "critic", step: "04", label: "Critic Agent", desc: "Reviewing and providing feedback…" },
];

const API = "http://localhost:8000";

async function callAPI(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} failed: ${res.statusText}`);
  const data = await res.json();
  return data.content;
}

async function runPipelineAPI(topic, onStep) {
  const results = {};

  onStep("search", "running");
  results.search = await callAPI("/api/search", { topic });
  onStep("search", "done", results.search);

  onStep("scrape", "running");
  const scrapePrompt =
    `Based on the following search results about '${topic}', ` +
    `pick the most relevant URL and scrape it for deeper content.\n\n` +
    `Search Results:\n${results.search.slice(0, 800)}`;
  results.scrape = await callAPI("/api/scrape", { topic: scrapePrompt });
  onStep("scrape", "done", results.scrape);

  onStep("write", "running");
  const research =
    `search results:\n${results.search}\n\ndeep content:\n${results.scrape}`;
  results.report = await callAPI("/api/write", {
    topic: `${topic}|||${research}`,
  });
  onStep("write", "done", results.report);

  onStep("critic", "running");
  results.feedback = await callAPI("/api/critique", { topic: results.report });
  onStep("critic", "done", results.feedback);

  return results;
}

export default function ResearchIntelligence() {
  const [topic, setTopic]           = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording]   = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [language, setLanguage]     = useState("en-US");
  const [recSeconds, setRecSeconds] = useState(6);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stepStates, setStepStates] = useState({});
  const [stepContent, setStepContent] = useState({});
  const [running, setRunning]       = useState(false);
  const [report, setReport]         = useState("");
  const [feedback, setFeedback]     = useState("");
  const [done, setDone]             = useState(false);

  const recognitionRef = useRef(null);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = language;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setRecording(true); setVoiceStatus("listening"); };
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setTopic(text);
      setVoiceStatus("done");
    };
    rec.onerror = () => { setVoiceStatus("error"); setRecording(false); };
    rec.onend   = () => { setRecording(false); };

    recognitionRef.current = rec;
    rec.start();

    setTimeout(() => { try { rec.stop(); } catch(_) {} }, recSeconds * 1000);
  };

  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch(_) {}
    setRecording(false);
  };

  const runPipeline = async () => {
    const t = topic.trim();
    if (!t) return;
    setRunning(true);
    setDone(false);
    setReport("");
    setFeedback("");
    setStepStates({});
    setStepContent({});

    const onStep = (id, status, content = "") => {
      setStepStates(prev => ({ ...prev, [id]: status }));
      if (content) setStepContent(prev => ({ ...prev, [id]: content }));
    };

    try {
      const results = await runPipelineAPI(t, onStep);
      setReport(results.report);
      setFeedback(results.feedback);
      setDone(true);
    } catch (error) {
      alert(error.message || "Pipeline failed. Check the backend and try again.");
    } finally {
      setRunning(false);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `research_${topic.slice(0,40).replace(/\s+/g, "_")}.txt`;
    a.click();
  };

  const voicePillColor = voiceStatus === "listening" ? "#ef4444" : voiceStatus === "done" ? "#34d399" : "#6b7280";

  return (
    <div style={styles.app}>
      <div style={{ ...styles.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.monoLabel}>Voice Settings</span>
          <button style={styles.closeBtn} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <label style={styles.fieldLabel}>Language</label>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={styles.select}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <label style={styles.fieldLabel}>Recording Duration: {recSeconds}s</label>
        <input type="range" min={3} max={15} value={recSeconds}
          onChange={e => setRecSeconds(+e.target.value)} style={styles.slider} />
        <div style={styles.sidebarNote}>
          Voice uses the browser's built-in Web Speech API (Chrome/Edge). No API key required.
        </div>
      </div>
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div style={styles.hero}>
        <button style={styles.gearBtn} onClick={() => setSidebarOpen(true)} title="Voice Settings">⚙</button>
        <h1 style={styles.heroTitle}>
          Research <em style={{ color: "#c8a96e", fontStyle: "italic" }}>Intelligence</em>
        </h1>
        <p style={styles.heroSub}>MULTI-AGENT · SEARCH · SCRAPE · WRITE · CRITIQUE · <span style={{ color:"#c8a96e" }}>VOICE</span></p>
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Type a topic — or speak it with the mic →"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !running && runPipeline()}
        />
        <button
          style={{ ...styles.micBtn, ...(recording ? styles.micRecording : {}) }}
          onClick={recording ? stopVoice : startVoice}
          title="Click to speak"
        >
          {recording ? "⏹" : "🎙"}
        </button>
        <button
          style={{ ...styles.runBtn, opacity: running ? 0.6 : 1 }}
          onClick={runPipeline}
          disabled={running}
        >
          {running ? "Running…" : "▶  Research"}
        </button>
      </div>

      {voiceStatus !== "idle" && (
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span style={{ ...styles.voicePill, borderColor: voicePillColor + "66", color: voicePillColor }}>
            {voiceStatus === "listening" && <span style={styles.blinkDot} />}
            {voiceStatus === "done" && "✔ "}
            {voiceStatus === "listening" ? "LISTENING — speak now" : voiceStatus === "done" ? "TRANSCRIBED" : "ERROR — try again"}
          </span>
        </div>
      )}

      {transcript && (
        <div style={styles.transcriptBox}>
          <span style={styles.transcriptLabel}>VOICE INPUT</span>
          {transcript}
        </div>
      )}

      {!running && !done && (
        <div style={styles.emptyState}>
          <span style={styles.monoLabel}>TYPE A TOPIC ABOVE — OR CLICK 🎙 TO SPEAK IT</span>
        </div>
      )}

      {(running || done) && (
        <>
          <div style={styles.pipelineGrid}>
            <div>
              <div style={styles.sectionLabel}>Pipeline</div>
              {PIPELINE_STEPS.slice(0,2).map(step => (
                <StepCard key={step.id} step={step} status={stepStates[step.id]} content={stepContent[step.id]} />
              ))}
            </div>
            <div>
              <div style={styles.sectionLabel}>Output</div>
              {PIPELINE_STEPS.slice(2,4).map(step => (
                <StepCard key={step.id} step={step} status={stepStates[step.id]} content={stepContent[step.id]} />
              ))}
            </div>
          </div>

          {done && (
            <>
              <div style={styles.divider} />
              <div style={styles.sectionLabel}>Final Report</div>
              <div style={styles.reportBox}>{report}</div>

              <div style={styles.sectionLabel}>Critic Feedback</div>
              <div style={styles.feedbackBox}>{feedback}</div>

              <div style={{ textAlign: "center", marginTop: "2rem", marginBottom: "3rem" }}>
                <button style={styles.downloadBtn} onClick={downloadReport}>
                  ⬇  Download Report
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StepCard({ step, status, content }) {
  const statusColor = !status ? "#374151" : status === "running" ? "#c8a96e" : "#34d399";
  const statusDot   = !status ? "○" : status === "running" ? "⬤" : "✔";
  const statusText  = !status ? "waiting" : status === "running" ? `${step.desc}` : "done";

  return (
    <div style={styles.stepCard}>
      <div style={styles.stepHeader}>
        <span style={styles.stepBadge}>STEP {step.step}</span>
        <span style={{ ...styles.stepTitle, color: statusColor }}>
          {statusDot} &nbsp;{step.label} — {statusText}
        </span>
      </div>
      {status === "running" && <StepSpinner />}
      {content && (
        <div style={styles.stepContent}>
          {content.slice(0, 600)}{content.length > 600 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

function StepSpinner() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 400);
    return () => clearInterval(t);
  }, []);
  return <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "#4b5563", padding: "0.5rem 0" }}>Processing{dots}</div>;
}

const LANGUAGES = [
  { code: "en-US", label: "🇺🇸 English (US)" },
  { code: "ur-PK", label: "🇵🇰 Urdu" },
  { code: "ar-SA", label: "🇸🇦 Arabic" },
  { code: "hi-IN", label: "🇮🇳 Hindi" },
  { code: "fr-FR", label: "🇫🇷 French" },
  { code: "es-ES", label: "🇪🇸 Spanish" },
  { code: "de-DE", label: "🇩🇪 German" },
  { code: "zh-CN", label: "🇨🇳 Chinese" },
  { code: "tr-TR", label: "🇹🇷 Turkish" },
];

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0b0c10",
    color: "#e8e6e1",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: "0 clamp(1rem, 5vw, 3rem)",
    maxWidth: "1100px",
    margin: "0 auto",
    position: "relative",
  },
  sidebar: {
    position: "fixed",
    top: 0, left: 0,
    width: "280px",
    height: "100vh",
    background: "#0f1117",
    borderRight: "1px solid #1f2937",
    padding: "2rem 1.5rem",
    zIndex: 200,
    transition: "transform 0.25s ease",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  closeBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 },
  gearBtn: {
    position: "absolute", top: "2rem", left: 0,
    background: "#111318", border: "1px solid #2a2d35", color: "#c8a96e",
    borderRadius: "0 6px 6px 0", padding: "0.5rem 0.75rem",
    cursor: "pointer", fontSize: "1rem",
  },
  fieldLabel: { fontSize: "0.75rem", color: "#6b7280", fontFamily: "'DM Mono', monospace", letterSpacing: "1px" },
  select: {
    width: "100%", background: "#111318", border: "1px solid #2a2d35",
    color: "#e8e6e1", borderRadius: "6px", padding: "0.5rem 0.75rem",
    fontFamily: "'DM Mono', monospace", fontSize: "0.82rem",
  },
  slider: { width: "100%", accentColor: "#c8a96e" },
  sidebarNote: { fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.6, marginTop: "1rem" },
  hero: {
    textAlign: "center",
    padding: "3rem 0 2rem",
    borderBottom: "1px solid #1f2937",
    marginBottom: "2.5rem",
    position: "relative",
  },
  heroTitle: {
    fontFamily: "'Georgia', 'DM Serif Display', serif",
    fontSize: "clamp(2rem, 5vw, 3.2rem)",
    color: "#f0ece4",
    letterSpacing: "-0.5px",
    margin: 0,
    fontWeight: 400,
  },
  heroSub: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginTop: "0.5rem",
    fontWeight: 300,
    letterSpacing: "0.5px",
    fontFamily: "'DM Mono', monospace",
  },
  inputRow: { display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" },
  input: {
    flex: 1,
    background: "#111318",
    border: "1px solid #2a2d35",
    borderRadius: "6px",
    color: "#e8e6e1",
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.95rem",
    padding: "0.75rem 1rem",
    outline: "none",
  },
  micBtn: {
    background: "#111318", color: "#c8a96e",
    border: "1px solid #2a2d35", borderRadius: "6px",
    fontSize: "1.2rem", padding: "0.65rem 1rem",
    cursor: "pointer", transition: "all 0.2s",
  },
  micRecording: {
    background: "#1a0a0a", color: "#ef4444",
    border: "1px solid #ef444466",
  },
  runBtn: {
    background: "#c8a96e", color: "#0b0c10",
    border: "none", borderRadius: "6px", padding: "0.75rem 1.25rem",
    cursor: "pointer", fontWeight: 600,
  },
  voicePill: {
    display: "inline-flex", alignItems: "center", gap: "0.5rem",
    border: "1px solid #374151", borderRadius: "999px",
    padding: "0.5rem 0.85rem", fontFamily: "'DM Mono', monospace",
    fontSize: "0.82rem",
  },
  blinkDot: {
    width: "8px", height: "8px", borderRadius: "999px",
    background: "#ef4444",
    display: "inline-block",
    animation: "blink 1s infinite alternate",
  },
  transcriptBox: {
    background: "#111318", border: "1px solid #1f2937",
    borderLeft: "3px solid #c8a96e", borderRadius: "6px",
    padding: "0.75rem 1rem", fontFamily: "'DM Mono', monospace",
    fontSize: "0.82rem", color: "#9ca3af", marginBottom: "1rem",
    lineHeight: 1.5,
  },
  transcriptLabel: { color: "#c8a96e", fontSize: "0.7rem", letterSpacing: "1px", display: "block", marginBottom: "4px" },
  emptyState: {
    textAlign: "center", padding: "2.5rem 1rem",
    color: "#6b7280", border: "1px dashed #1f2937", borderRadius: "10px",
    marginTop: "1rem",
  },
  pipelineGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" },
  sectionLabel: { fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem", letterSpacing: "1px", fontWeight: 600 },
  stepCard: {
    background: "#111318", border: "1px solid #1f2937",
    borderRadius: "10px", padding: "1.1rem 1.2rem", marginBottom: "1rem",
  },
  stepHeader: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" },
  stepBadge: {
    background: "#1f2937", color: "#c8a96e", fontFamily: "'DM Mono', monospace",
    fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "4px", letterSpacing: "1px",
  },
  stepTitle: { fontSize: "0.85rem", fontWeight: 500, color: "#9ca3af", letterSpacing: "0.5px" },
  stepContent: { color: "#d1d5db", fontSize: "0.9rem", lineHeight: 1.6, marginTop: "0.5rem" },
  divider: { height: "1px", background: "#1f2937", margin: "2rem 0" },
  reportBox: {
    background: "#111318", border: "1px solid #1f2937", borderRadius: "10px",
    padding: "1.2rem", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#e5e7eb",
  },
  feedbackBox: {
    background: "#111318", border: "1px solid #1f2937", borderRadius: "10px",
    padding: "1.2rem", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#d1d5db",
  },
  downloadBtn: {
    background: "#111318", color: "#c8a96e", border: "1px solid #2a2d35",
    borderRadius: "6px", padding: "0.9rem 1.5rem", cursor: "pointer", fontWeight: 600,
  },
  monoLabel: { fontFamily: "'DM Mono', monospace", letterSpacing: "1px", fontSize: "0.78rem", color: "#9ca3af" },
};
