import Parser from 'rss-parser';

export type RssItem = {
  title: string;
  link?: string;
  pubDate?: string;
};

const parser = new Parser();

export async function fetchRss(url: string) {
  const feed = await parser.parseURL(url);
  const items: RssItem[] = (feed.items ?? [])
    .map((i) => ({
      title: String(i.title ?? '').trim(),
      link: i.link ? String(i.link) : undefined,
      pubDate: i.pubDate ? String(i.pubDate) : undefined,
    }))
    .filter((i) => i.title.length > 0);

  return {
    title: feed.title ? String(feed.title) : undefined,
    items,
  };
}

