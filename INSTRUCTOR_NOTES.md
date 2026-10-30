# Instructor Notes & Run-of-Show — Nuno Andrade
**Workshop: Crafting a Lagos Tourism Agent with Gemma & Genkit (DevFest Lagos 2026)**

---

## ⏱️ 90-Minute Workshop Run-of-Show

| Time | Segment | Command to Run Live | Key Teaching Point |
| :--- | :--- | :--- | :--- |
| **00:00 - 00:10** | Welcome & Architecture | `npm run verify` | Why local `gemma4:e2b` + Genkit TypeScript? Zero API cost, privacy, deterministic tool schemas. |
| **00:10 - 00:22** | **Step 1**: Static Prompt Baseline | `npm run step 1` | Show `step-01-basic-prompt/index.ts`. Highlight how `gemma4:e2b` cannot know live Atlantic swell or specific Ponta da Piedade sea stack names. |
| **00:22 - 00:38** | **Step 2**: Local Vector RAG | `npm run step 2` | Open `step-02-vector-rag/index.ts`. Show `Document.fromText()`, `ai.index()`, and `ai.retrieve()` grounding answers in `data/lagos-knowledge/*.md`. |
| **00:38 - 00:58** | **Step 3**: Custom TypeScript Tools | `npm run step 3 -- calm`<br>`npm run step 3 -- nortada_windy` | Open `step-03-custom-tools/index.ts`. Show `getLagosWeatherAndMarine` & `findLagosTours`. Watch Gemma pivot from kayaking to the cliff boardwalk when Nortada winds hit 28 km/h! |
| **00:58 - 01:15** | **Step 4**: Agentic RAG | `npm run step 4` | Open `step-04-agentic-rag/index.ts`. Show `searchLagosKnowledge` as an autonomous tool alongside weather & tour tools. |
| **01:15 - 01:30** | **Step 5**: Production Agent & UI | `npm run step 5`<br>`npm run step 5 -- interactive`<br>`npm run ui` | Open `step-05-production-agent/index.ts`. Show multi-turn memory, `LagosAgentResponseSchema`, safety guardrails, and inspect traces in Genkit UI (`http://localhost:4000`). |

---

## 🎯 Quick Demo Commands Cheat Sheet

```bash
# Run any step directly:
npm run step 1
npm run step 2
npm run step 3
npm run step 4
npm run step 5

# Compare calm vs. windy weather in Step 3 or Step 4:
npm run step 3 -- calm
npm run step 3 -- nortada_windy
npm run step 3 -- atlantic_swell

# Interactive CLI chat in Step 5:
npm run step 5 -- interactive

# Open Genkit Developer UI (http://localhost:4000):
npm run ui
```

---

## 🛡️ Offline / Conference Wi-Fi Resilience
- **100% Local LLM & Vector Store**: `gemma4:e2b` runs locally in Ollama and `__db_lagos_tourism.json` is stored on disk with a built-in 768-dim local cosine embedder fallback in `src/config/genkit.ts`.
- **Weather API Fallback**: `getLagosWeatherAndMarine` calls live Open-Meteo APIs when online, and automatically falls back to realistic Lagos marine telemetry if conference Wi-Fi drops—or when you pass `calm`, `nortada_windy`, or `atlantic_swell`.
