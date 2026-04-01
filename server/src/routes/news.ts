import type { Request, Response } from 'express';
import { fetchRss } from '../rss.js';

const DEFAULT_RSS = 'https://www.ynet.co.il/Integration/StoryRss2.xml';

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function isAllowedRssUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    // Avoid becoming an open proxy: allow Ynet/related only.
    const host = u.hostname.toLowerCase();
    return host.endsWith('ynet.co.il') || host === 'www.ynet.co.il';
  } catch {
    return false;
  }
}

export async function newsHandler(req: Request, res: Response) {
  const rssUrlRaw = (req.query.rssUrl as string | undefined) ?? process.env.NEWS_RSS_URL ?? DEFAULT_RSS;
  const rssUrl = isAllowedRssUrl(rssUrlRaw) ? rssUrlRaw : DEFAULT_RSS;
  const maxItems = clampInt(req.query.maxItems, 1, 30, Number(process.env.NEWS_MAX_ITEMS ?? 12));

  try {
    const feed = await fetchRss(rssUrl);
    const items = feed.items.slice(0, maxItems).map((i) => ({
      title: i.title,
      link: i.link,
      publishedAt: i.pubDate,
      source: feed.title ?? 'Ynet',
    }));

    res.json({ items, fetchedAtIso: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: 'rss_fetch_failed', message: (e as Error)?.message ?? String(e) });
  }
}

