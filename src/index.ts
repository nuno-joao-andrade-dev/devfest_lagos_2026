import 'dotenv/config';
import {
  EMBEDDING_MODEL,
  GEMMA_MODEL,
  OLLAMA_SERVER_ADDRESS,
} from './config/genkit.js';

// Export all 5 Progressive Workshop Step Flows & Tools for the Genkit Developer UI
export { step01_basicLagosPrompt } from '../step-01-basic-prompt/index.js';
export {
  step02_indexLagosKnowledge,
  step02_ragLagosHistory,
} from '../step-02-vector-rag/index.js';
export {
  findLagosTours,
  getLagosWeatherAndMarine,
  step03_weatherAndTourAdvisor,
} from '../step-03-custom-tools/index.js';
export {
  searchLagosKnowledge,
  step04_agenticRagFlow,
} from '../step-04-agentic-rag/index.js';
export { step05_productionLagosAgent } from '../step-05-production-agent/index.js';

console.log('================================================================');
console.log(' DevFest Lagos 2026 | Gemma 4 & Genkit Lagos Tourism Agent');
console.log('================================================================');
console.log(` Ollama Server   : ${OLLAMA_SERVER_ADDRESS}`);
console.log(` Gemma Model     : ollama/${GEMMA_MODEL}`);
console.log(` Embedder Model  : ${EMBEDDING_MODEL} (with 768d local fallback)`);
console.log(` Weather Mode    : ${process.env.WEATHER_MODE || 'live'}`);
console.log('----------------------------------------------------------------');
console.log(' Registered Flows: step01 .. step05');
console.log(' Registered Tools: getLagosWeatherAndMarine, findLagosTours, searchLagosKnowledge');
console.log('================================================================\n');
