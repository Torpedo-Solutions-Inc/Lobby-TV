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

function splitAnnouncementsByBlankLine(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  return normalized
    .split(/\n[ \t]*\n+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
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
  const slots = useMemo(() => (text ? splitAnnouncementsByBlankLine(text) : []), [text]);

  const tickerSlots = useMemo(() => {
    if (!slots.length) return [];
    return [...slots, ...slots];
  }, [slots]);

  const durationSec = useMemo(() => {
    const baseLineCount = Math.max(
      1,
      slots.reduce((acc, s) => acc + Math.max(1, s.split('\n').length), 0),
    );
    const secondsPerLine = 2.4;
    const target = baseLineCount * secondsPerLine;
    const min = Math.max(25, Math.round((rotationSeconds || 12) * 2));
    return Math.min(260, Math.max(min, Math.round(target)));
  }, [rotationSeconds, slots]);

  return (
    <div className="card announcements">
      <div className="panelTitle">
        <h2>הודעות ועדכונים</h2>
      </div>

      <div className="announcementDoc">
        {tickerSlots.length ? (
          <div className="vTicker" aria-label="announcements">
            <div className="vTickerTrack announcementsTrack" style={{ animationDuration: `${durationSec}s` }}>
              {tickerSlots.map((t, idx) => (
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

