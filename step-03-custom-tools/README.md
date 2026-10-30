# Step 3: Custom TypeScript Tools for Autonomous Decisions (`step-03-custom-tools`)

### Run This Step
```bash
npm run step 3
# or: npm run step3

# Optional: test a specific weather scenario (live | calm | nortada_windy | atlantic_swell)
npm run step 3 calm
npm run step 3 atlantic_swell
```

### What Happens in This Step
1. Defines two custom TypeScript tools using `ai.defineTool()`:
   - [`getLagosWeatherAndMarine`](./index.ts): Queries the real-time **Open-Meteo Weather & Marine API** for Ponta da Piedade (`37.0805° N, 8.6694° W`) and evaluates *Capitania do Porto de Lagos* kayak safety rules.
   - [`findLagosTours`](./index.ts): Filters local Lagos kayak, grotto boat, cliff boardwalk, and Old Town cultural tours against current wind and wave thresholds.
2. Executes [`step03_weatherAndTourAdvisor`](./index.ts) across both **`live`** (real-time Open-Meteo data) and **`nortada_windy`** (`44 km/h` offshore Nortada gusts) scenarios so you can see **`gemma4:e2b`** autonomously change its recommendation from water tours to the *Passadiços da Ponta da Piedade* cliffside boardwalks!
