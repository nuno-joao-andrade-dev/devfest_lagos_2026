import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'genkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOURS_JSON_PATH = path.resolve(__dirname, '../../data/lagos-tours.json');

export const TourCategorySchema = z.enum([
  'all',
  'kayak',
  'boat',
  'land_outdoor',
  'culture_indoor',
]);

export const LagosTourSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['kayak', 'boat', 'land_outdoor', 'culture_indoor']),
  requiresCalmSea: z.boolean(),
  maxWindKmh: z.number(),
  maxGustKmh: z.number(),
  maxWaveMeters: z.number(),
  departurePoint: z.string(),
  durationHours: z.number(),
  priceEur: z.number(),
  schedule: z.array(z.string()),
  highlights: z.array(z.string()),
  safetyNotes: z.string(),
});

export type LagosTour = z.infer<typeof LagosTourSchema>;

export function loadAllLagosTours(): LagosTour[] {
  const raw = fs.readFileSync(TOURS_JSON_PATH, 'utf-8');
  return JSON.parse(raw) as LagosTour[];
}

/**
 * Filters local Lagos tours by category and (optionally) live wind/wave conditions,
 * annotating each tour with whether it is currently safe to operate.
 */
export function searchLagosTours(params: {
  category?: z.infer<typeof TourCategorySchema>;
  currentWindKmh?: number;
  currentWaveMeters?: number;
  onlySafeTours?: boolean;
}) {
  const allTours = loadAllLagosTours();
  const category = params.category || 'all';

  const evaluated = allTours
    .filter((t) => (category === 'all' ? true : t.category === category))
    .map((tour) => {
      const windOk =
        params.currentWindKmh === undefined ||
        params.currentWindKmh <= tour.maxWindKmh;
      const waveOk =
        params.currentWaveMeters === undefined ||
        params.currentWaveMeters <= tour.maxWaveMeters;
      const isCurrentlySafe = windOk && waveOk;

      let statusNote = 'Available & safe under normal conditions.';
      if (!isCurrentlySafe) {
        const reasons: string[] = [];
        if (!windOk && params.currentWindKmh !== undefined) {
          reasons.push(
            `current wind (${params.currentWindKmh} km/h) exceeds tour limit (${tour.maxWindKmh} km/h)`
          );
        }
        if (!waveOk && params.currentWaveMeters !== undefined) {
          reasons.push(
            `current wave height (${params.currentWaveMeters}m) exceeds tour limit (${tour.maxWaveMeters}m)`
          );
        }
        statusNote = `SUSPENDED due to sea conditions: ${reasons.join(' and ')}.`;
      } else if (
        params.currentWindKmh !== undefined ||
        params.currentWaveMeters !== undefined
      ) {
        statusNote =
          'SAFE TO OPERATE under current Lagos wind and sea conditions.';
      }

      return {
        ...tour,
        isCurrentlySafe,
        operationalStatus: statusNote,
      };
    });

  if (params.onlySafeTours) {
    return evaluated.filter((t) => t.isCurrentlySafe);
  }

  return evaluated;
}
