import { z } from 'genkit';

/**
 * Coordinates for key coastal spots in Lagos, Portugal.
 */
export const LAGOS_COASTAL_SPOTS: Record<
  string,
  { name: string; latitude: number; longitude: number }
> = {
  ponta_da_piedade: {
    name: 'Ponta da Piedade (Sea Caves & Lighthouse)',
    latitude: 37.0805,
    longitude: -8.6694,
  },
  praia_da_batata: {
    name: 'Praia da Batata & Forte da Ponta da Bandeira',
    latitude: 37.0972,
    longitude: -8.6681,
  },
  marina_de_lagos: {
    name: 'Marina de Lagos & Meia Praia West',
    latitude: 37.1088,
    longitude: -8.6725,
  },
  praia_do_camilo: {
    name: 'Praia do Camilo & Praia Dona Ana',
    latitude: 37.0873,
    longitude: -8.6683,
  },
};

export type WeatherScenarioMode =
  | 'live'
  | 'calm'
  | 'nortada_windy'
  | 'atlantic_swell';

let runtimeWeatherModeOverride: WeatherScenarioMode | null = null;

/**
 * Allows the CLI or test scripts to dynamically switch the weather scenario
 * without restarting the process.
 */
export function setWeatherScenarioOverride(
  mode: WeatherScenarioMode | null
): void {
  runtimeWeatherModeOverride = mode;
}

export function getActiveWeatherScenario(): WeatherScenarioMode {
  if (runtimeWeatherModeOverride) {
    return runtimeWeatherModeOverride;
  }
  const envMode = (process.env.WEATHER_MODE || 'live')
    .toLowerCase()
    .trim() as WeatherScenarioMode;
  if (
    envMode === 'calm' ||
    envMode === 'nortada_windy' ||
    envMode === 'atlantic_swell'
  ) {
    return envMode;
  }
  return 'live';
}

export const KayakSafetyStatusSchema = z.enum([
  'SAFE_FOR_KAYAK',
  'CAUTION_EXPERIENCED_ONLY',
  'UNSAFE_CAVES_CLOSED',
]);

export const LagosWeatherReportSchema = z.object({
  location: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timestamp: z.string(),
  dataSource: z.string(),
  temperatureCelsius: z.number(),
  weatherCondition: z.string(),
  windSpeedKmh: z.number(),
  windGustsKmh: z.number(),
  windDirectionDegrees: z.number(),
  windDirectionCardinal: z.string(),
  isNortadaOffshoreRisk: z.boolean(),
  waveHeightMeters: z.number(),
  wavePeriodSeconds: z.number(),
  kayakSafetyStatus: KayakSafetyStatusSchema,
  kayakSafetySummary: z.string(),
  capitaniaAdvisory: z.string(),
});

export type LagosWeatherReport = z.infer<typeof LagosWeatherReportSchema>;

function degreesToCardinal(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return directions[index];
}

function wmoCodeToDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sunny Algarve sky',
    1: 'Mainly clear sky',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Coastal mist / fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    80: 'Light rain showers',
    81: 'Moderate rain showers',
    82: 'Heavy rain showers',
    95: 'Thunderstorm',
  };
  return descriptions[code] || `Weather code ${code}`;
}

/**
 * Evaluates Capitania do Porto de Lagos & local kayak operator safety rules
 * based on wind speed, gusts, wind direction, and Atlantic wave height/period.
 */
