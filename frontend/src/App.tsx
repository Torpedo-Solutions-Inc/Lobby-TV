import displayConfig from './config/display.config.json';
import { HeaderBar } from './components/HeaderBar';
import { VideoPanel } from './components/VideoPanel';
import { AnnouncementsPanel } from './components/AnnouncementsPanel';
import { NewsPanel } from './components/NewsPanel';
import type { WeatherConfig } from './services/weather';

export function App() {
  return (
    <div className="screenRoot" dir="rtl">
      <HeaderBar weatherConfig={displayConfig.weather as WeatherConfig} />

      <main className="mainGrid">
        <section className="slotVideo">
          <VideoPanel src={displayConfig.videoSrc} />
        </section>

        <section className="slotAnnouncements">
          <AnnouncementsPanel rotationSeconds={displayConfig.announcements.rotationSeconds} />
        </section>

        <section className="slotNews">
          <NewsPanel rssUrl={displayConfig.news.rssUrl} maxItems={displayConfig.news.maxItems} />
        </section>
      </main>
    </div>
  );
}

