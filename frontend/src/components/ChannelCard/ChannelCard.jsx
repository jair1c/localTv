import styles from './ChannelCard.module.css';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export default function ChannelCard({ channel, isSelected, onSelect, isFavorite, onToggleFavorite }) {
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite?.(channel.id);
  };

  const handleLogoError = (e) => {
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.add(styles.showFallback);
  };

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={isSelected}
    >
      <div className={styles.logoBox}>
        {channel.logo_url && (
          <img
            src={channel.logo_url}
            alt={channel.name}
            className={styles.logo}
            onError={handleLogoError}
          />
        )}
        <span className={`${styles.logoFallback} ${!channel.logo_url ? styles.showFallback : ''}`}>
          {getInitials(channel.name)}
        </span>
      </div>

      <div className={styles.info}>
        <div className={styles.name}>{channel.name}</div>
        <div className={styles.meta}>
          <span className={channel.is_active ? styles.onlineDot : styles.offlineDot}></span>
          {channel.is_active ? 'En vivo' : 'Offline'}
        </div>
      </div>

      {onToggleFavorite && (
        <button
          className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteActive : ''}`}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Remover de favoritos' : 'Agregar a favoritos'}
          aria-label={isFavorite ? 'Remover de favoritos' : 'Agregar a favoritos'}
        >
          ★
        </button>
      )}
    </div>
  );
}
