const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASES = (() => {
  if (import.meta.env.VITE_API_URL) {
    return [import.meta.env.VITE_API_URL];
  }

  if (isLocalhost) {
    return ['http://localhost:8000', ''];
  }

  return ['/__backend', ''];
})();

const fallbackCategories = [
  { id: 1, name: 'Deportes', slug: 'deportes', icon: 'fa-futbol' },
  { id: 2, name: 'Reality', slug: 'reality', icon: 'fa-tv' },
];

const fallbackChannels = [
  { id: 1, name: 'ESPN', slug: 'espnmx', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=espnmx', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png', category_id: 1, is_active: true },
  { id: 2, name: 'ESPN 2', slug: 'espn2mx', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=espn2mx', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png', category_id: 1, is_active: true },
  { id: 3, name: 'ESPN 3', slug: 'espn3mx', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=espn3mx', logo_url: null, category_id: 1, is_active: true },
  { id: 4, name: 'ESPN 4', slug: 'espn4mx', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=espn4mx', logo_url: null, category_id: 1, is_active: true },
  { id: 5, name: 'DSports', slug: 'dsports', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=dsports', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/DirectTV_Sports_logo.png/200px-DirectTV_Sports_logo.png', category_id: 1, is_active: true },
  { id: 6, name: 'Liga1 MAX', slug: 'liga1max', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=liga1max', logo_url: null, category_id: 1, is_active: true },
  { id: 7, name: 'GOLPERU', slug: 'golperu', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=golperu', logo_url: null, category_id: 1, is_active: true },
  { id: 8, name: 'Fox Sports', slug: 'foxsports', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=foxsports', logo_url: null, category_id: 1, is_active: true },
  { id: 9, name: 'TNT Sports', slug: 'tntsports', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=tntsports', logo_url: null, category_id: 1, is_active: true },
  { id: 10, name: 'TyC Sports', slug: 'tycsports', stream_url: 'https://tvtvhd.com/vivo/canales.php?stream=tycsports', logo_url: null, category_id: 1, is_active: true },
];

async function fetchFromApi(path) {
  let lastError;

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) return res.json();
      lastError = new Error(`${path} returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Error fetching ${path}`);
}

export const api = {
  getChannels: async () => {
    try {
      return await fetchFromApi('/api/channels/');
    } catch (error) {
      console.warn('Using fallback channels:', error);
      return fallbackChannels;
    }
  },

  getChannel: async (id) => {
    try {
      return await fetchFromApi(`/api/channels/${id}`);
    } catch (error) {
      const channel = fallbackChannels.find((item) => item.id === Number(id));
      if (channel) return channel;
      throw new Error('Error fetching channel');
    }
  },

  getCategories: async () => {
    try {
      return await fetchFromApi('/api/categories/');
    } catch (error) {
      console.warn('Using fallback categories:', error);
      return fallbackCategories;
    }
  },

  validateApiKey: async (apiKey) => {
    const res = await fetch(`${API_BASES[0]}/api/channels`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (res.status === 401) throw new Error('API Key inválida');
    if (!res.ok) throw new Error('Error validating API Key');
    return res.json();
  },

  createChannel: async (data, apiKey) => {
    const res = await fetch(`${API_BASES[0]}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error creating channel');
    return res.json();
  },

  updateChannel: async (id, data, apiKey) => {
    const res = await fetch(`${API_BASES[0]}/api/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error updating channel');
    return res.json();
  },

  deleteChannel: async (id, apiKey) => {
    const res = await fetch(`${API_BASES[0]}/api/channels/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
    if (!res.ok) throw new Error('Error deleting channel');
  },

  getDiaryEvents: async () => {
    const res = await fetch('https://pltvhd.com/diaries.json');
    if (!res.ok) throw new Error('Failed to fetch diary events');
    return res.json();
  },
};
