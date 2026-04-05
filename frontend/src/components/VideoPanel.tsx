import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  src: string;
};

export function VideoPanel({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [hadError, setHadError] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const isLikelyRemote = useMemo(() => /^https?:\/\//i.test(src), [src]);

  useEffect(() => {
    setCanPlay(false);
    setHadError(false);
    setSoundBlocked(false);
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !canPlay) return;
    v.muted = false;
    void v.play().catch(() => {
      v.muted = true;
      setSoundBlocked(true);
      void v.play();
    });
  }, [canPlay, src]);

  const enableSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setSoundBlocked(false);
    void v.play();
  };

  return (
    <div className="card videoWrap">
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        autoPlay
        preload={isLikelyRemote ? 'metadata' : 'auto'}
        onCanPlay={() => setCanPlay(true)}
        onError={() => setHadError(true)}
      />

      {soundBlocked && (
        <button type="button" className="videoOverlay" onClick={enableSound}>
          <div>
            הדפדפן חוסם השמעה אוטומטית עם סאונד.
            <br />
            לחצו כאן להפעלת הסאונד.
          </div>
        </button>
      )}

      {!canPlay && (
        <div className="videoOverlay">
          {hadError ? (
            <div>
              לא ניתן להציג וידאו.
              <br />
              ודאו שקיים קובץ ב־<b>/media</b> או הגדירו כתובת וידאו תקינה.
            </div>
          ) : (
            <div>טוען וידאו…</div>
          )}
        </div>
      )}
    </div>
  );
}

