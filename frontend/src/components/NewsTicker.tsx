import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchNews, type NewsItem } from '../services/api';

type Props = {
  rssUrl: string;
  maxItems: number;
};

function cleanHeadline(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function NewsTicker({ rssUrl, maxItems }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const next = await fetchNews(rssUrl, maxItems);
        if (cancelled) return;
        setItems(next);
        setLastUpdatedIso(new Date().toISOString());
      } catch (e) {
        if (cancelled) return;
        setError((e as Error)?.message ?? 'news_error');
      }
    }

    void load();
    const t = window.setInterval(load, 7 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [maxItems, rssUrl]);

  const headlines = useMemo(() => {
    const base = (items ?? []).map((i) => cleanHeadline(i.title)).filter(Boolean);
    if (!base.length) return ['חדשות: טוען…'];
    return base;
  }, [items]);

  const tickerItems = useMemo(() => {
    const base = headlines.length ? headlines : ['חדשות'];
    // Duplicate for seamless loop; CSS animates -50% of track width.
    return [...base, ...base];
  }, [headlines]);

  const durationSec = useMemo(() => {
    // Rough speed control: more headlines -> longer duration.
    const len = Math.max(1, headlines.join(' · ').length);
    return Math.min(80, Math.max(22, Math.round(len / 6)));
  }, [headlines]);

  const metaText = useMemo(() => {
    if (error) return 'לא ניתן לטעון חדשות';
    if (!lastUpdatedIso) return '';
    const mins = Math.max(0, Math.round((Date.now() - new Date(lastUpdatedIso).getTime()) / 60000));
    if (mins <= 1) return 'עודכן עכשיו';
    return `עודכן לפני ${mins} דק׳`;
  }, [error, lastUpdatedIso]);

  return (
    <div className="ticker" aria-label="news">
      <div className="tickerTrack" ref={trackRef} style={{ animationDuration: `${durationSec}s` }}>
        {tickerItems.map((t, idx) => (
          <div key={`${idx}-${t}`} className="tickerItem">
            {t}
            <span className="tickerSep"> · </span>
          </div>
        ))}
      </div>
      {metaText ? <span className="tickerMeta">{metaText}</span> : null}
    </div>
  );
}

