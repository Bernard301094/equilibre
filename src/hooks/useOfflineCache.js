import { useEffect, useState } from 'react';

/**
 * useOfflineCache
 * Retorna { isOffline } e expõe helpers para salvar/ler dados
 * no localStorage como fallback quando sem internet.
 *
 * Uso:
 *   const { isOffline } = useOfflineCache();
 */
export function useOfflineCache() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  return { isOffline };
}

/** Salva dados no localStorage com timestamp */
export function cacheWrite(key, data) {
  try {
    localStorage.setItem(`eq_cache_${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

/** Lê dados do cache local; retorna null se não existir ou expirado (default 24h) */
export function cacheRead(key, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(`eq_cache_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch (_) {
    return null;
  }
}
