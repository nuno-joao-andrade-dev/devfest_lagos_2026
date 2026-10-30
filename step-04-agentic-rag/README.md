# Step 4: Autonomous Agentic RAG (`searchLagosKnowledge` + Live Tools)

## 🎯 Goal
Upgrade from static RAG (which retrieves on every single turn) to **Agentic RAG** by wrapping our local vector retriever inside a custom Genkit tool (`searchLagosKnowledge`) alongside `getLagosWeatherAndMarine` and `findLagosTours`.

## 🚀 How to Run

### Option A: Run the Step 4 Terminal Script
```bash
npm run step 4
```
*(Or test under windy Nortada conditions: `npm run step 4 -- nortada_windy`)*

---

### Option B: Launch `genkit start` to Test the RAG Tool & Model Directly in the Genkit UI
Launch **`genkit start`** scoped to Step 4 ([`genkit-ui.ts`](./genkit-ui.ts)) to test the **`searchLagosKnowledge` tool**, the **`ollama/gemma4:e2b` model**, and **`step04_agenticRagFlow`** directly in the Genkit Developer UI (`http://localhost:4000`):

```bash
npm run step 4 ui
# (or: npm run step4:ui / ./step-04-agentic-rag/start-genkit-ui.sh)
```

#### What to Test Inside `http://localhost:4000`:
1. **Tools -> `searchLagosKnowledge`**:
   - Test the Agentic RAG tool directly in isolation with:
     ```json
     {
       "query": "Ponta da Piedade 1913 lighthouse and A Cozinha grotto",
       "topK": 3
     }
     ```
2. **Models -> `ollama/gemma4:e2b`**:
   - Attach `searchLagosKnowledge` and `getLagosWeatherAndMarine` directly to the model in the UI playground and watch `gemma4:e2b` emit tool calls.
3. **Flows -> `step04_agenticRagFlow`**:
   - Run the autonomous Agentic RAG flow and inspect the multi-step trace in the UI.
