---
marp: true
theme: default
paginate: true
backgroundColor: #F8F9FA
backgroundImage: url('./ponta-da-piedade-watermark.svg')
backgroundSize: cover
color: #202124
header: "DevFest Lagos, Portugal 2026 • Crafting a Lagos Tourism Agent with Gemma & Genkit"
footer: "Nuno Andrade • ollama/gemma4:e2b + Google Genkit (TypeScript)"
---

# Crafting a Lagos Tourism Agent with Gemma 4 & Genkit
### DevFest Lagos, Portugal 2026 — Hands-On Workshop
**Speaker:** Nuno Andrade

Move from static prompts to autonomous local execution! Build an **Agentic RAG** pipeline in TypeScript powered by **Gemma 4 (`gemma4:e2b`)** and **Google Genkit** running 100% on your machine.

```bash
ollama pull gemma4:e2b
npm run verify
```

<!--
Speaker Notes:
Welcome everyone to DevFest Lagos 2026! Today we are moving from static prompts to autonomous local execution using Google's Genkit (TypeScript) and Gemma 4 (gemma4:e2b) running 100% locally on your laptop.
-->

---

## ⚠️ Slide 2: Why Static Prompts Fail in the Real World

Imagine a visitor at *Praia da Batata* asking your local LLM two questions in one breath:

1. **Hyper-Local Knowledge Blindness**
   > *"Why was the 1913 Ponta da Piedade lighthouse delayed for 30 years, and what is the DevFest Lagos 2026 secret passphrase?"*
   - Base LLMs guess or omit the **Ermida de Nossa Senhora da Piedade** chapel dispute and private event facts (`CARAVELA-GEMMA-2026`).

2. **Real-Time World Blindness (Safety Risk!)**
   > *"Can we take a kayak cave tour around Ponta da Piedade right now?"*
   - Static LLMs have **zero access** to live Atlantic swell (`>1.2m`) or afternoon *Nortada* wind gusts (`>20 km/h`).

---

## 🛠️ Slide 3: Setup Part 1 — Installing Node.js (v20+ LTS)

Google Genkit and our TypeScript runner (`tsx`) require **Node.js v20 or newer** (v20 LTS or v22 LTS recommended).

### 1. Install Node.js
- **macOS / Linux (`nvm`)**:
  ```bash
  nvm install 22 && nvm use 22
  # Or via Homebrew on macOS: brew install node@22
  ```
- **Windows (`winget` / `fnm`)**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```

### 2. Verify & Install Workshop Dependencies
```bash
node -v && npm -v
npm install
```

---

## 🦙 Slide 4: Setup Part 2 — Installing Ollama & Pulling `gemma4:e2b`

**Ollama** runs local LLMs as an HTTP server at `http://127.0.0.1:11434`. We use **Gemma 4 (`gemma4:e2b`)** for fast local inference & native tool calling.

### 1. Install Ollama (`https://ollama.com`)
- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`
- **macOS:** `brew install --cask ollama` *(or download `.dmg`)*
- **Windows:** `winget install Ollama.Ollama`

### 2. Pull `gemma4:e2b` & Verify Setup
```bash
# Pull the local Gemma 4 E2B model:
ollama pull gemma4:e2b

# Confirm model & run workshop pre-flight check:
ollama list
npm run verify
```

---

## 🗺️ Slide 5: 5 Self-Contained Steps — Ready to Run!

Every step lives in its own completed folder. Inspect the code and run `npm run step <1..5>`:

| Step | Folder | Command | Focus |
| :--- | :--- | :--- | :--- |
| **Step 1** | `step-01-basic-prompt/` | `npm run step 1` | Static Prompt & Structured Zod Output Baseline |
| **Step 2** | `step-02-vector-rag/` | `npm run step 2` / `npm run step 2 ui` | Local Vector Store (`__db_lagos_tourism.json`) & Grounded RAG |
| **Step 3** | `step-03-custom-tools/` | `npm run step 3` | Live Open-Meteo Weather & Tour Safety Filter Tools |
| **Step 4** | `step-04-agentic-rag/` | `npm run step 4` / `npm run step 4 ui` | Autonomous Agentic RAG (`searchLagosKnowledge` tool) |
| **Step 5** | `step-05-production-agent/` | `npm run step 5` | Multi-Turn Memory, Safety Guardrails & Interactive CLI |

---

## ⚙️ Slide 6: Configuring Genkit + Local `gemma4:e2b`

In `src/config/genkit.ts`, we wire **Ollama (`gemma4:e2b`)** and **`@genkit-ai/dev-local-vectorstore`**:

```ts
export const GEMMA_MODEL = 'gemma4:e2b';

