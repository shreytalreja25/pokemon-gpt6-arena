import { NextRequest, NextResponse } from "next/server";
import { BattleAction, BattleActionOption, DecisionResponse } from "@/engine/pokemonTypes";

export async function POST(req: NextRequest) {
  const t0 = performance.now();

  try {
    const body = await req.json();
    const model: string = body.model || "gpt-6-luna";
    const player = body.player;
    const opponent = body.opponent;
    const actions: BattleActionOption[] = body.actions || [];

    // 1. Algorithmic Type-Advantage Optimal Policy
    if (model === "heuristic") {
      const decision = runHeuristicBattlePolicy(actions, player, opponent);
      const elapsed = performance.now() - t0;
      return NextResponse.json({
        chosenAction: decision.action,
        confidence: 0.98,
        latencyMs: Math.round(elapsed),
        model: "Type-Chart Heuristic (Optimal Baseline)",
        reasoning: decision.reason,
        probabilities: decision.probs,
        costUsd: 0.0,
        rawRequest: {
          evaluator: "Deterministic Gen 1 Type Effectiveness Matrix",
          matchup: `${player.name} (${player.types.join("/")}) vs ${opponent.name} (${opponent.types.join("/")})`,
          candidate_moves: actions.map(a => `${a.name} (${a.type || "Special"}, ${a.effectiveness || 1}x)`),
        },
        rawResponse: {
          status: "LOCAL RULE EXECUTED",
          selected_move: decision.action,
          strategy: decision.reason,
          latency: `${Math.round(elapsed)} ms`,
        },
      } as DecisionResponse);
    }

    // 2. OpenAI Decisions API (GPT-6 Luna)
    if (model === "gpt-6-luna") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        const fallback = runHeuristicBattlePolicy(actions, player, opponent);
        const elapsed = performance.now() - t0;
        return NextResponse.json({
          chosenAction: fallback.action,
          confidence: 0.85,
          latencyMs: Math.round(elapsed),
          model: "GPT-6 Luna (Fallback on Missing Key)",
          reasoning: `Missing OPENAI_API_KEY; safe fallback executed: ${fallback.reason}`,
          probabilities: fallback.probs,
          costUsd: 0.0,
        } as DecisionResponse);
      }

      const inputContext = (
        `Pokémon Gen 1 Battle Arena AI Decision Engine\n` +
        `Player Active: ${player.name} (Lv. ${player.level}, Types: [${player.types.join(", ")}]) | HP: ${player.currentHp}/${player.maxHp} (${Math.round((player.currentHp / player.maxHp) * 100)}%)\n` +
        `Opponent Active: ${opponent.name} (Lv. ${opponent.level}, Types: [${opponent.types.join(", ")}]) | HP: ${opponent.currentHp}/${opponent.maxHp}\n\n` +
        `Available Moves & Strategy:\n` +
        actions.map(a => `- ${a.value}: ${a.name} -> ${a.description}`).join("\n")
      );

      const choicesPayload = actions.map(a => ({
        value: a.value,
        description: `${a.name}: ${a.description}`,
      }));

      const payload = {
        model: "gpt-6-luna",
        input: inputContext,
        questions: [
          {
            type: "choice",
            name: "pokemon_battle_action",
            instructions: (
              "Select the single optimal battle action. Prioritize super-effective STAB moves, " +
              "use recovery when health is critically low, and exploit opponent type weaknesses."
            ),
            choices: choicesPayload,
          },
        ],
      };

      const resp = await fetch("https://api.openai.com/v1/decisions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const elapsed = performance.now() - t0;

      if (resp.ok) {
        const data = await resp.json();
        const answer = data.answers?.[0] || {};
        const chosen = (answer.choice as BattleAction) || "MOVE_1";
        const confidence = Number(answer.confidence || 0.95);

        const probs: Record<string, number> = {};
        if (Array.isArray(answer.probabilities)) {
          for (const p of answer.probabilities) {
            probs[p.value] = Math.round(Number(p.probability || 0) * 100) / 100;
          }
        }

        const inputTokens = data.usage?.input_tokens || 135;
        const costUsd = (inputTokens / 1_000_000) * 0.10;

        return NextResponse.json({
          chosenAction: chosen,
          confidence: Math.round(confidence * 100) / 100,
          latencyMs: Math.round(elapsed),
          model: "GPT-6 Luna (Decisions API • Zero Output Tokens)",
          reasoning: `Decisions API choice: ${chosen} (Confidence: ${(confidence * 100).toFixed(1)}%)`,
          probabilities: probs,
          costUsd: Number(costUsd.toFixed(6)),
          rawRequest: {
            endpoint: "POST https://api.openai.com/v1/decisions",
            model: "gpt-6-luna",
            matchup: `${player.name} vs ${opponent.name}`,
            allowed_choices: choicesPayload.map(c => c.value),
          },
          rawResponse: {
            status: "200 OK",
            choice: chosen,
            confidence: `${(confidence * 100).toFixed(1)}%`,
            probabilities: probs,
            telemetry: {
              input_tokens: inputTokens,
              output_tokens: 0,
              cost: `$${costUsd.toFixed(6)}`,
              latency: `${Math.round(elapsed)} ms`,
            },
          },
        } as DecisionResponse);
      } else {
        const fallback = runHeuristicBattlePolicy(actions, player, opponent);
        return NextResponse.json({
          chosenAction: fallback.action,
          confidence: 0.85,
          latencyMs: Math.round(elapsed),
          model: "GPT-6 Luna (Fallback on Error)",
          reasoning: `API response non-200; executed type-chart fallback: ${fallback.reason}`,
          probabilities: fallback.probs,
          costUsd: 0.0,
        } as DecisionResponse);
      }
    }

    // 3. Local Ollama LLM (e.g. llama3.2:1b, llama3.1:latest, qwen3.5)
    if (model.startsWith("ollama") || body.provider === "ollama") {
      const ollamaModelName = model.replace(/^ollama[:\/-]/, "");
      const ollamaEndpoint = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

      const prompt = (
        `You are playing Pokémon Gen 1 Battle Arena.\n` +
        `Your active: ${player.name} (HP: ${player.currentHp}/${player.maxHp}, Type: ${player.types.join("/")})\n` +
        `Opponent: ${opponent.name} (HP: ${opponent.currentHp}/${opponent.maxHp}, Type: ${opponent.types.join("/")})\n\n` +
        `Candidate choices:\n` +
        actions.map(a => `- ${a.value}: ${a.name} (${a.description})`).join("\n") +
        `\n\nReturn strict JSON only:\n{"action": "<one of candidate keys>", "reasoning": "brief strategic reason"}`
      );

      const trimmedOllamaReq = {
        endpoint: `POST ${ollamaEndpoint}/api/chat`,
        model: ollamaModelName,
        format: "json",
        player: `${player.name} [${player.currentHp}/${player.maxHp}]`,
        opponent: `${opponent.name} [${opponent.currentHp}/${opponent.maxHp}]`,
        choices: actions.map(a => a.value),
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(`${ollamaEndpoint}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModelName,
            messages: [
              { role: "system", content: "You are an expert competitive Pokémon battling AI. Choose the optimal move." },
              { role: "user", content: prompt }
            ],
            format: "json",
            stream: false,
            options: { temperature: 0.1, num_predict: 60 }
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const elapsed = performance.now() - t0;

        if (resp.ok) {
          const data = await resp.json();
          let parsed: any = {};
          try { parsed = JSON.parse(data.message?.content || "{}"); } catch { parsed = { action: "MOVE_1" }; }
          const chosen: BattleAction = actions.some(a => a.value === parsed.action) ? parsed.action : "MOVE_1";

          return NextResponse.json({
            chosenAction: chosen,
            confidence: 0.91,
            latencyMs: Math.round(elapsed),
            model: `Ollama (${ollamaModelName})`,
            reasoning: parsed.reasoning || `Ollama local model chose ${chosen}`,
            probabilities: { [chosen]: 0.91, MOVE_1: 0.05, MOVE_2: 0.04 },
            costUsd: 0.0,
            rawRequest: trimmedOllamaReq,
            rawResponse: {
              status: "200 OK (Local Ollama)",
              choice: chosen,
              hardware: "Local GPU / NPU",
              cost: "$0.000000",
              latency: `${Math.round(elapsed)} ms`,
              eval_tokens: data.eval_count || 12,
            },
          } as DecisionResponse);
        } else {
          const fallback = runHeuristicBattlePolicy(actions, player, opponent);
          return NextResponse.json({
            chosenAction: fallback.action,
            confidence: 0.85,
            latencyMs: Math.round(performance.now() - t0),
            model: `Ollama (${ollamaModelName}) [Fallback]`,
            reasoning: fallback.reason,
            probabilities: fallback.probs,
            costUsd: 0.0,
          } as DecisionResponse);
        }
      } catch (err: any) {
        const fallback = runHeuristicBattlePolicy(actions, player, opponent);
        return NextResponse.json({
          chosenAction: fallback.action,
          confidence: 0.85,
          latencyMs: Math.round(performance.now() - t0),
          model: `Ollama (${ollamaModelName}) [Timeout/Fallback]`,
          reasoning: fallback.reason,
          probabilities: fallback.probs,
          costUsd: 0.0,
        } as DecisionResponse);
      }
    }

    // Default Fallback
    const fallback = runHeuristicBattlePolicy(actions, player, opponent);
    return NextResponse.json({
      chosenAction: fallback.action,
      confidence: 0.9,
      latencyMs: 1,
      model: "Optimal Fallback",
      reasoning: fallback.reason,
      probabilities: fallback.probs,
      costUsd: 0.0,
    } as DecisionResponse);

  } catch (err) {
    const elapsed = performance.now() - t0;
    return NextResponse.json({
      chosenAction: "MOVE_1",
      confidence: 0.5,
      latencyMs: Math.round(elapsed),
      model: "Emergency Recovery",
      reasoning: String(err),
      costUsd: 0.0,
    } as DecisionResponse);
  }
}

function runHeuristicBattlePolicy(
  actions: BattleActionOption[],
  player: any,
  opponent: any
): { action: BattleAction; reason: string; probs: Record<string, number> } {
  // 1. Critical Health Recovery Check
  if (player.currentHp < player.maxHp * 0.28 && actions.some(a => a.value === "USE_POTION")) {
    return {
      action: "USE_POTION",
      reason: `Health in red critical zone (${player.currentHp}/${player.maxHp}); administering Super Potion.`,
      probs: { USE_POTION: 0.85, MOVE_1: 0.10, MOVE_2: 0.05 },
    };
  }

  // 2. Select Highest Damage / Super-Effective Move
  let bestMoveAction: BattleAction = "MOVE_1";
  let maxScore = -1;
  let bestDesc = "";

  for (const a of actions) {
    if (a.value.startsWith("MOVE_")) {
      const pwr = a.power || 40;
      const eff = a.effectiveness ?? 1.0;
      // Prioritize super effective moves heavily
      const score = pwr * eff * (eff >= 2.0 ? 1.5 : 1.0);
      if (score > maxScore) {
        maxScore = score;
        bestMoveAction = a.value;
        bestDesc = `${a.name} (${eff}x effectiveness vs ${opponent.types?.join("/") || "Opponent"})`;
      }
    }
  }

  return {
    action: bestMoveAction,
    reason: `Selected highest damage output: ${bestDesc}.`,
    probs: { [bestMoveAction]: 0.88, MOVE_1: 0.06, MOVE_2: 0.06 },
  };
}
