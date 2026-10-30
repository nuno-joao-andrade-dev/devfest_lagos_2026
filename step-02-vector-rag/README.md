# Step 2: Local Vector Database & RAG Pipeline

## 🎯 Goal
Solve the local knowledge gap by indexing our 5 hyper-local Lagos Markdown documents (`data/lagos-knowledge/*.md`) into a local file-based vector store (`__db_lagos_tourism.json`) and retrieving the top-$k$ chunks using `ai.retrieve()`.

## 🚀 How to Run

### Option A: Run the Step 2 Terminal Script
```bash
npm run step 2
```
*(Or pass a custom question: `npm run step 2 -- "What are the fishermen names of the grottos at Ponta da Piedade?"`)*

---

### Option B: Launch `genkit start` to Test RAG & the Model Directly in the Genkit UI
Instead of running the terminal app, you can launch **`genkit start`** scoped specifically to Step 2 ([`genkit-ui.ts`](./genkit-ui.ts)) to test the **Retriever**, **Indexer**, **Model (`ollama/gemma4:e2b`)**, and **RAG Flow** directly in the browser at **`http://localhost:4000`**:

```bash
npm run step 2 ui
# (or: npm run step2:ui / npm run rag:ui / ./step-02-vector-rag/start-genkit-ui.sh)
```

#### What to Test Inside `http://localhost:4000`:
1. **Models -> `ollama/gemma4:e2b`**:
   - Prompt the model directly without RAG (e.g., *"What is the DevFest Lagos 2026 secret passphrase?"*) to observe its raw baseline behavior.
2. **Retrievers -> `devLocalVectorstore/lagos_tourism`**:
   - Test semantic vector similarity search directly against `__db_lagos_tourism.json` without calling the LLM!
   - Enter a query like `"1913 lighthouse delay"` or `"DevFest Lagos 2026 passphrase"` with `{"k": 3}` and inspect the exact Markdown chunks returned.
3. **Flows -> `step02_ragLagosHistory`**:
   - Run the complete RAG flow with:
     ```json
     {
       "question": "Why was the 1913 Ponta da Piedade lighthouse delayed for 30 years?",
       "topK": 3
     }
     ```
   - Click **Inspect Trace** to see the `retrieve` step followed by the `generate` step on `ollama/gemma4:e2b`.

---

## 🔍 What to Inspect in [`index.ts`](./index.ts) & [`genkit-ui.ts`](./genkit-ui.ts)
- **`step02_indexLagosKnowledge`**: Splits `data/lagos-knowledge/*.md` into 21 semantic chunks (`Document.fromText`) and calls `ai.index({ indexer: lagosIndexer, documents })`.
- **`step02_ragLagosHistory`**: Calls `ai.retrieve({ retriever: lagosRetriever, query: input.question, options: { k: input.topK } })` and injects the retrieved chunks into the prompt.