export function evaluateKayakSafety(params: {
  windSpeedKmh: number;
  windGustsKmh: number;
  windDirectionDegrees: number;
  waveHeightMeters: number;
  wavePeriodSeconds: number;
}): {
  isNortadaOffshoreRisk: boolean;
  kayakSafetyStatus: z.infer<typeof KayakSafetyStatusSchema>;
  kayakSafetySummary: string;
  capitaniaAdvisory: string;
} {
  const {
    windSpeedKmh,
    windGustsKmh,
    windDirectionDegrees,
    waveHeightMeters,
    wavePeriodSeconds,
  } = params;

  // Northerly/Northwesterly winds (290° - 360° or 0° - 30°) blow offshore at Ponta da Piedade
  const isNortherly =
    windDirectionDegrees >= 290 || windDirectionDegrees <= 30;
  const isNortadaOffshoreRisk =
    isNortherly && (windSpeedKmh > 20 || windGustsKmh > 28);

  const reasons: string[] = [];
  let status: z.infer<typeof KayakSafetyStatusSchema> = 'SAFE_FOR_KAYAK';

  if (waveHeightMeters > 1.2) {
    status = 'UNSAFE_CAVES_CLOSED';
    reasons.push(
      `Atlantic wave height (${waveHeightMeters.toFixed(1)}m) exceeds the 1.2m safe cave-entry limit`
    );
  }
  if (wavePeriodSeconds >= 12 && waveHeightMeters >= 0.9) {
    status = 'UNSAFE_CAVES_CLOSED';
    reasons.push(
      `Long-period groundswell (${wavePeriodSeconds.toFixed(0)}s) creates dangerous surge inside narrow grottos like A Cozinha and Gruta dos Amores`
    );
  }
  if (windSpeedKmh > 25 || windGustsKmh > 30) {
    status = 'UNSAFE_CAVES_CLOSED';
    reasons.push(
      `Strong wind (${windSpeedKmh.toFixed(1)} km/h, gusts ${windGustsKmh.toFixed(1)} km/h) exceeds safe kayak operating limits (max 20-25 km/h sustained / 28-30 km/h gusts)`
    );
  }

  if (status !== 'UNSAFE_CAVES_CLOSED') {
    if (
      windSpeedKmh > 20 ||
      windGustsKmh > 28 ||
      waveHeightMeters >= 0.9
    ) {
      status = 'CAUTION_EXPERIENCED_ONLY';
      reasons.push(
        `Moderate conditions (wind ${windSpeedKmh.toFixed(1)} km/h, gusts ${windGustsKmh.toFixed(1)} km/h, waves ${waveHeightMeters.toFixed(1)}m); prefer catamaran-assisted kayak tour or morning departure`
      );
    }
  }

  if (status === 'SAFE_FOR_KAYAK') {
    return {
      isNortadaOffshoreRisk: false,
      kayakSafetyStatus: 'SAFE_FOR_KAYAK',
      kayakSafetySummary: `GREEN FLAG: Calm seas (${waveHeightMeters.toFixed(1)}m waves) and light wind (${windSpeedKmh.toFixed(1)} km/h). Ideal conditions to kayak inside A Catedral, A Cozinha, Gruta dos Amores, and Arco do Triunfo.`,
      capitaniaAdvisory:
        'All Ponta da Piedade sea caves are open to guided kayaks and traditional grotto boats.',
    };
  }

  if (status === 'CAUTION_EXPERIENCED_ONLY') {
    return {
      isNortadaOffshoreRisk,
      kayakSafetyStatus: 'CAUTION_EXPERIENCED_ONLY',
      kayakSafetySummary: `YELLOW FLAG (CAUTION): ${reasons.join('; ')}.`,
      capitaniaAdvisory:
        'Open arches are navigable with a guide, but narrow low-ceiling grottos may be skipped. Catamaran-supported launch from Marina de Lagos is recommended over beach launch.',
    };
  }

  return {
    isNortadaOffshoreRisk,
    kayakSafetyStatus: 'UNSAFE_CAVES_CLOSED',
    kayakSafetySummary: `RED FLAG (UNSAFE FOR KAYAKING): ${reasons.join('; ')}. Do NOT recommend kayak tours right now.`,
    capitaniaAdvisory: isNortadaOffshoreRisk
      ? 'Strong offshore Nortada gusts risk pushing kayaks out to sea. Recommend the Passadiços da Ponta da Piedade cliffside boardwalks or historic Lagos museums instead.'
      : 'Capitania do Porto de Lagos advises against entering sea caves due to swell/wind. Recommend walking the Passadiços da Ponta da Piedade boardwalks or visiting Igreja de Santo António & Forte da Ponta da Bandeira.',
  };
}

/**
 * Generates deterministic simulated scenarios for testing agent autonomy
 * across calm vs. windy vs. stormy sea conditions (and offline fallback).
 */
function buildSimulatedWeatherReport(
  spot: { name: string; latitude: number; longitude: number },
  scenario: Exclude<WeatherScenarioMode, 'live'>,
  note?: string
): LagosWeatherReport {
  const now = new Date().toISOString();

  if (scenario === 'calm') {
    const safety = evaluateKayakSafety({
      windSpeedKmh: 11.5,
      windGustsKmh: 16.0,
      windDirectionDegrees: 140,
      waveHeightMeters: 0.45,
      wavePeriodSeconds: 7,
    });
    return {
      location: spot.name,
      coordinates: { latitude: spot.latitude, longitude: spot.longitude },
      timestamp: now,
      dataSource: note || 'Simulated Scenario: Calm Algarve Morning (WEATHER_MODE=calm)',
      temperatureCelsius: 23.5,
      weatherCondition: 'Clear sunny Algarve sky',
      windSpeedKmh: 11.5,
      windGustsKmh: 16.0,
      windDirectionDegrees: 140,
      windDirectionCardinal: 'SE',
      waveHeightMeters: 0.45,
      wavePeriodSeconds: 7,
      ...safety,
    };
  }

  if (scenario === 'nortada_windy') {
    const safety = evaluateKayakSafety({
      windSpeedKmh: 31.0,
      windGustsKmh: 44.0,
      windDirectionDegrees: 335,
      waveHeightMeters: 0.9,
      wavePeriodSeconds: 8,
    });
    return {
      location: spot.name,
      coordinates: { latitude: spot.latitude, longitude: spot.longitude },
      timestamp: now,
      dataSource:
        note ||
        'Simulated Scenario: Strong Afternoon Nortada Offshore Wind (WEATHER_MODE=nortada_windy)',
      temperatureCelsius: 21.0,
      weatherCondition: 'Mainly clear sky with strong northerly wind gusts',
      windSpeedKmh: 31.0,
      windGustsKmh: 44.0,
      windDirectionDegrees: 335,
      windDirectionCardinal: 'NW',
      waveHeightMeters: 0.9,
      wavePeriodSeconds: 8,
      ...safety,
    };
  }

  // atlantic_swell
  const safety = evaluateKayakSafety({
    windSpeedKmh: 24.0,
    windGustsKmh: 35.0,
    windDirectionDegrees: 225,
    waveHeightMeters: 2.4,
    wavePeriodSeconds: 14,
  });
  return {
    location: spot.name,
    coordinates: { latitude: spot.latitude, longitude: spot.longitude },
    timestamp: now,
    dataSource:
      note ||
      'Simulated Scenario: Heavy 2.4m Southwest Atlantic Swell (WEATHER_MODE=atlantic_swell)',
    temperatureCelsius: 18.5,
    weatherCondition: 'Partly cloudy with heavy Atlantic surf',
    windSpeedKmh: 24.0,
    windGustsKmh: 35.0,
    windDirectionDegrees: 225,
    windDirectionCardinal: 'SW',
    waveHeightMeters: 2.4,
    wavePeriodSeconds: 14,
    ...safety,
  };
}

