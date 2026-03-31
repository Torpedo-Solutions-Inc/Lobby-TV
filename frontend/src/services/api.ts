export type NewsItem = {
  title: string;
  link?: string;
  publishedAt?: string;
  source?: string;
};

export async function fetchNews(rssUrl: string, maxItems: number): Promise<NewsItem[]> {
  const qs = new URLSearchParams({
    maxItems: String(maxItems),
    rssUrl,
  });
  const res = await fetch(`/api/news?${qs.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`news_http_${res.status}`);
  const data = (await res.json()) as { items?: NewsItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

export type Announcement = {
  title: string;
  body: string;
  priority?: 'normal' | 'high';
};

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(`/api/announcements`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`announcements_http_${res.status}`);
  const data = (await res.json()) as { items?: Announcement[] };
  return Array.isArray(data.items) ? data.items : [];
}

