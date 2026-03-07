import { useState, useEffect, useRef, useCallback } from "react";
import db from "../services/db";

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls for unread notifications for a therapist.
 * Plays a subtle sound when the count increases after the first load.
 *
 * @param {string} therapistId
 * @returns {{ unreadCount: number, markAllRead: Function }}
 */
export function useNotifications(therapistId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef(null); // null = first load not yet done
  const audioCtxRef = useRef(null);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      audioCtxRef.current = new AC();
    }
  }, []);

  const playSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("[useNotifications] audio error:", e);
    }
  }, []);

  // Init audio on first user interaction
  useEffect(() => {
    window.addEventListener("click", initAudio, { once: true });
    window.addEventListener("keydown", initAudio, { once: true });
    return () => {
      window.removeEventListener("click", initAudio);
      window.removeEventListener("keydown", initAudio);
    };
  }, [initAudio]);

  const fetchUnread = useCallback(async () => {
    if (!therapistId) return;
    try {
      const rows = await db.query("notifications", {
        filter: { therapist_id: therapistId, read: false },
        select: "id",
      });
      const count = Array.isArray(rows) ? rows.length : 0;

      setUnreadCount(count);

      // Play sound only when count increases after first load
      if (prevCountRef.current !== null && count > prevCountRef.current) {
        playSound();
      }
      prevCountRef.current = count;
    } catch (e) {
      // Non-critical — swallow silently
    }
  }, [therapistId, playSound]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    prevCountRef.current = 0;
  }, []);

  return { unreadCount, markAllRead };
}