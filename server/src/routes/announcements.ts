import type { Request, Response } from 'express';

export type Announcement = {
  title: string;
  body: string;
  priority?: 'normal' | 'high';
};

async function fetchText(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/plain,text/html;q=0.8,*/*;q=0.1' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function resolveGoogleDocTxtUrl(rawUrl: string) {
  // Accept either:
  // - Export URL: https://docs.google.com/document/d/<id>/export?format=txt
  // - Share/edit URL: https://docs.google.com/document/d/<id>/edit
  // - Published URL: https://docs.google.com/document/d/e/<id>/pub (best-effort)
  if (/\/export\?format=txt\b/i.test(rawUrl)) return rawUrl;

  const m = rawUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return `https://docs.google.com/document/d/${m[1]}/export?format=txt`;

  return rawUrl;
}

export async function announcementsHandler(_req: Request, res: Response) {
  const docUrl = process.env.ANNOUNCEMENTS_DOC_URL?.trim();
  if (!docUrl) {
    return res.status(501).json({
      error: 'announcements_not_configured',
      message: 'Set ANNOUNCEMENTS_DOC_URL to a Google Doc URL (preferably export?format=txt).',
    });
  }

  try {
    const txtUrl = resolveGoogleDocTxtUrl(docUrl);
    const text = await fetchText(txtUrl, 8000);

    const cleaned = text.replace(/\r\n/g, '\n').trim();
    const items: Announcement[] = cleaned
      ? [{ title: '', body: cleaned, priority: 'normal' }]
      : [];

    res.json({ items, fetchedAtIso: new Date().toISOString(), source: 'google-doc' });
  } catch (e) {
    res.status(502).json({
      error: 'announcements_fetch_failed',
      message: (e as Error)?.message ?? String(e),
    });
  }
}

