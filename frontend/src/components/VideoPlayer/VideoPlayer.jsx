import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './VideoPlayer.module.css';

const API_BASES = ['/__backend', ''];
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
  const [mode, setMode] = useState('empty');
  const [loading, setLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!channel) {
      setMode('empty');
      setStreamUrl('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMode('empty');
    setStreamUrl('');

    const load = async () => {
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

      if (url) {
        setStreamUrl(url);
        setMode('hls');
      } else {
        setMode('link');
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, reloadKey]);

  useEffect(() => {
    if (mode !== 'hls' || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    const onReady = () => {
      setLoading(false);
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolume = () => setIsMuted(video.muted);
    const onError = () => setMode('link');

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolume);
    video.addEventListener('error', onError);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data?.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else setMode('link');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      setMode('link');
    }

    return () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolume);
      video.removeEventListener('error', onError);
    };
  }, [mode, streamUrl]);

  const retry = () => setReloadKey((key) => key + 1);
  const openChannel = () => {
    if (channel?.stream_url) location.href = channel.stream_url;
  };
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
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
    return <div className={styles.playerWrapper}><div className={styles.placeholder}>Selecciona un canal</div></div>;
  }

  return (
    <div className={styles.playerWrapper} ref={wrapperRef}>
      <div className={styles.backdropGlow} />

      {mode === 'hls' && (
        <video key={`${channel.id}-${reloadKey}`} ref={videoRef} autoPlay playsInline className={styles.player} />
      )}

      {mode === 'link' && (
        <div className={styles.externalBox}>
          <div className={styles.externalLogo}>
            {channel.logo_url ? <img src={channel.logo_url} alt={channel.name} /> : <span>{getInitials(channel.name)}</span>}
          </div>
          <h3>{channel.name}</h3>
          <p>Este canal no entrega un stream HLS directo. Para reproducirlo, ábrelo fuera de la app.</p>
          <div className={styles.externalActions}>
            <button className={styles.openButton} onClick={openChannel}>Abrir canal</button>
            <button className={styles.retryButton} onClick={retry}>Reintentar HLS</button>
          </div>
        </div>
      )}

      <div className={styles.topOverlay}>
        <div className={styles.channelIdentity}>
          <div className={styles.logoBox}>{channel.logo_url ? <img src={channel.logo_url} alt={channel.name} /> : <span>{getInitials(channel.name)}</span>}</div>
          <div>
            <div className={styles.channelName}>{channel.name}</div>
            <div className={styles.channelMeta}><span /> EN VIVO · {mode === 'hls' ? 'HLS HD' : 'Enlace externo'}</div>
          </div>
        </div>
        <div className={styles.topActions}>
          {mode === 'link' && <button onClick={openChannel}>Abrir</button>}
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

      {loading && <div className={styles.overlay}><div className={styles.loader} />Buscando HLS...</div>}
    </div>
  );
}
