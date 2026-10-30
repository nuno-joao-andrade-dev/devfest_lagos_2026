# Crafting a Lagos Tourism Agent with Gemma & Genkit
**DevFest Lagos, Portugal 2026 — Hands-On Workshop with Nuno Andrade**

- 📦 **Workshop Repository:** [https://github.com/nuno-joao-andrade-dev/devfest_lagos_2026/](https://github.com/nuno-joao-andrade-dev/devfest_lagos_2026/)
- 🖥️ **Interactive Presentation Slides:** [https://nuno-joao-andrade-dev.github.io/devfest_lagos_2026/slides/](https://nuno-joao-andrade-dev.github.io/devfest_lagos_2026/slides/) *(or run `npm run slides` locally / open [`slides/index.html`](./slides/index.html))*
- 🙏 **Special Thanks:** Huge thanks to **[GDG Lagos](https://gdg.community.dev/)** for the invitation to **DevFest Lagos 2026**!

Move from static prompts to autonomous local execution! In this workshop, you will build a local **Agentic RAG (Retrieval-Augmented Generation)** pipeline entirely on your machine using **Google's Genkit (TypeScript)** and **Gemma 4 (`gemma4:e2b`)** running locally via **Ollama**.

The workshop is organized into **5 self-contained, ready-to-run step folders**. Each step is already complete—explore the code in the step folder and execute it with `npm run step <1..5>`!

---

## 🗺️ Workshop Steps (`npm run step <1..5>`)

| Step | Folder | Run Command | Genkit UI (`genkit start`) | What It Demonstrates |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | [`step-01-basic-prompt/`](./step-01-basic-prompt/) | `npm run step 1` | `npm run step 1 ui` | **Basic Prompting**: Single-shot generation with local `gemma4:e2b` and why static prompts hallucinate hyper-local facts & live weather. |
| **Step 2** | [`step-02-vector-rag/`](./step-02-vector-rag/) | `npm run step 2` | **`npm run step 2 ui`** *(or `npm run rag:ui`)* | **Local Vector RAG**: Indexing `data/lagos-knowledge/*.md` into `__db_lagos_tourism.json` and testing the Retriever, `gemma4:e2b` Model, & RAG Flow directly in Genkit UI. |
| **Step 3** | [`step-03-custom-tools/`](./step-03-custom-tools/) | `npm run step 3` | `npm run step 3 ui` | **Custom TypeScript Tools**: Equipping Gemma with `getLagosWeatherAndMarine` (live Open-Meteo API) and `findLagosTours` for kayak safety decisions. |
| **Step 4** | [`step-04-agentic-rag/`](./step-04-agentic-rag/) | `npm run step 4` | **`npm run step 4 ui`** *(or `npm run step4:ui`)* | **Agentic RAG**: Wrapping vector retrieval inside the `searchLagosKnowledge` tool so Gemma autonomously decides *when* to query the vector DB vs. weather/tour tools. |
| **Step 5** | [`step-05-production-agent/`](./step-05-production-agent/) | `npm run step 5` | `npm run step 5 ui` | **Production Local Agent**: Multi-turn conversational memory, strict Zod structured output (`LagosAgentResponseSchema`), safety guardrails, and telemetry. |

> **Tip:** You can run any step using:
> - `npm run step 1` (or `npm run step 01`, `npm run step1`, `npm run step-01-basic-prompt`)
> - Pass a custom prompt or scenario: `npm run step 3 -- nortada_windy`
> - Launch Step 5 in interactive chat mode: `npm run step 5 -- interactive`

---

## 🛠️ Prerequisites & Quick Start

### 1. Install & Start Ollama with `gemma4:e2b`
Install [Ollama](https://ollama.com) and pull the local **Gemma 4 (`gemma4:e2b`)** model:

```bash
ollama pull gemma4:e2b
```

*(Optional)* Pull `nomic-embed-text` if you want Ollama neural embeddings; otherwise the repo automatically uses its built-in 768-dim local cosine vector embedder out-of-the-box:

```bash
ollama pull nomic-embed-text
```

### 2. Clone the Repository, Install Dependencies & Verify Setup
Requires **Node.js v20+**:

```bash
git clone https://github.com/nuno-joao-andrade-dev/devfest_lagos_2026.git
cd devfest_lagos_2026
npm install
npm run verify
```

### 3. Run the 5 Workshop Steps!

```bash
# Step 1: Basic Prompting & Hallucination Baseline
npm run step 1

# Step 2: Local Vector Store & Grounded RAG
npm run step 2

# Step 3: Custom TypeScript Tools (Live Open-Meteo Weather + Tour Filter)
npm run step 3

# Try Step 3 with simulated afternoon Nortada winds (28 km/h gusts):
npm run step 3 -- nortada_windy

# Step 4: Agentic RAG (Autonomous Vector Search + Weather + Tours)
npm run step 4

# Step 5: Production Agent (Multi-turn Memory + Structured Zod Output + Safety Guardrails)
npm run step 5

# Or chat interactively with the Step 5 Production Agent in your terminal:
npm run step 5 -- interactive
```

---

## 🖥️ Inspect Traces in the Genkit Developer UI

To visually inspect every prompt, vector retrieval chunk, tool invocation, and multi-turn trace across all 5 steps, launch the **Genkit Developer UI**:

```bash
npm run ui
```

This runs `npx genkit start -- npx tsx --watch src/index.ts` and opens **`http://localhost:4000`**, where all flows (`step01_basicLagosPrompt` through `step05_productionLagosAgent`) and tools are registered.

---

## 📂 Repository Structure

```text
devfest_gdglagos/
├── step-01-basic-prompt/           # Step 1: Static prompt baseline (npm run step 1)
│   ├── index.ts
│   └── README.md
├── step-02-vector-rag/             # Step 2: Local vector indexing & retrieval (npm run step 2)
│   ├── index.ts
│   └── README.md
├── step-03-custom-tools/           # Step 3: Live weather & tour tools (npm run step 3)
│   ├── index.ts
│   └── README.md
├── step-04-agentic-rag/            # Step 4: Autonomous Agentic RAG (npm run step 4)
│   ├── index.ts
│   └── README.md
├── step-05-production-agent/       # Step 5: Production agent + CLI chat (npm run step 5)
│   ├── index.ts
│   └── README.md
├── data/
│   ├── lagos-knowledge/            # 5 curated Markdown files on Lagos & Ponta da Piedade
│   └── lagos-tours.json            # Local kayak, boat, cliff walk & cultural tour catalog
├── src/
│   ├── config/genkit.ts            # Shared Genkit + Ollama (gemma4:e2b) + Local Vector Store config
│   ├── lib/                        # Weather API client, Tour filter, Markdown chunker, Tool helper
│   ├── scripts/
│   │   ├── run-step.ts             # Dispatcher for `npm run step <1..5>`
│   │   ├── index-knowledge.ts      # Standalone vector DB indexer (`npm run index:kb`)
│   │   └── verify-workshop.ts      # Self-test suite (`npm run verify`)
│   └── index.ts                    # Entrypoint exporting all 5 steps for `npm run ui`
├── ARTICLE.md                      # Full technical workshop article & architectural deep-dive
├── WORKSHOP.md                     # Detailed step-by-step walkthrough guide
└── INSTRUCTOR_NOTES.md             # Speaker run-of-show & live demo script for Nuno Andrade
```

---

## 🙏 Special Thanks

A huge **Muito Obrigado** to **GDG Lagos** for the warm invitation to speak and lead this hands-on workshop at **DevFest Lagos 2026** in the Algarve, and to all the organizers, volunteers, and attendees who joined the session!

- **Workshop Repository:** [https://github.com/nuno-joao-andrade-dev/devfest_lagos_2026/](https://github.com/nuno-joao-andrade-dev/devfest_lagos_2026/)
- **Interactive Presentation Slides:** [https://nuno-joao-andrade-dev.github.io/devfest_lagos_2026/slides/](https://nuno-joao-andrade-dev.github.io/devfest_lagos_2026/slides/) ([`slides/index.html`](./slides/index.html))
