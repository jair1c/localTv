import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

const API_BASES = ['/__backend', ''];

export default function VideoPlayer({ channel }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channel) return;

    let hls;
    setLoading(true);
    setError(null);

    const loadStream = async () => {
      try {
        let streamUrl = null;

        // 1. Intentar obtener stream desde backend
        for (const base of API_BASES) {
          try {
            const res = await fetch(`${base}/api/streams/${channel.slug}`);
            if (res.ok) {
              const data = await res.json();
              streamUrl = data.url;
              break;
            }
          } catch {}
        }

        // 2. Si no hay backend → intentar usar directo
        if (!streamUrl) {
          if (channel.stream_url?.includes('.m3u8')) {
            streamUrl = channel.stream_url;
          } else {
            // fallback iframe
            videoRef.current.outerHTML = `<iframe src="${channel.stream_url}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`;
            setLoading(false);
            return;
          }
        }

        // 3. Reproducir con HLS
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current);
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
        }

      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el stream');
      } finally {
        setLoading(false);
      }
    };

    loadStream();

    return () => {
      if (hls) hls.destroy();
    };
  }, [channel]);

  return (
    <div className={styles.playerWrapper}>
      {loading && <div className={styles.overlay}>Cargando...</div>}
      {error && <div className={styles.error}>{error}</div>}
      <video ref={videoRef} controls autoPlay className={styles.player} />
    </div>
  );
}