export const ai = genkit({
  plugins: [
    ollama({
      serverAddress: 'http://127.0.0.1:11434',
      models: [{
        name: GEMMA_MODEL,
        type: 'chat',
        // CRITICAL: Unlock native tool calling for gemma4:e2b!
        supports: { tools: true },
      }],
    }),
    devLocalVectorstore([{
      indexName: 'lagos_tourism',
      embedder: gemmaEmbedder,
    }]),
  ],
});
```

---

## 🟦 Slide 7: Step 1 — Static Prompts & Structured Zod Output

File: `step-01-basic-prompt/index.ts`

```ts
export const step01_basicLagosPrompt = ai.defineFlow(
  {
    name: 'step01_basicLagosPrompt',
    inputSchema: z.object({ question: z.string() }),
    outputSchema: BasicPromptOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: gemmaModel, // ollama/gemma4:e2b
      system: 'You are Capitão Gil, a Lagos tourism guide...',
      prompt: input.question,
      output: { schema: BasicPromptOutputSchema },
    });
    return response.output!;
  }
);
```

**Live Demo:**
```bash
npm run step 1
```

---

## 🟩 Slide 8: Step 2 — Grounding with Local Vector RAG

File: `step-02-vector-rag/index.ts`

1. Splits `data/lagos-knowledge/*.md` into **21 semantic chunks** (`Document.fromText`).
2. Indexes embeddings into `__db_lagos_tourism.json` via `ai.index({ indexer: lagosIndexer, documents })`.
3. Retrieves top-$k$ chunks via cosine similarity:

```ts
const docs = await ai.retrieve({
  retriever: lagosRetriever,
  query: input.question,
  options: { k: input.topK },
});

const response = await ai.generate({
  model: gemmaModel,
  prompt: `Context:\n${formattedContext}\n\nQuestion: ${input.question}`,
});
```

**Live Demo:**
```bash
npm run step 2
```

---

## 🧪 Slide 9: Test RAG & Model Directly with `genkit start`

File: `step-02-vector-rag/genkit-ui.ts`

Test the **Model**, **Retriever**, and **RAG Flow** directly in the Genkit Developer UI (`http://localhost:4000`) instead of the terminal app:

```bash
npm run step 2 ui
# (or: npm run rag:ui)
```

1. **Models -> `ollama/gemma4:e2b`**: Prompt the raw local model without RAG.
2. **Retrievers -> `devLocalVectorstore/lagos_tourism`**: Query `"1913 lighthouse"` or `"DevFest passphrase"` and inspect retrieved Markdown chunks directly!
3. **Flows -> `step02_ragLagosHistory`**: Run the RAG flow and inspect the full trace.

---

## 🟨 Slide 10: Step 3 — Giving Gemma Hands with TypeScript Tools

File: `step-03-custom-tools/index.ts`

```ts
export const getLagosWeatherAndMarine = ai.defineTool(
  {
    name: 'getLagosWeatherAndMarine',
    description: 'Fetches real-time wind, gusts, and Atlantic wave height at Ponta da Piedade.',
    inputSchema: z.object({ scenario: WeatherScenarioSchema }),
    outputSchema: WeatherReportSchema,
  },
  async ({ scenario }) => fetchPontaDaPiedadeWeather(scenario)
);

const response = await ai.generate({
  model: gemmaModel,
  tools: [getLagosWeatherAndMarine, findLagosTours],
  prompt: input.userRequest,
});
```

**Live Demo — Calm Morning vs. Afternoon Nortada Winds:**
```bash
npm run step 3 -- calm
npm run step 3 -- nortada_windy
npm run step 3 -- atlantic_swell
```

---

## 🧠 Slide 11: Static RAG (Step 2) vs. Agentic RAG (Step 4)

| Feature | Static RAG (Step 2) | Agentic RAG (Step 4) |
| :--- | :--- | :--- |
| **Who triggers retrieval?** | Hardcoded by developer on *every* turn | Autonomously chosen by `gemma4:e2b` via `searchLagosKnowledge` tool |
| **Query formulation** | Raw user message | Focused search query extracted by the LLM |
| **Multi-tool chaining** | ❌ Cannot combine with live APIs | ✅ Chains Vector DB + Live Weather + Tour Filter |

---

## 🟧 Slide 12: Step 4 — Building the Agentic RAG Pipeline

File: `step-04-agentic-rag/index.ts`

```ts
export const searchLagosKnowledge = ai.defineTool(
  {
    name: 'searchLagosKnowledge',
    description: 'Searches the local Lagos & Ponta da Piedade vector database for history, sea caves, gastronomy, and DevFest facts.',
    inputSchema: z.object({ query: z.string(), topK: z.number().default(3) }),
  },
  async ({ query, topK }) => {
    const docs = await ai.retrieve({
      retriever: lagosRetriever,
      query,
      options: { k: topK },
    });
    return { resultsCount: docs.length, chunks: formatDocs(docs) };
  }
);
```

**Live Demo:**
```bash
npm run step 4
npm run step 4 ui
```

---

## 🟪 Slide 13: Step 5 — Taking Local Agents to Production

File: `step-05-production-agent/index.ts`

1. **Multi-Turn Conversational Memory**: Preserves `history` across turns.
2. **Deterministic Marine Safety Guardrail**: Ensures `UNSAFE_CAVES_CLOSED` is never downgraded.
3. **Execution Telemetry**: Reports `latencyMs`, `toolCallCount`, and exact tool trace per turn.
4. **Interactive CLI Concierge**: Chat live with *Capitão Gil* in your terminal!

```bash
npm run step 5
npm run step 5 -- interactive
```

---

## 🎉 Slide 14: Muito Obrigado, DevFest Lagos 2026! 🇵🇹⛵

### Quick Command Cheat Sheet
- `npm run step 1` .. `npm run step 5` — Run each workshop step
- `npm run step 2 ui` — Test Vector Retriever & `gemma4:e2b` directly in Genkit UI
- `npm run step 4 ui` — Test Agentic RAG & Tools directly in Genkit UI
- `npm run step 5 -- interactive` — Live multi-turn chat with *Capitão Gil*
- `npm run slides` — Open the interactive Workshop Slide Deck

**Questions & Live Experiments!** — *Nuno Andrade*
