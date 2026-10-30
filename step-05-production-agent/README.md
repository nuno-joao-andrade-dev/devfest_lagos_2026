# Step 5: Production-Ready Local Agent Execution (`step-05-production-agent`)

### Run This Step
```bash
# Run the automated 2-turn stateful production agent verification:
npm run step 5
# or: npm run step5

# Launch the interactive multi-turn terminal chat with Capitão Gil:
npm run step 5 interactive
```

### What Happens in This Step
1. Takes our local **Agentic RAG** pipeline from Step 4 to production readiness ([`step05_productionLagosAgent`](./index.ts)):
   - **Multi-Turn Session Memory**: Passes prior conversation `history` (`MessageData[]`) into `ai.generate()` so visitors can ask natural follow-up questions.
   - **Loop Guardrails**: Enforces `maxTurns: 5` and strict Zod input validation (`min(2).max(1000)`).
   - **Observability & Telemetry**: Emits structured execution metrics (`latencyMs`, `toolCallCount`, `historyMessageCount`, `weatherScenarioUsed`, and full tool invocation traces).
2. Executes a 2-turn conversation out of the box:
   - **Turn 1**: Retrieves the DevFest Lagos 2026 secret passphrase (`CARAVELA-GEMMA-2026`), checks the 2.4m Atlantic swell at Ponta da Piedade, warns that kayaking is unsafe, and suggests land alternatives.
   - **Turn 2**: Follows up using multi-turn conversation memory to ask about the traditional foil-wrapped Lagos conventual sweet (**Dom Rodrigo**).
