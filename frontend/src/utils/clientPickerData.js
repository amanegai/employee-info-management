import { api } from '../api';

let cachedClients = null;
let cachePromise = null;

export async function loadClientPickerClients() {
  if (cachedClients) {
    return cachedClients;
  }
  if (!cachePromise) {
    cachePromise = api
      .searchClients({})
      .then((list) => {
        cachedClients = list;
        return list;
      })
      .catch((error) => {
        cachePromise = null;
        throw error;
      });
  }
  return cachePromise;
}

export function invalidateClientPickerCache() {
  cachedClients = null;
  cachePromise = null;
}

export function sortClients(clients) {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export function filterClients(clients, query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return clients;
  return clients.filter((client) => {
    const haystack = [
      client.name,
      client.clientCode,
      client.location,
      client.contractStatus,
      client.clientRank,
      client.industry,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
}
