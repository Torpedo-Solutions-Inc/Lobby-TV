import { useEffect, useMemo, useState } from 'react';
import type { WeatherConfig, WeatherNow } from '../services/weather';
import { describeWeatherCode, fetchWeatherNow, readCachedWeather, writeCachedWeather } from '../services/weather';
import weatherIcon from '../assets/weather-generic.svg';

type Props = {
  weatherConfig: WeatherConfig;
};

function getGreeting(d: Date) {
  const h = d.getHours();

  // Morning: 05:00-11:59, Noon: 12:00-16:59, Evening: 17:00-20:59, Night: 21:00-04:59
  if (h >= 5 && h < 12) return 'בוקר טוב שכנים!';
  if (h >= 12 && h < 17) return 'צהריים טובים שכנים!';
  if (h >= 17 && h < 21) return 'ערב טוב שכנים!';
  return 'לילה טוב שכנים!';
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function minutesAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

export function HeaderBar({ weatherConfig }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherNow | null>(() => readCachedWeather());
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setWeatherError(null);
        const w = await fetchWeatherNow(weatherConfig);
        if (cancelled) return;
        setWeather(w);
        writeCachedWeather(w);
      } catch (e) {
        if (cancelled) return;
        setWeatherError((e as Error)?.message ?? 'weather_error');
      }
    }

    void load();
    const t = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [weatherConfig]);

  const updatedText = useMemo(() => {
    if (!weather?.fetchedAtIso) return null;
    const mins = minutesAgo(weather.fetchedAtIso);
    if (mins == null) return null;
    if (mins <= 1) return 'עודכן עכשיו';
    return `עודכן לפני ${mins} דק׳`;
  }, [weather?.fetchedAtIso]);

  const greeting = useMemo(() => getGreeting(now), [now]);

  return (
    <header className="card headerBar">
      <div className="headerLeftTitle">
        <div className="headerBrand">אסירי ציון 26</div>
        <div className="headerSubtitle">{greeting}</div>
      </div>

      <div className="headerRight">
        <div className="pill" aria-label="clock">
          <div>
            <div className="clockTime">{formatTime(now)}</div>
            <div className="clockDate">{formatDate(now)}</div>
          </div>
        </div>

        <div className="pill" aria-label="weather">
          <div className="weatherRow">
            <img className="weatherIcon" src={weatherIcon} alt="" aria-hidden="true" />
            <div>
              <div className="weatherTemp">{weather ? `${weather.temperatureC}°` : '—'}</div>
              <div className="weatherMeta">
                {weather ? describeWeatherCode(weather.weatherCode) : weatherError ? 'שגיאת מזג אוויר' : 'טוען…'}
                {updatedText ? ` · ${updatedText}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

