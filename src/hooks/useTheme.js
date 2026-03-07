import { useState, useEffect, useCallback } from "react";
import { LS_THEME_PREFIX } from "../utils/constants";

/**
 * Manages the light/dark theme.
 *
 * - Applies/removes the `dark-mode` class on `document.body`
 * - Persists preference per user in localStorage
 * - Resets to 'light' when there is no active session
 *
 * @param {string|null} userId  — from session.id (null when logged out)
 * @returns {{ theme: 'light'|'dark', toggleTheme: Function }}
 */
export function useTheme(userId) {
  const [theme, setTheme] = useState(() => {
    if (!userId) return "light";
    return localStorage.getItem(`${LS_THEME_PREFIX}${userId}`) === "dark"
      ? "dark"
      : "light";
  });

  // Re-read from storage whenever userId changes (login/logout)
  useEffect(() => {
    if (!userId) {
      setTheme("light");
      return;
    }
    const stored = localStorage.getItem(`${LS_THEME_PREFIX}${userId}`);
    setTheme(stored === "dark" ? "dark" : "light");
  }, [userId]);

  // Apply class to body and persist
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    if (userId) {
      localStorage.setItem(`${LS_THEME_PREFIX}${userId}`, theme);
    }
  }, [theme, userId]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}