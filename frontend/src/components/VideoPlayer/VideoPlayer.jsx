import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

const API_BASES = ['/__backend', ''];
const LOAD_TIMEOUT_MS = 12000;

const isHlsUrl = (url = '') => url.includes('.m3u8');

export default function VideoPlayer({ channel }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const timeoutRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('empty');
  const [streamUrl, setStreamUrl] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const iframeUrl = useMemo(() => {
    if (!channel?.stream_url) return '';
    const separator = channel.stream_url.includes('?') ? '&' : '?';
    return `${channel.stream_url}${separator}_reload=${reloadKey}`;
  }, [channel?.stream_url, reloadKey]);

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!channel) {
      setMode('empty');
      setStreamUrl('');
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setMode('empty');
    setStreamUrl('');
    setError(null);
    setLoading(true);

    timeoutRef.current = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError('El canal está tardando en cargar. Presiona reintentar.');
      }
    }, LOAD_TIMEOUT_MS);

    const loadStream = async () => {
      try {
        let url = null;

        for (const base of API_BASES) {
          try {
            const res = await fetch(`${base}/api/streams/${channel.slug}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.url && isHlsUrl(data.url)) {
                url = data.url;
                break;
              }
            }
          } catch {
            // Continuar con el siguiente origen.
          }
        }

        if (!url && isHlsUrl(channel.stream_url)) {
          url = channel.stream_url;
        }

        if (cancelled) return;

        if (!url) {
          setMode('iframe');
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          return;
        }

        setMode('hls');
        setStreamUrl(url);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setMode('iframe');
          setLoading(false);
        }
      }
    };

    loadStream();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, reloadKey]);

  useEffect(() => {
    if (mode !== 'hls' || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    setLoading(true);
    setError(null);

    const handleReady = () => {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      video.play().catch(() => {});
    };

    const handleError = () => {
      setLoading(false);
      setError('No se pudo reproducir este stream. Presiona reintentar.');
    };

    video.addEventListener('loadedmetadata', handleReady);
    video.addEventListener('canplay', handleReady);
    video.addEventListener('error', handleError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            handleError();
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      setMode('iframe');
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleReady);
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('error', handleError);
    };
  }, [mode, streamUrl]);

  const retry = () => {
    setReloadKey((key) => key + 1);
  };

  if (!channel) {
    return (
      <div className={styles.playerWrapper}>
        <div className={styles.placeholder}>Selecciona un canal para reproducir</div>
      </div>
    );
  }

  return (
    <div className={styles.playerWrapper}>
      {mode === 'hls' && (
        <video
          key={`${channel.id}-video-${reloadKey}`}
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className={styles.player}
        />
      )}

      {mode === 'iframe' && (
        <iframe
          key={`${channel.id}-iframe-${reloadKey}`}
          src={iframeUrl}
          title={channel.name}
          className={styles.player}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          referrerPolicy="no-referrer"
          allowFullScreen
          onLoad={() => {
            setLoading(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
        />
      )}

      {loading && <div className={styles.overlay}>Cargando {channel.name}...</div>}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={retry}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
