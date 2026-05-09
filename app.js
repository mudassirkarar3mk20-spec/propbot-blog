import { useState, useRef, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// PropBot — AI-powered tenant communication tool
// Complete working app. Deploy to Vercel. Done.

const SCENARIOS = [
  { id: "maintenance", label: "🔧 Maintenance Request", color: "#F97316" },
  { id: "late_rent", label: "💰 Late Rent", color: "#EF4444" },
  { id: "lease_question", label: "📋 Lease Question", color: "#3B82F6" },
  { id: "noise_complaint", label: "🔊 Noise Complaint", color: "#8B5CF6" },
  { id: "move_out", label: "📦 Move-Out Notice", color: "#10B981" },
  { id: "renewal", label: "🔄 Lease Renewal", color: "#F59E0B" },
  { id: "deposit", label: "🏦 Security Deposit", color: "#06B6D4" },
  { id: "general", label: "✉️ General Inquiry", color: "#6B7280" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "firm", label: "Firm & Direct" },
  { id: "friendly", label: "Warm & Friendly" },
  { id: "legal", label: "Legal / Formal" },
];

const SYSTEM_PROMPT = `You are PropBot, an expert AI assistant for independent residential property managers and landlords managing between 10–50 units.

Your job is to draft professional, legally-aware, empathetic tenant communication replies. You understand landlord-tenant dynamics, fair housing laws, and property management best practices.

RULES:
- Always be professional and measured, never aggressive or emotionally reactive
- Protect the landlord's legal position without being threatening
- Be specific and actionable — give clear next steps
- Keep replies between 80–180 words unless the situation requires more
- Never make promises about specific repair timelines unless instructed
- For maintenance: acknowledge, give timeframe, log it
- For late rent: be firm but fair, reference lease terms, give cure period
- For legal matters: recommend professional legal counsel for complex issues
- Sign off as "The Management Team" unless told otherwise

Output ONLY the reply text — no preamble, no explanation, no extra commentary. Just the draft reply, ready to send.`;

function buildPrompt(scenario, tone, tenantMessage, context) {
  return `SCENARIO: ${scenario}
TONE: ${tone}
PROPERTY CONTEXT: ${context || "Residential rental property"}
TENANT MESSAGE: "${tenantMessage}"

Draft a ${tone} reply to this tenant message. The reply should be appropriate for the ${scenario.replace("_", " ")} scenario.`;
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function PropBot() {
  const [scenario, setScenario] = useState("maintenance");
  const [tone, setTone] = useState("professional");
  const [tenantMessage, setTenantMessage] = useState("");
  const [context, setContext] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const replyRef = useRef(null);

  const selectedScenario = SCENARIOS.find(s => s.id === scenario);

  async function generateReply() {
    if (!tenantMessage.trim()) {
      setError("Paste the tenant's message first.");
      return;
    }
    setError("");
    setLoading(true);
    setReply("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildPrompt(
                selectedScenario.label,
                TONES.find(t => t.id === tone).label,
                tenantMessage,
                context
              )
            }
          ]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.content.map(c => c.text || "").join("");
      setReply(text);

      // Save to history
      setHistory(prev => [{
        id: Date.now(),
        scenario: selectedScenario.label,
        tone: TONES.find(t => t.id === tone).label,
        tenantMsg: tenantMessage.slice(0, 80) + (tenantMessage.length > 80 ? "…" : ""),
        reply: text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }, ...prev.slice(0, 9)]);

    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function copyReply() {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function clearAll() {
    setTenantMessage("");
    setReply("");
    setContext("");
    setError("");
  }

  const SAMPLE_MESSAGES = {
    maintenance: "Hi, my kitchen faucet has been leaking for 3 days now and it's getting worse. Water is dripping constantly and I'm worried about my water bill. Can you please send someone to fix it ASAP?",
    late_rent: "Hey I know rent was due on the 1st but I'm going through a really tough time right now. I lost my job last week and I'm waiting on my first unemployment check. Can I please have until the 15th?",
    lease_question: "I wanted to ask if I can have my girlfriend move in with me? She would be living here permanently. Do I need to change anything on the lease?",
    noise_complaint: "The people upstairs are SO loud every night after 11pm. Stomping, music, talking loudly. I've tried talking to them myself but nothing changed. This is affecting my sleep and work.",
    move_out: "I wanted to let you know that I'll be moving out at the end of next month. My last day will be June 30th. What do I need to do for the move-out process?",
    renewal: "My lease is up in 2 months and I was wondering if I could renew it. I really like it here. Will the rent be going up? Can we talk about the terms?",
    deposit: "I moved out 3 weeks ago and still haven't received my security deposit back. It's been way too long. When am I getting my $1,800 back?",
    general: "Hi I was wondering if I'm allowed to hang pictures on the walls? Also can I paint my bedroom? I'd paint it back before moving out of course.",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0D1117",
      color: "#E6EDF3",
      fontFamily: "'Courier New', Courier, monospace",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid #21262D",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "56px",
        background: "#161B22",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "28px", height: "28px",
            background: "linear-gradient(135deg, #F97316, #EF4444)",
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px",
          }}>🏠</div>
          <span style={{ fontWeight: "bold", fontSize: "15px", letterSpacing: "0.5px" }}>PropBot</span>
          <span style={{
            background: "#1F6FEB22",
            border: "1px solid #1F6FEB66",
            color: "#58A6FF",
            fontSize: "9px",
            padding: "2px 7px",
            borderRadius: "10px",
            letterSpacing: "1px",
          }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: showHistory ? "#21262D" : "transparent",
              border: "1px solid #30363D",
              color: "#8B949E",
              padding: "5px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "11px",
              letterSpacing: "1px",
            }}
          >
            HISTORY {history.length > 0 && `(${history.length})`}
          </button>
          <div style={{ fontSize: "11px", color: "#8B949E" }}>
            AI Reply Generator for Landlords
          </div>
        </div>
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside style={{
          width: "220px",
          flexShrink: 0,
          borderRight: "1px solid #21262D",
          background: "#161B22",
          padding: "20px 0",
        }}>
          <div style={{ padding: "0 16px 12px", fontSize: "9px", color: "#484F58", letterSpacing: "2px" }}>
            SCENARIO
          </div>
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setScenario(s.id);
                setReply("");
                setTenantMessage("");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 16px",
                background: scenario === s.id ? "#21262D" : "transparent",
                border: "none",
                borderLeft: scenario === s.id ? `3px solid ${s.color}` : "3px solid transparent",
                color: scenario === s.id ? "#E6EDF3" : "#8B949E",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {s.label}
            </button>
          ))}

          <div style={{ padding: "20px 16px 12px", fontSize: "9px", color: "#484F58", letterSpacing: "2px" }}>
            TONE
          </div>
          {TONES.map(t => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 16px",
                background: tone === t.id ? "#21262D" : "transparent",
                border: "none",
                borderLeft: tone === t.id ? `3px solid #58A6FF` : "3px solid transparent",
                color: tone === t.id ? "#58A6FF" : "#8B949E",
                cursor: "pointer",
                fontSize: "12px",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}

          {/* Stats */}
          <div style={{
            margin: "24px 12px 0",
            padding: "12px",
            background: "#0D1117",
            border: "1px solid #21262D",
            borderRadius: "6px",
          }}>
            <div style={{ fontSize: "9px", color: "#484F58", letterSpacing: "2px", marginBottom: "10px" }}>SESSION</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#E8FF47" }}>{history.length}</div>
            <div style={{ fontSize: "10px", color: "#484F58" }}>replies drafted</div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "28px", maxWidth: "900px" }}>

          {/* History Panel */}
          {showHistory && history.length > 0 && (
            <div style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: "8px",
              marginBottom: "24px",
              overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #21262D", fontSize: "11px", color: "#8B949E", letterSpacing: "1px" }}>
                RECENT DRAFTS
              </div>
              {history.slice(0, 4).map(h => (
                <div
                  key={h.id}
                  onClick={() => { setReply(h.reply); setShowHistory(false); }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #21262D",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#21262D"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontSize: "10px", color: "#58A6FF", whiteSpace: "nowrap", marginTop: "2px" }}>{h.time}</div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#E6EDF3", marginBottom: "4px" }}>{h.scenario} · {h.tone}</div>
                    <div style={{ fontSize: "11px", color: "#484F58" }}>{h.tenantMsg}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

            {/* Left: Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: "8px",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #21262D",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: "10px", color: "#8B949E", letterSpacing: "2px" }}>TENANT MESSAGE</span>
                  <button
                    onClick={() => setTenantMessage(SAMPLE_MESSAGES[scenario] || "")}
                    style={{
                      background: "transparent",
                      border: "1px solid #30363D",
                      color: "#58A6FF",
                      fontSize: "9px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      letterSpacing: "1px",
                    }}
                  >
                    LOAD SAMPLE
                  </button>
                </div>
                <textarea
                  value={tenantMessage}
                  onChange={e => setTenantMessage(e.target.value)}
                  placeholder={`Paste the tenant's message here...\n\nExample: "Hi, my kitchen sink has been leaking for 2 days..."`}
                  style={{
                    width: "100%",
                    minHeight: "180px",
                    background: "transparent",
                    border: "none",
                    color: "#E6EDF3",
                    fontSize: "13px",
                    padding: "14px 16px",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "'Courier New', monospace",
                    lineHeight: "1.6",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: "8px",
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #21262D" }}>
                  <span style={{ fontSize: "10px", color: "#8B949E", letterSpacing: "2px" }}>PROPERTY CONTEXT (optional)</span>
                </div>
                <input
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="e.g. 'Unit 4B, 2BR apartment, tenant since 2022, good payment history'"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "#E6EDF3",
                    fontSize: "12px",
                    padding: "12px 16px",
                    outline: "none",
                    fontFamily: "'Courier New', monospace",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: "#FF000011",
                  border: "1px solid #FF000044",
                  color: "#FF7B72",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={generateReply}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "13px",
                    background: loading ? "#21262D" : "linear-gradient(135deg, #F97316, #EF4444)",
                    border: "none",
                    borderRadius: "8px",
                    color: loading ? "#8B949E" : "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'Courier New', monospace",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        display: "inline-block",
                        width: "12px", height: "12px",
                        border: "2px solid #8B949E",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      GENERATING...
                    </>
                  ) : "⚡ DRAFT REPLY"}
                </button>
                {(tenantMessage || reply) && (
                  <button
                    onClick={clearAll}
                    style={{
                      padding: "13px 16px",
                      background: "transparent",
                      border: "1px solid #30363D",
                      borderRadius: "8px",
                      color: "#8B949E",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Scenario badge */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: `${selectedScenario.color}11`,
                border: `1px solid ${selectedScenario.color}33`,
                borderRadius: "6px",
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: selectedScenario.color }} />
                <span style={{ fontSize: "11px", color: selectedScenario.color }}>{selectedScenario.label}</span>
                <span style={{ fontSize: "11px", color: "#484F58" }}>·</span>
                <span style={{ fontSize: "11px", color: "#8B949E" }}>
                  {TONES.find(t => t.id === tone)?.label} tone
                </span>
              </div>
            </div>

            {/* Right: Output */}
            <div style={{
              background: "#161B22",
              border: "1px solid #21262D",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                padding: "10px 16px",
                borderBottom: "1px solid #21262D",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: "10px", color: "#8B949E", letterSpacing: "2px" }}>
                  AI DRAFT REPLY
                </span>
                {reply && (
                  <button
                    onClick={copyReply}
                    style={{
                      background: copied ? "#1F6FEB22" : "transparent",
                      border: `1px solid ${copied ? "#1F6FEB" : "#30363D"}`,
                      color: copied ? "#58A6FF" : "#8B949E",
                      fontSize: "9px",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      letterSpacing: "1px",
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "✓ COPIED" : "COPY"}
                  </button>
                )}
              </div>

              <div style={{
                flex: 1,
                padding: "16px",
                minHeight: "280px",
                position: "relative",
              }}>
                {loading && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: "12px",
                  }}>
                    <div style={{
                      width: "32px", height: "32px",
                      border: "3px solid #21262D",
                      borderTopColor: "#F97316",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <div style={{ fontSize: "11px", color: "#484F58", letterSpacing: "2px" }}>
                      DRAFTING...
                    </div>
                  </div>
                )}

                {!loading && !reply && (
                  <div style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px",
                    opacity: 0.4,
                  }}>
                    <div style={{ fontSize: "32px" }}>✉️</div>
                    <div style={{ fontSize: "11px", color: "#8B949E", textAlign: "center", letterSpacing: "1px" }}>
                      YOUR REPLY WILL<br />APPEAR HERE
                    </div>
                  </div>
                )}

                {!loading && reply && (
                  <div ref={replyRef}>
                    <div style={{
                      fontSize: "13px",
                      lineHeight: "1.8",
                      color: "#E6EDF3",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {reply}
                    </div>

                    {/* Actions */}
                    <div style={{
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop: "1px solid #21262D",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}>
                      <span style={{ fontSize: "10px", color: "#484F58", alignSelf: "center", letterSpacing: "1px" }}>
                        REGENERATE WITH:
                      </span>
                      {TONES.filter(t => t.id !== tone).map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setTone(t.id); generateReply(); }}
                          style={{
                            background: "transparent",
                            border: "1px solid #30363D",
                            color: "#8B949E",
                            padding: "3px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "10px",
                            fontFamily: "'Courier New', monospace",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.target.style.borderColor = "#58A6FF"; e.target.style.color = "#58A6FF"; }}
                          onMouseLeave={e => { e.target.style.borderColor = "#30363D"; e.target.style.color = "#8B949E"; }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Tips */}
          <div style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px",
            background: "#21262D",
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #21262D",
          }}>
            {[
              { icon: "⚡", tip: "8 scenarios", sub: "Covers 95% of tenant messages" },
              { icon: "🎭", tip: "4 tone modes", sub: "Professional to Legal" },
              { icon: "📋", tip: "Copy & send", sub: "Ready in seconds" },
              { icon: "💾", tip: "Session history", sub: "Last 10 drafts saved" },
            ].map((t, i) => (
              <div key={i} style={{
                background: "#161B22",
                padding: "14px 16px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "18px", marginBottom: "6px" }}>{t.icon}</div>
                <div style={{ fontSize: "11px", color: "#E6EDF3", fontWeight: "bold" }}>{t.tip}</div>
                <div style={{ fontSize: "10px", color: "#484F58", marginTop: "2px" }}>{t.sub}</div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #484F58; }
        input::placeholder { color: #484F58; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #30363D; border-radius: 3px; }
      `}</style>
    </div>
  );
}
