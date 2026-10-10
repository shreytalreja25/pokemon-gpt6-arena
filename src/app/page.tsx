"use client";

import React, { useState, useEffect, useRef } from "react";
import { PokemonBattleEngine, SAMPLE_POKEMON } from "@/engine/pokemonEngine";
import { RomLoaderBridge, RomHeaderInfo } from "@/engine/romLoader";
import { DecisionResponse, BattleAction } from "@/engine/pokemonTypes";
import { pokemonAudio } from "@/engine/audio";

export default function PokemonAIArena() {
  const engineRef = useRef<PokemonBattleEngine | null>(null);
  const [battleState, setBattleState] = useState<any>(null);

  // Model & AI State
  const [selectedModel, setSelectedModel] = useState<string>("gpt-6-luna");
  const [customOllamaModel, setCustomOllamaModel] = useState<string>("mistral");
  const [isAutoBattle, setIsAutoBattle] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [p50Latency, setP50Latency] = useState<number>(142);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [decisionHistory, setDecisionHistory] = useState<DecisionResponse | null>(null);

  // Wire Telecast State
  const [wireTab, setWireTab] = useState<"request" | "response">("response");
  const [copied, setCopied] = useState<boolean>(false);

  // ROM Loader State
  const [romInfo, setRomInfo] = useState<RomHeaderInfo | null>(null);
  const [loadedRomName, setLoadedRomName] = useState<string>("");

  // Matchup Selection
  const [selectedMatchup, setSelectedMatchup] = useState<string>("Pikachu_vs_Pidgeot");

  // Initialize Engine
  useEffect(() => {
    const engine = new PokemonBattleEngine();
    engineRef.current = engine;
    setBattleState({ ...engine.state });
  }, []);

  // Handle Matchup Switch
  const switchMatchup = (matchupKey: string) => {
    setSelectedMatchup(matchupKey);
    const [p, opp] = matchupKey.split("_vs_");
    if (engineRef.current) {
      engineRef.current.state = engineRef.current.createInitialBattle(p, opp);
      setBattleState({ ...engineRef.current.state });
    }
  };

  // ROM File Upload Handler
  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadedRomName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        const info = RomLoaderBridge.parseRom(buffer, file.name);
        setRomInfo(info);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadPreloadedRom = async (romPath: string, name: string) => {
    try {
      setLoadedRomName(`${name} (Reading buffer...)`);
      const resp = await fetch(romPath);
      const buffer = await resp.arrayBuffer();
      const info = RomLoaderBridge.parseRom(buffer, name);
      setRomInfo(info);
      setLoadedRomName(name);
    } catch (err) {
      console.error("Failed to load preloaded ROM:", err);
    }
  };

  // Trigger AI Decision
  const triggerAIDecision = async () => {
    if (!engineRef.current || isEvaluating) return;
    setIsEvaluating(true);

    const engine = engineRef.current;
    const actions = engine.getAvailableActionCriteria();
    const modelToUse = selectedModel === "custom-ollama"
      ? `ollama:${customOllamaModel.trim() || "llama3.2:1b"}`
      : selectedModel;

    try {
      const res = await fetch("/api/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          player: engine.state.playerActive,
          opponent: engine.state.opponentActive,
          actions,
        }),
      });

      if (res.ok) {
        const data: DecisionResponse = await res.json();
        setDecisionHistory(data);
        setP50Latency(prev => Math.round(prev * 0.7 + data.latencyMs * 0.3));
        setTotalCost(prev => prev + (data.costUsd || 0));

        // Execute turn with chosen action
        engine.executeTurn(data.chosenAction);
        setBattleState({ ...engine.state });
      }
    } catch (err) {
      console.error("AI Battle decision error:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Auto Battle Loop
  useEffect(() => {
    if (!isAutoBattle) return;
    if (battleState?.phase === "Victory" || battleState?.phase === "Defeat") {
      setIsAutoBattle(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!isEvaluating) {
        triggerAIDecision();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isAutoBattle, battleState, isEvaluating]);

  const pHpPct = battleState
    ? Math.max(0, Math.round((battleState.playerActive.currentHp / battleState.playerActive.maxHp) * 100))
    : 100;
  const oppHpPct = battleState
    ? Math.max(0, Math.round((battleState.opponentActive.currentHp / battleState.opponentActive.maxHp) * 100))
    : 100;

  const getHpColor = (pct: number) => {
    if (pct > 50) return "#10b981";
    if (pct > 20) return "#fbbf24";
    return "#f43f5e";
  };

  return (
    <div>
      {/* Header */}
      <header className="arcade-header">
        <div className="brand-title">
          <span className="pokeball-icon">⚡</span>
          <div>
            <div className="title-text">POKÉMON GPT-6 ARENA</div>
            <div className="title-sub">AUTONOMOUS DECISIONS AGENT & WEB ROM SIMULATOR</div>
          </div>
        </div>

        <div className="header-badges">
          <div className="badge-pill model-active">
            <span>●</span> {selectedModel === "gpt-6-luna" ? "GPT-6 Luna (0 Output Tokens)" : selectedModel.toUpperCase()}
          </div>
          <div className="badge-pill">
            <span>⚡</span> {p50Latency} ms P50
          </div>
          <div className="badge-pill">
            <span>💰</span> ${totalCost.toFixed(5)}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        <div className="arena-grid">
          {/* Left Game Boy Cabinet */}
          <div className="gb-cabinet">
            {/* Battle Screen */}
            <div className="battle-screen">
              {/* Opponent HUD */}
              <div className="hud-opponent">
                <div className="pkmn-meta">
                  <span className="pkmn-name">{battleState?.opponentActive.name}</span>
                  <span className="pkmn-level">:L{battleState?.opponentActive.level}</span>
                </div>
                <div className="hp-bar-track">
                  <div
                    className="hp-bar-fill"
                    style={{ width: `${oppHpPct}%`, background: getHpColor(oppHpPct) }}
                  />
                </div>
                <div className="hp-text">
                  HP {battleState?.opponentActive.currentHp}/{battleState?.opponentActive.maxHp}
                </div>
              </div>

              {/* Visual Sprites Center */}
              <div className="battle-visual-center">
                {/* Player Sprite */}
                <div className="pkmn-sprite-box">
                  <div className="sprite-circle">
                    {battleState?.playerActive.name === "Pikachu" ? "⚡" :
                     battleState?.playerActive.name === "Charizard" ? "🔥" :
                     battleState?.playerActive.name === "Blastoise" ? "💧" : "🐾"}
                  </div>
                  <span className="type-pill" style={{ background: "#fbbf24", color: "#000" }}>
                    {battleState?.playerActive.types.join("/")}
                  </span>
                </div>

                {/* Opponent Sprite */}
                <div className="pkmn-sprite-box">
                  <div className="sprite-circle" style={{ animationDelay: "-1.2s" }}>
                    {battleState?.opponentActive.name === "Pidgeot" ? "🦅" :
                     battleState?.opponentActive.name === "Onix" ? "🪨" :
                     battleState?.opponentActive.name === "Blastoise" ? "💧" : "🔥"}
                  </div>
                  <span className="type-pill" style={{ background: "#38bdf8", color: "#000" }}>
                    {battleState?.opponentActive.types.join("/")}
                  </span>
                </div>
              </div>

              {/* Player HUD */}
              <div className="hud-player">
                <div className="pkmn-meta">
                  <span className="pkmn-name">{battleState?.playerActive.name}</span>
                  <span className="pkmn-level">:L{battleState?.playerActive.level}</span>
                </div>
                <div className="hp-bar-track">
                  <div
                    className="hp-bar-fill"
                    style={{ width: `${pHpPct}%`, background: getHpColor(pHpPct) }}
                  />
                </div>
                <div className="hp-text">
                  HP {battleState?.playerActive.currentHp}/{battleState?.playerActive.maxHp}
                </div>
              </div>

              {/* In-Game Dialogue Box */}
              <div className="dialogue-box">
                {isEvaluating ? "Deliberating optimal battle action via API..." : battleState?.dialogueText}
              </div>
            </div>

            {/* Interactive Battle Controls */}
            <div className="control-bar">
              <div className="btn-group">
                <button
                  className="arcade-btn btn-primary"
                  onClick={triggerAIDecision}
                  disabled={isEvaluating}
                >
                  ⚡ Execute AI Turn
                </button>
                <button
                  className={`arcade-btn ${isAutoBattle ? "active" : ""}`}
                  onClick={() => setIsAutoBattle(!isAutoBattle)}
                >
                  {isAutoBattle ? "⏸ Pause Auto-Battle" : "▶ Start Auto-Battle"}
                </button>
                <button
                  className="arcade-btn"
                  onClick={() => switchMatchup(selectedMatchup)}
                >
                  🔄 Reset Battle
                </button>
              </div>

              <div className="btn-group">
                <select
                  className="arcade-btn"
                  value={selectedMatchup}
                  onChange={(e) => switchMatchup(e.target.value)}
                  style={{ outline: "none", cursor: "pointer" }}
                >
                  <option value="Pikachu_vs_Pidgeot">Pikachu vs Pidgeot (Electric vs Flying)</option>
                  <option value="Charizard_vs_Blastoise">Charizard vs Blastoise (Fire vs Water)</option>
                  <option value="Pikachu_vs_Onix">Pikachu vs Onix (Electric vs Ground/Rock)</option>
                  <option value="Blastoise_vs_Charizard">Blastoise vs Charizard (Water vs Fire)</option>
                </select>
              </div>
            </div>

            {/* ROM Dropzone Card */}
            <div className="rom-dropzone">
              <label style={{ cursor: "pointer", display: "block" }}>
                <input
                  type="file"
                  accept=".gb,.gbc,.gba,.bin"
                  onChange={handleRomUpload}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }}>
                  📂 Drag & Drop Pokémon ROM (.gb / .gbc / .gba) or Click to Load
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Supports Game Boy, GBC & Game Boy Advance (e.g. Pokémon LeafGreen) • WebAssembly RAM Hooks
                </div>
              </label>

              {/* Quick-Load Preset Buttons */}
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="arcade-btn"
                  onClick={() => loadPreloadedRom("/roms/Pokemon_LeafGreen.gba", "Pokemon - Leaf Green Version (U) (V1.1).gba")}
                  style={{ fontSize: "11px", padding: "6px 12px", background: "rgba(16, 185, 129, 0.2)", borderColor: "#10b981" }}
                >
                  ⚡ Quick-Load Pokémon LeafGreen (.gba)
                </button>
                <button
                  type="button"
                  className="arcade-btn"
                  onClick={() => loadPreloadedRom("/roms/Super_Mario_Bros.gba", "Classic NES Series - Super Mario Bros.gba")}
                  style={{ fontSize: "11px", padding: "6px 12px", background: "rgba(244, 63, 94, 0.2)", borderColor: "#f43f5e" }}
                >
                  🍄 Quick-Load Super Mario Bros (.gba)
                </button>
              </div>

              {romInfo && (
                <div className="rom-header-info">
                  <div><strong>File:</strong> {loadedRomName}</div>
                  <div><strong>Platform:</strong> <span style={{ color: "#10b981", fontWeight: 700 }}>{romInfo.system}</span></div>
                  <div><strong>ROM Header Title:</strong> {romInfo.title} {romInfo.gameCode ? `[${romInfo.gameCode}]` : ""}</div>
                  <div><strong>Cartridge / Save:</strong> {romInfo.cartridgeType}</div>
                  <div><strong>ROM / RAM Size:</strong> {romInfo.romSizeKb} KB ROM | {romInfo.ramSizeKb} KB RAM</div>
                  <div><strong>Header Checksum:</strong> {romInfo.checksumValid ? "✓ VALID (Authentic Cartridge Header)" : "FAILED"}</div>
                  <div><strong>AI WRAM Hook:</strong> Ready for real-time state extraction & autonomous decision loop</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Telemetry Sidebar */}
          <div className="telemetry-sidebar">
            {/* Active Model Selector */}
            <div className="telemetry-card">
              <div className="card-header">
                <span className="card-title">🤖 Active Intelligence Agent</span>
                <span style={{ fontSize: "11px", color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  {selectedModel.startsWith("ollama") || selectedModel === "custom-ollama"
                    ? "Local Ollama"
                    : selectedModel === "gpt-6-luna"
                    ? "Decisions API"
                    : "Deterministic"}
                </span>
              </div>
              <select
                className="model-select"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
              >
                <option value="gpt-6-luna">OpenAI GPT-6 Luna (Decisions API • 0 Tokens)</option>
                <option value="ollama:llama3.2:1b">🦙 Ollama Llama 3.2 1B (Local • Fast)</option>
                <option value="ollama:llama3.1:latest">🦙 Ollama Llama 3.1 8B (Local)</option>
                <option value="ollama:lukey03/qwen3.5-9b-abliterated:latest">🧠 Ollama Qwen 3.5 9B (Local)</option>
                <option value="heuristic">Type-Advantage Solver (Sub-1ms Baseline)</option>
                <option value="custom-ollama">⚙️ Custom Ollama Model...</option>
              </select>

              {selectedModel === "custom-ollama" && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="text"
                    placeholder="e.g. mistral, qwen2.5:3b, deepseek-r1"
                    value={customOllamaModel}
                    onChange={e => setCustomOllamaModel(e.target.value)}
                    className="custom-model-input"
                  />
                </div>
              )}
            </div>

            {/* Action Matrix & Type Effectiveness */}
            <div className="telemetry-card">
              <div className="card-header">
                <span className="card-title">📊 Move Decision Matrix</span>
                <span style={{ fontSize: "11px", color: isEvaluating ? "#00f3ff" : "#94a3b8" }}>
                  {isEvaluating ? "Deliberating..." : "Turn Evaluated"}
                </span>
              </div>

              <div className="move-list">
                {engineRef.current?.getAvailableActionCriteria().map(action => {
                  const isChosen = decisionHistory?.chosenAction === action.value;
                  return (
                    <div
                      key={action.value}
                      className={`move-row ${isChosen ? "chosen" : ""}`}
                    >
                      <div className="move-meta">
                        <span style={{ color: isChosen ? "var(--accent-cyan)" : "#fff" }}>
                          {isChosen ? "▶ " : ""}{action.name}
                        </span>
                        {action.effectiveness !== undefined && (
                          <span style={{
                            color: action.effectiveness >= 2.0 ? "#10b981" :
                                   action.effectiveness === 0 ? "#f43f5e" :
                                   action.effectiveness < 1 ? "#fbbf24" : "#cbd5e1"
                          }}>
                            {action.effectiveness}x
                          </span>
                        )}
                      </div>
                      <div className="move-desc">{action.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live API Wire Telecast */}
            <div className="telemetry-card">
              <div className="card-header">
                <span className="card-title">
                  <span className="live-pulse" /> Live API Wire Telecast
                </span>
                <div className="wire-meta-badge">
                  <span className="status-code">200 OK</span>
                  <span className="zero-token-pill">
                    {selectedModel === "gpt-6-luna" ? "0 Gen Tokens" : selectedModel.startsWith("ollama") ? "Local $0.00" : "0ms Rule"}
                  </span>
                </div>
              </div>

              <div className="wire-tabs">
                <button
                  className={`wire-tab-btn ${wireTab === "request" ? "active" : ""}`}
                  onClick={() => setWireTab("request")}
                >
                  Request Payload
                </button>
                <button
                  className={`wire-tab-btn ${wireTab === "response" ? "active" : ""}`}
                  onClick={() => setWireTab("response")}
                >
                  Model Response
                </button>
                <button
                  className="wire-copy-btn"
                  onClick={() => {
                    const dataToCopy = wireTab === "request"
                      ? decisionHistory?.rawRequest || { note: "Awaiting next decision tick" }
                      : decisionHistory?.rawResponse || { note: "Awaiting next decision tick" };
                    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>

              <div className="wire-display-container">
                <pre className="wire-json-code">
                  {JSON.stringify(
                    wireTab === "request"
                      ? decisionHistory?.rawRequest ?? {
                          endpoint: "POST https://api.openai.com/v1/decisions",
                          model: selectedModel,
                          status: isEvaluating ? "TRANSMITTING WIRE PAYLOAD..." : "STANDBY (READY)",
                        }
                      : decisionHistory?.rawResponse ?? {
                          status: isEvaluating ? "WAITING FOR RESPONSE..." : "STANDBY (READY)",
                          choice: decisionHistory?.chosenAction || "PENDING",
                        },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
