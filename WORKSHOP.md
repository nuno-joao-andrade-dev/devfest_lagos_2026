# Workshop Guide: Crafting a Lagos Tourism Agent with Gemma & Genkit
**DevFest Lagos, Portugal 2026 — Hands-On Walkthrough**

Welcome! In this workshop, every step is organized in its own folder (`step-01-basic-prompt/` through `step-05-production-agent/`) with complete, working code. Your workflow for each step is:

1. **Read & inspect** the `index.ts` file inside that step's folder.
2. **Execute** the step from your terminal with `npm run step <number>`.
3. **Experiment** with custom prompts, weather scenarios, or inspect traces in `npm run ui`.

---

## Step 1: The Limits of Static Prompts (`step-01-basic-prompt/`)

- **Code**: [`step-01-basic-prompt/index.ts`](./step-01-basic-prompt/index.ts)
- **Run Command**:
  ```bash
  npm run step 1
  ```
- **Try a custom question**:
  ```bash
  npm run step 1 -- "What did locals name the sea stacks at Ponta da Piedade and can I kayak right now?"
  ```

### Key Takeaways
- `ai.defineFlow()` wraps our LLM call in an observable, strongly-typed Genkit trace.
- Even a capable local model like **`gemma4:e2b`** cannot know live Atlantic swell/wind conditions at *Ponta da Piedade* (`37.0805° N, 8.6694° W`), and may guess or omit hyper-local rock formation folklore (*A Catedral*, *A Cozinha*, *O Camelo*, *O Submarino*, *Gruta dos Amores*).

---

## Step 2: Grounding with Local Vector RAG (`step-02-vector-rag/`)

- **Code**: [`step-02-vector-rag/index.ts`](./step-02-vector-rag/index.ts) & [`step-02-vector-rag/genkit-ui.ts`](./step-02-vector-rag/genkit-ui.ts)
- **Run Terminal App**:
  ```bash
  npm run step 2
  ```
- **Launch `genkit start` to Test the RAG Retriever & Model Directly in the UI (`http://localhost:4000`)**:
  ```bash
  npm run step 2 ui
  # (or: npm run step2:ui / npm run rag:ui / ./step-02-vector-rag/start-genkit-ui.sh)
  ```
  Inside the Genkit Developer UI (`http://localhost:4000`), you can test each component directly without running the CLI app:
  1. **Models -> `ollama/gemma4:e2b`**: Test raw prompts directly on the local model.
  2. **Retrievers -> `devLocalVectorstore/lagos_tourism`**: Query the local vector store directly (e.g., `"1913 lighthouse"` or `"DevFest Lagos 2026 passphrase"`) to inspect the top-$k$ retrieved Markdown chunks.
  3. **Flows -> `step02_ragLagosHistory`**: Run the RAG flow and inspect the `retrieve` + `generate` trace.

### How It Works
1. **`step02_indexLagosKnowledge`** reads the 5 Markdown files in `data/lagos-knowledge/`, splits them by `##` headings into 21 semantic `Document.fromText(text, metadata)` chunks, and indexes them into `__db_lagos_tourism.json` using `ai.index({ indexer: lagosIndexer, documents })`.
2. **`step02_ragLagosHistory`** calls `ai.retrieve({ retriever: lagosRetriever, query, options: { k: 4 } })` and injects the retrieved chunks into the prompt with source citations.

### Limitation of Static RAG
Fixed RAG retrieves documents on *every* turn—even if the user just says `"Bom dia!"`—and still cannot check live weather or filter tour availability.

---

## Step 3: Giving Gemma Hands with Custom TypeScript Tools (`step-03-custom-tools/`)

- **Code**: [`step-03-custom-tools/index.ts`](./step-03-custom-tools/index.ts)
- **Run Commands**:
  ```bash
  # Live weather from Open-Meteo Forecast + Marine APIs:
  npm run step 3

  # Simulate calm morning conditions (10 km/h wind, 0.5m swell):
  npm run step 3 -- calm

  # Simulate strong afternoon Nortada winds (28 km/h wind, 39 km/h gusts):
  npm run step 3 -- nortada_windy

  # Simulate heavy Atlantic swell (2.3m waves, 13s period):
  npm run step 3 -- atlantic_swell
  ```

### How It Works
We define two Genkit tools with `ai.defineTool()`:
1. **`getLagosWeatherAndMarine`**: Queries Open-Meteo for real-time wind speed, wind gusts, wave height, and sea surface temperature at Ponta da Piedade (`37.0805° N, 8.6694° W`), computing a deterministic `kayakSafetyVerdict` (`SAFE`, `CAUTION`, or `UNSAFE`).
2. **`findLagosTours`**: Filters `data/lagos-tours.json` against the current wind (`maxWindKmh`) and wave (`maxWaveHeightM`) limits.
- When `nortada_windy` or `atlantic_swell` is active, sea cave kayaking is flagged as `UNSAFE`, and Gemma automatically recommends the *Passadiços da Ponta da Piedade* cliff boardwalk hike or an Old Town cultural & gastronomy tour (`Dom Rodrigo`, `Convento Menu`).

---

## Step 4: Agentic RAG — Combining Vector Retrieval & Dynamic Tools (`step-04-agentic-rag/`)

- **Code**: [`step-04-agentic-rag/index.ts`](./step-04-agentic-rag/index.ts)
- **Run Commands**:
  ```bash
  # Default multi-tool test (Calm scenario + Historical question + Kayak recommendation):
  npm run step 4

  # Same question under strong afternoon Nortada winds:
  npm run step 4 -- nortada_windy
  ```

### How It Works
Instead of hardcoding `ai.retrieve()` before every prompt, we wrap the local vector store inside a Genkit tool: **`searchLagosKnowledge`**.
Now `gemma4:e2b` has **3 tools**:
- `searchLagosKnowledge` (Local Vector DB)
- `getLagosWeatherAndMarine` (Live Weather & Marine API)
- `findLagosTours` (Safety-Filtered Local Tours)

Gemma autonomously decides which tools to call based on user intent—calling `searchLagosKnowledge` for history/geology questions, and chaining `getLagosWeatherAndMarine` + `findLagosTours` when asked about outdoor activities.

---

## Step 5: From Prototype to Production-Ready Local Agent (`step-05-production-agent/`)

- **Code**: [`step-05-production-agent/index.ts`](./step-05-production-agent/index.ts)
- **Run Commands**:
  ```bash
  # Run the automated 2-turn conversation + structured JSON verification:
  npm run step 5

  # Launch the interactive multi-turn CLI concierge:
  npm run step 5 -- interactive
  ```

### What Makes Step 5 Production-Ready?
1. **Multi-Turn Session Memory**: Maintains conversation history across turns (`history`) so follow-up questions remember context.
2. **Structured Output (`LagosAgentResponseSchema`)**: Uses Zod schema validation (`reply`, `safetyLevel`, `recommendedTourIds`, `sourcesCited`, `toolsUsed`, `followUpSuggestions`) so any downstream UI or API receives guaranteed JSON fields.
3. **Deterministic Safety Guardrail**: Cross-checks the LLM's `safetyLevel` against the live marine sensor verdict so an `UNSAFE` sea condition is never downgraded.
4. **Execution Telemetry**: Reports latency (`latencyMs`) and exact tools invoked per turn.
