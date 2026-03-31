export type WeatherConfig = {
  lat: number;
  lon: number;
  units: 'metric' | 'imperial';
};

export type WeatherNow = {
  temperatureC: number;
  weatherCode?: number;
  fetchedAtIso: string;
};

const STORAGE_KEY = 'lobbytv.weatherNow.v1';

function toCelsius(value: number, units: WeatherConfig['units']) {
  if (units === 'imperial') return Math.round(((value - 32) * 5) / 9);
  return Math.round(value);
}

export function describeWeatherCode(code?: number) {
  if (code == null) return '—';
  // Open-Meteo weather codes: https://open-meteo.com/en/docs
  if (code === 0) return 'בהיר';
  if (code === 1 || code === 2) return 'מעונן חלקית';
  if (code === 3) return 'מעונן';
  if (code === 45 || code === 48) return 'ערפל';
  if (code === 51 || code === 53 || code === 55) return 'טפטוף';
  if (code === 56 || code === 57) return 'טפטוף קפוא';
  if (code === 61 || code === 63 || code === 65) return 'גשם';
  if (code === 66 || code === 67) return 'גשם קופא';
  if (code === 71 || code === 73 || code === 75) return 'שלג';
  if (code === 77) return 'גרגרי שלג';
  if (code === 80 || code === 81 || code === 82) return 'ממטרים';
  if (code === 85 || code === 86) return 'ממטרי שלג';
  if (code === 95) return 'סופות רעמים';
  if (code === 96 || code === 99) return 'סופות רעמים וברד';
  return 'מזג אוויר';
}

export function readCachedWeather(): WeatherNow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherNow;
    if (!parsed?.fetchedAtIso) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedWeather(now: WeatherNow) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(now));
  } catch {
    // ignore quota/storage errors
  }
}

export async function fetchWeatherNow(cfg: WeatherConfig): Promise<WeatherNow> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(String(cfg.lat))}` +
    `&longitude=${encodeURIComponent(String(cfg.lon))}` +
    `&current=temperature_2m,weather_code&timezone=auto`;

  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`weather_http_${res.status}`);
  const data = (await res.json()) as any;

  const tempRaw = Number(data?.current?.temperature_2m);
  const code = data?.current?.weather_code != null ? Number(data.current.weather_code) : undefined;
  if (!Number.isFinite(tempRaw)) throw new Error('weather_parse');

  return {
    temperatureC: toCelsius(tempRaw, cfg.units),
    weatherCode: Number.isFinite(code) ? code : undefined,
    fetchedAtIso: new Date().toISOString(),
  };
}

