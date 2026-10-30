# Step 1: Static Prompts & Structured Output (`step-01-basic-prompt`)

### Run This Step
```bash
npm run step 1
# or: npm run step1
```

### What Happens in This Step
1. Connects **Google Genkit** to your local **Ollama** instance running **`gemma4:e2b`**.
2. Defines [`step01_basicLagosPrompt`](./index.ts) using `ai.defineFlow()` with strict **Zod** input and output schemas (`BasicLagosInputSchema` / `BasicLagosOutputSchema`).
3. Sends a multi-part question about **Ponta da Piedade** (the 1913 lighthouse delay, the DevFest Lagos 2026 secret passphrase, and current kayak sea safety).
4. Demonstrates **why static prompts aren't enough**: while `gemma4:e2b` returns valid structured JSON, it lacks hyper-local historical context and cannot inspect real-time Atlantic weather.
