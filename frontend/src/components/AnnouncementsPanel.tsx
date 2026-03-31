import { useEffect, useMemo, useState } from 'react';
import announcementsRaw from '../config/announcements.json';
import { fetchAnnouncements, type Announcement } from '../services/api';

type Props = {
  rotationSeconds: number;
};

const fallbackAnnouncements = announcementsRaw as Announcement[];

function announcementsToText(list: Announcement[]) {
  const parts: string[] = [];
  for (const a of list ?? []) {
    const t = (a.title ?? '').trim();
    const b = (a.body ?? '').trim();
    if (!t && !b) continue;
    if (t && b) parts.push(`${t}\n${b}`);
    else parts.push(t || b);
  }
  return parts.join('\n\n').trim();
}

function splitLinesPreserveBreaks(text: string) {
  const normalized = text.replace(/\r\n/g, '\n');
  return normalized.split('\n').map((l) => (l.length ? l : ' '));
}

export function AnnouncementsPanel({ rotationSeconds }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(fallbackAnnouncements);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const next = await fetchAnnouncements();
        if (cancelled) return;
        if (Array.isArray(next) && next.length) setAnnouncements(next);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error)?.message ?? 'announcements_error');
      }
    }

    void load();
    const t = window.setInterval(load, 3 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  const text = useMemo(() => announcementsToText(announcements), [announcements]);
  const lines = useMemo(() => (text ? splitLinesPreserveBreaks(text) : []), [text]);

  const tickerLines = useMemo(() => {
    if (!lines.length) return [];
    return [...lines, ...lines];
  }, [lines]);

  const durationSec = useMemo(() => {
    const base = Math.max(1, lines.length);
    const secondsPerLine = 2.4;
    const target = base * secondsPerLine;
    const min = Math.max(25, Math.round((rotationSeconds || 12) * 2));
    return Math.min(260, Math.max(min, Math.round(target)));
  }, [lines.length, rotationSeconds]);

  return (
    <div className="card announcements">
      <div className="panelTitle">
        <h2>הודעות ועדכונים</h2>
      </div>

      <div className="announcementDoc">
        {tickerLines.length ? (
          <div className="vTicker" aria-label="announcements">
            <div className="vTickerTrack announcementsTrack" style={{ animationDuration: `${durationSec}s` }}>
              {tickerLines.map((t, idx) => (
                <div key={`${idx}-${t}`} className="vTickerItem announcementLine">
                  {t}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="announcementsEmpty">{error ? 'לא ניתן לטעון הודעות כרגע.' : 'טוען הודעות…'}</div>
        )}
      </div>
    </div>
  );
}

