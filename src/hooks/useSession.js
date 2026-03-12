// src/hooks/useSession.js
import { useState, useEffect, useCallback, useRef } from "react";
import auth from "../services/auth";
import { hydrateSession } from "../services/profile";
import {
  LS_SESSION_KEY,
  LS_THEME_PREFIX,
  TOKEN_REFRESH_INTERVAL_MS,
} from "../utils/constants";

/**
 * Lê a sessão persistida do localStorage.
 * Retorna null se ausente ou se o JSON for inválido.
 */
function readPersistedSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Hook central de sessão.
 *
 * Responsabilidades:
 * - Carregar sessão do localStorage na montagem
 * - Tentar refresh preventivo na montagem (detecta sessões expiradas cedo)
 * - Re-hidratar perfil na montagem caso therapist_id/role estejam ausentes
 * - Persistir sessão no localStorage a cada mudança
 * - Refresh periódico a cada TOKEN_REFRESH_INTERVAL_MS
 * - Escutar o evento "equilibre-unauthorized" para forçar logout
 * - Expor logout() para sign-out explícito
 * - Expor updateSession() para atualizações parciais (ex: novo avatar_url)
 *
 * @returns {{
 * session: object|null,
 * setSession: Function,
 * updateSession: Function,
 * logout: Function,
 * sessionReady: boolean,
 * }}
 */
export function useSession() {
  const [session,      setSessionRaw]  = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const refreshingRef = useRef(false);

  // ── Wraps setSession: toda atualização persiste no localStorage ────────────
  const setSession = useCallback((valueOrUpdater) => {
    setSessionRaw((prev) => {
      const next =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(prev)
          : valueOrUpdater;

      if (next) {
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(LS_SESSION_KEY);
      }
      return next;
    });
  }, []);

  // ── Mescla dados parciais na sessão atual ─────────────────────────────────
  const updateSession = useCallback((partial) => {
    setSession((prev) => (prev ? { ...prev, ...partial } : prev));
  }, [setSession]);

  // ── Logout: limpa estado + invalida server-side (best-effort) ────────────
  const logout = useCallback(async () => {
    setSessionRaw((prev) => {
      if (prev?.access_token) {
        import("../services/auth").then(({ default: a }) =>
          a.signOut(prev.access_token).catch(() => {})
        );
      }
      return null;
    });
    localStorage.removeItem(LS_SESSION_KEY);
  }, []);

  // ── Refresh de token: preserva campos de perfil do prev ──────────────────
  //
  // CORREÇÃO: não re-hidrata no refresh (seria uma query extra a cada ciclo).
  // Os campos de perfil (therapist_id, role, name) mudam raramente e já estão
  // no session persistido. Apenas os tokens são substituídos.
  const tryRefresh = useCallback(
    async (currentSession) => {
      if (!currentSession?.refresh_token) return;
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        const data = await auth.refresh(currentSession.refresh_token);
        if (data?.access_token) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,                                          // ← preserva therapist_id, role, name, etc.
                  access_token:  data.access_token,
                  refresh_token: data.refresh_token ?? prev.refresh_token,
                }
              : prev
          );
        }
      } catch (e) {
        // CORREÇÃO: Verifica se é um erro de falta de internet ou falha de rede do fetch
        if (!navigator.onLine || e.message === "Failed to fetch" || e.name === "TypeError") {
          console.warn("[useSession] Sem conexão de rede no arranque. A manter a sessão offline.");
          return; // Interrompe a função sem apagar o login do utilizador
        }
        
        console.warn("[useSession] Refresh falhou, deslogando:", e.message);
        setSession(null);
      } finally {
        refreshingRef.current = false;
      }
    },
    [setSession]
  );

  // ── Na montagem: carrega sessão persistida + refresh preventivo ──────────
  useEffect(() => {
    const persisted = readPersistedSession();

    if (persisted) {
      // Restaura otimisticamente para que a UI renderize imediatamente
      setSessionRaw(persisted);
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(persisted));

      const needsHydration =
        !persisted.therapist_id && !persisted.role;

      // Se os campos de perfil estiverem ausentes (ex: sessão antiga salva
      // antes desta correção), re-hidrata uma única vez.
      if (needsHydration) {
        hydrateSession(persisted)
          .then((hydrated) => {
            setSession(hydrated);
          })
          .catch(() => {})
          .finally(() => {
            tryRefresh(persisted).finally(() => setSessionReady(true));
          });
      } else {
        tryRefresh(persisted).finally(() => setSessionReady(true));
      }
    } else {
      setSessionReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh periódico ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.refresh_token) return;
    const id = setInterval(
      () => tryRefresh(session),
      TOKEN_REFRESH_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [session?.refresh_token, tryRefresh]);

  // ── Escuta eventos 401 emitidos por db.js ─────────────────────────────────
  useEffect(() => {
    const handle = () => {
      console.warn("[useSession] equilibre-unauthorized — forçando logout");
      setSession(null);
    };
    window.addEventListener("equilibre-unauthorized", handle);
    return () => window.removeEventListener("equilibre-unauthorized", handle);
  }, [setSession]);

  return { session, setSession, updateSession, logout, sessionReady };
}

/**
 * Retorna o tema persistido para o userId fornecido.
 * Padrão: 'light'.
 *
 * @param {string|null} userId
 * @returns {'light'|'dark'}
 */
export function readPersistedTheme(userId) {
  if (!userId) return "light";
  return localStorage.getItem(`${LS_THEME_PREFIX}${userId}`) === "dark"
    ? "dark"
    : "light";
}