import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

const API_BASES = ['/__backend', ''];
const LOAD_TIMEOUT_MS = 12000;
const isHlsUrl = (url = '') => url.includes('.m3u8');

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export default function VideoPlayer({ channel }) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const timeoutRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('empty');
  const [streamUrl, setStreamUrl] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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
      setIsPlaying(false);
      return;
    }

    let cancelled = false;
    setMode('empty');
    setStreamUrl('');
    setError(null);
    setLoading(true);
    setIsPlaying(false);

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
          } catch {}
        }

        if (!url && isHlsUrl(channel.stream_url)) url = channel.stream_url;
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
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolume = () => setIsMuted(video.muted);
    const handleError = () => {
      setLoading(false);
      setError('No se pudo reproducir este stream. Presiona reintentar.');
    };

    video.addEventListener('loadedmetadata', handleReady);
    video.addEventListener('canplay', handleReady);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolume);
    video.addEventListener('error', handleError);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
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
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolume);
      video.removeEventListener('error', handleError);
    };
  }, [mode, streamUrl]);

  const retry = () => setReloadKey((key) => key + 1);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || mode !== 'hls') return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video || mode !== 'hls') return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const fullscreen = () => {
    const target = wrapperRef.current;
    if (!target) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else target.requestFullscreen?.();
  };

  if (!channel) {
    return (
      <div className={styles.playerWrapper} ref={wrapperRef}>
        <div className={styles.placeholder}>Selecciona un canal para reproducir</div>
      </div>
    );
  }

  return (
    <div className={styles.playerWrapper} ref={wrapperRef}>
      <div className={styles.backdropGlow} />

      {mode === 'hls' && (
        <video key={`${channel.id}-video-${reloadKey}`} ref={videoRef} autoPlay playsInline className={styles.player} />
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

      <div className={styles.topOverlay}>
        <div className={styles.channelIdentity}>
          <div className={styles.logoBox}>
            {channel.logo_url ? <img src={channel.logo_url} alt={channel.name} /> : <span>{getInitials(channel.name)}</span>}
          </div>
          <div>
            <div className={styles.channelName}>{channel.name}</div>
            <div className={styles.channelMeta}><span /> EN VIVO · {mode === 'hls' ? 'HLS HD' : 'Modo web'}</div>
          </div>
        </div>
        <div className={styles.topActions}>
          <button onClick={retry}>↻</button>
          <button onClick={fullscreen}>⛶</button>
        </div>
      </div>

      {mode === 'hls' && (
        <div className={styles.bottomControls}>
          <button className={styles.mainPlay} onClick={togglePlay}>{isPlaying ? '❚❚' : '▶'}</button>
          <button onClick={toggleMute}>{isMuted ? '🔇' : '🔊'}</button>
          <div className={styles.livePill}><span /> LIVE</div>
          <div className={styles.spacer} />
          <button onClick={retry}>Reintentar</button>
          <button onClick={fullscreen}>Pantalla completa</button>
        </div>
      )}

      {mode === 'iframe' && (
        <div className={styles.iframeHint}>
          Este canal usa reproductor externo. Si no carga, presiona Reintentar.
        </div>
      )}

      {loading && <div className={styles.overlay}><div className={styles.loader} />Cargando {channel.name}...</div>}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={retry}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
