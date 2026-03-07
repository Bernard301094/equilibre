import { useState, useEffect, useCallback, useRef } from "react";
import auth from "../services/auth";
import {
  LS_SESSION_KEY,
  LS_THEME_PREFIX,
  TOKEN_REFRESH_INTERVAL_MS,
} from "../utils/constants";

/**
 * Reads the persisted session from localStorage.
 * Returns null if absent or unparseable.
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
 * Central session hook.
 *
 * Responsibilities:
 *  - Load session from localStorage on mount
 *  - Attempt a preventive token refresh on mount (to catch expired sessions early)
 *  - Persist session to localStorage on every change
 *  - Periodic token refresh every TOKEN_REFRESH_INTERVAL_MS
 *  - Listen for the "equilibre-unauthorized" event to force logout
 *  - Expose `logout()` for explicit sign-out
 *  - Expose `updateSession()` for partial session updates (e.g. new avatar_url)
 *
 * @returns {{
 *   session: object|null,
 *   setSession: Function,
 *   updateSession: Function,
 *   logout: Function,
 *   sessionReady: boolean,
 * }}
 */
export function useSession() {
  const [session, setSessionRaw] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const refreshingRef = useRef(false);

  // ── Wrap setSession so every update also persists to localStorage ──────────
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

  // ── Convenience: merge partial data into the current session ───────────────
  const updateSession = useCallback((partial) => {
    setSession((prev) => (prev ? { ...prev, ...partial } : prev));
  }, [setSession]);

  // ── Logout: clear state + server-side invalidation (best-effort) ──────────
  const logout = useCallback(async () => {
    setSessionRaw((prev) => {
      if (prev?.access_token) {
        // fire-and-forget — don't await inside setState
        import("../services/auth").then(({ default: a }) =>
          a.signOut(prev.access_token).catch(() => {})
        );
      }
      return null;
    });
    localStorage.removeItem(LS_SESSION_KEY);
  }, []);

  // ── Helper: try to refresh tokens, update session if successful ───────────
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
                  ...prev,
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                }
              : prev
          );
        }
      } catch (e) {
        console.warn("[useSession] Refresh failed, logging out:", e.message);
        setSession(null);
      } finally {
        refreshingRef.current = false;
      }
    },
    [setSession]
  );

  // ── On mount: load persisted session + preventive refresh ─────────────────
  useEffect(() => {
    const persisted = readPersistedSession();
    if (persisted) {
      // Optimistically restore so the UI renders immediately
      setSessionRaw(persisted);
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(persisted));
      // Then validate/refresh asynchronously
      tryRefresh(persisted).finally(() => setSessionReady(true));
    } else {
      setSessionReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic refresh ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.refresh_token) return;
    const id = setInterval(() => tryRefresh(session), TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session?.refresh_token, tryRefresh]);

  // ── Listen for 401 events from db.js ─────────────────────────────────────
  useEffect(() => {
    const handle = () => {
      console.warn("[useSession] equilibre-unauthorized — forcing logout");
      setSession(null);
    };
    window.addEventListener("equilibre-unauthorized", handle);
    return () => window.removeEventListener("equilibre-unauthorized", handle);
  }, [setSession]);

  return { session, setSession, updateSession, logout, sessionReady };
}

/**
 * Returns the persisted theme for the given userId,
 * defaulting to 'light'.
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