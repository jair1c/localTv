// Detectar URL del backend dinámicamente.
// En desarrollo usa FastAPI local; en Vercel usa el servicio backend bajo /__backend.
const BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  return '/__backend';
})();

export const api = {
  getChannels: async () => {
    const res = await fetch(`${BASE_URL}/api/channels/`);
    if (!res.ok) throw new Error('Error fetching channels');
    return res.json();
  },

  getChannel: async (id) => {
    const res = await fetch(`${BASE_URL}/api/channels/${id}`);
    if (!res.ok) throw new Error('Error fetching channel');
    return res.json();
  },

  getCategories: async () => {
    const res = await fetch(`${BASE_URL}/api/categories/`);
    if (!res.ok) throw new Error('Error fetching categories');
    return res.json();
  },

  validateApiKey: async (apiKey) => {
    const res = await fetch(`${BASE_URL}/api/channels`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (res.status === 401) {
      throw new Error('API Key inválida');
    }
    if (!res.ok) throw new Error('Error validating API Key');
    return res.json();
  },

  createChannel: async (data, apiKey) => {
    const res = await fetch(`${BASE_URL}/api/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error creating channel');
    return res.json();
  },

  updateChannel: async (id, data, apiKey) => {
    const res = await fetch(`${BASE_URL}/api/channels/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error updating channel');
    return res.json();
  },

  deleteChannel: async (id, apiKey) => {
    const res = await fetch(`${BASE_URL}/api/channels/${id}`, {
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