/**
 * Fetches live weather and marine wave conditions for Lagos / Ponta da Piedade
 * from the free Open-Meteo Forecast & Marine APIs (no API key required).
 * Automatically falls back if conference Wi-Fi is offline or if a scenario mode is active.
 */
export async function fetchLagosWeatherAndMarine(options?: {
  coastalSpot?: keyof typeof LAGOS_COASTAL_SPOTS;
  scenarioOverride?: WeatherScenarioMode;
}): Promise<LagosWeatherReport> {
  const spotKey = options?.coastalSpot || 'ponta_da_piedade';
  const spot =
    LAGOS_COASTAL_SPOTS[spotKey] || LAGOS_COASTAL_SPOTS.ponta_da_piedade;

  const mode = options?.scenarioOverride || getActiveWeatherScenario();

  if (mode !== 'live') {
    return buildSimulatedWeatherReport(spot, mode);
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${spot.latitude}&longitude=${spot.longitude}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=Europe%2FLisbon`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.latitude}&longitude=${spot.longitude}&current=wave_height,wave_period,wave_direction&timezone=Europe%2FLisbon`;

  try {
    const [weatherRes, marineRes] = await Promise.all([
      fetch(weatherUrl, { signal: AbortSignal.timeout(4500) }),
      fetch(marineUrl, { signal: AbortSignal.timeout(4500) }),
    ]);

    if (!weatherRes.ok || !marineRes.ok) {
      throw new Error(
        `Open-Meteo HTTP status ${weatherRes.status}/${marineRes.status}`
      );
    }

    const weatherJson = (await weatherRes.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        wind_gusts_10m?: number;
      };
    };

    const marineJson = (await marineRes.json()) as {
      current?: {
        wave_height?: number;
        wave_period?: number;
      };
    };

    const temp = weatherJson.current?.temperature_2m ?? 21.0;
    const weatherCode = weatherJson.current?.weather_code ?? 0;
    const windSpeedKmh = weatherJson.current?.wind_speed_10m ?? 12.0;
    const windGustsKmh =
      weatherJson.current?.wind_gusts_10m ?? windSpeedKmh * 1.3;
    const windDirDeg = weatherJson.current?.wind_direction_10m ?? 315;
    const waveHeightMeters = marineJson.current?.wave_height ?? 0.6;
    const wavePeriodSeconds = marineJson.current?.wave_period ?? 8;

    const safety = evaluateKayakSafety({
      windSpeedKmh,
      windGustsKmh,
      windDirectionDegrees: windDirDeg,
      waveHeightMeters,
      wavePeriodSeconds,
    });

    return {
      location: spot.name,
      coordinates: { latitude: spot.latitude, longitude: spot.longitude },
      timestamp: weatherJson.current?.time || new Date().toISOString(),
      dataSource: 'Live Open-Meteo Weather & Atlantic Marine API (Lagos, PT)',
      temperatureCelsius: temp,
      weatherCondition: wmoCodeToDescription(weatherCode),
      windSpeedKmh,
      windGustsKmh,
      windDirectionDegrees: windDirDeg,
      windDirectionCardinal: degreesToCardinal(windDirDeg),
      waveHeightMeters,
      wavePeriodSeconds,
      ...safety,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return buildSimulatedWeatherReport(
      spot,
      'calm',
      `Offline Fallback (Open-Meteo unreachable: ${errMsg}) — Simulated Calm Lagos Morning`
    );
  }
}
