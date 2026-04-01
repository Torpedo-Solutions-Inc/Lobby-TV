import { useEffect, useMemo, useState } from 'react';
import { fetchNews, type NewsItem } from '../services/api';

type Props = {
  rssUrl: string;
  maxItems: number;
};

function cleanHeadline(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function formatPublished(iso?: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function NewsPanel({ rssUrl, maxItems }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string | null>(null);

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

  const visible = useMemo(() => {
    const base = (items ?? [])
      .map((i) => ({ ...i, title: cleanHeadline(i.title) }))
      .filter((i) => i.title);
    return base.slice(0, Math.min(maxItems, 10));
  }, [items, maxItems]);

  const headlines = useMemo(() => {
    if (error) return [];
    const base = visible.map((v) => v.title).filter(Boolean);
    return base;
  }, [error, visible]);

  const tickerItems = useMemo(() => {
    if (!headlines.length) return [];
    // Duplicate for seamless loop; CSS animates -50% of track height.
    return [...headlines, ...headlines];
  }, [headlines]);

  const durationSec = useMemo(() => {
    // Slow vertical scroll: scale with item count so people can read.
    const items = Math.max(1, headlines.length);
    const secondsPerHeadline = 7;
    return Math.min(220, Math.max(35, Math.round(items * secondsPerHeadline)));
  }, [headlines]);

  const headerSourceTimeText = useMemo(() => {
    const first = visible[0];
    if (!first) return null;
    const source = first.source?.trim() || 'ynet';
    return source;
  }, [visible]);

  const metaText = useMemo(() => {
    if (error) return 'לא ניתן לטעון חדשות';
    if (!lastUpdatedIso) return 'טוען…';
    const mins = Math.max(0, Math.round((Date.now() - new Date(lastUpdatedIso).getTime()) / 60000));
    if (mins <= 1) return 'עודכן עכשיו';
    return `עודכן לפני ${mins} דק׳`;
  }, [error, lastUpdatedIso]);

  return (
    <div className="card newsPanel">
      <div className="panelTitle">
        <div className="newsHeaderTitleRow">
          <h2>חדשות</h2>
          {headerSourceTimeText ? <div className="newsHeaderMeta">{headerSourceTimeText}</div> : null}
        </div>
        <div className="panelBadge">{metaText}</div>
      </div>

      <div className="newsList">
        {tickerItems.length ? (
          <div className="vTicker" aria-label="news">
            <div className="vTickerTrack" style={{ animationDuration: `${durationSec}s` }}>
              {tickerItems.map((t, idx) => (
                <div key={`${idx}-${t}`} className="vTickerItem">
                  {t}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="newsEmpty">{error ? 'לא ניתן לטעון חדשות כרגע.' : 'טוען חדשות…'}</div>
        )}
      </div>
    </div>
  );
}

