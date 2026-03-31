import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  src: string;
};

export function VideoPanel({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [hadError, setHadError] = useState(false);

  const isLikelyRemote = useMemo(() => /^https?:\/\//i.test(src), [src]);

  useEffect(() => {
    setCanPlay(false);
    setHadError(false);
  }, [src]);

  return (
    <div className="card videoWrap">
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload={isLikelyRemote ? 'metadata' : 'auto'}
        onCanPlay={() => setCanPlay(true)}
        onError={() => setHadError(true)}
      />

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

