/**
 * usePushNotifications.js
 *
 * React hook that manages the full Web Push lifecycle:
 *   1. Requests notification permission
 *   2. Subscribes via PushManager
 *   3. Saves the subscription to Supabase (push_subscriptions table)
 *   4. Listens for SW messages (NAVIGATE, PUSH_SUBSCRIPTION_CHANGED)
 *
 * Usage:
 *   const { supported, permission, subscribe, unsubscribe } =
 *     usePushNotifications({ session, setView });
 *
 * Required env var:
 *   VITE_VAPID_PUBLIC_KEY — your VAPID public key (base64url)
 *
 * Required Supabase table:
 *   push_subscriptions (id, user_id, subscription jsonb, created_at)
 */

import { useState, useEffect, useCallback } from "react";
import db from "../services/db";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert base64url VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications({ session, setView } = {}) {
  const supported   = "serviceWorker" in navigator && "PushManager" in window;
  const [permission, setPermission] = useState(
    supported ? Notification.permission : "denied"
  );
  const [subscribed, setSubscribed] = useState(false);

  // ── Listen for SW navigation messages ──
  useEffect(() => {
    if (!supported) return;
    const onMessage = (event) => {
      if (event.data?.type === "NAVIGATE" && setView) {
        const url = event.data.url ?? "/";
        // Map URL paths to view names
        if (url.includes("exercise")) setView("exercises");
        else if (url.includes("diary"))    setView("diary");
        else                               setView("home");
      }
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        // Re-save rotated subscription
        saveSubscription(event.data.subscription, session);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [supported, session, setView]);

  // ── Check existing subscription on mount ──
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, [supported]);

  // ── Request permission + subscribe ──
  const subscribe = useCallback(async () => {
    if (!supported) return { ok: false, reason: "not_supported" };
    if (!VAPID_PUBLIC_KEY) {
      console.error("[push] VITE_VAPID_PUBLIC_KEY não definido.");
      return { ok: false, reason: "no_vapid_key" };
    }

    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    setPermission(perm);

    if (perm !== "granted") return { ok: false, reason: "permission_denied" };

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:     true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await saveSubscription(JSON.parse(JSON.stringify(sub)), session);
      setSubscribed(true);
      return { ok: true, subscription: sub };
    } catch (e) {
      console.error("[push] Falha ao subscrever:", e);
      return { ok: false, reason: e.message };
    }
  }, [supported, session]);

  // ── Unsubscribe ──
  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      // Remove from Supabase
      if (session?.id) {
        await db.delete("push_subscriptions", { user_id: session.id }, session.access_token)
          .catch(() => {});
      }
      setSubscribed(false);
    }
  }, [supported, session]);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}

// ── Persist subscription to Supabase ──
async function saveSubscription(subscription, session) {
  if (!session?.id) return;
  try {
    // Upsert: delete old then insert new (Supabase anon key upsert needs RLS setup)
    await db.delete("push_subscriptions", { user_id: session.id }, session.access_token)
      .catch(() => {});
    await db.insert(
      "push_subscriptions",
      {
        id:           "ps_" + session.id,
        user_id:      session.id,
        subscription: subscription,
        created_at:   new Date().toISOString(),
      },
      session.access_token
    );
  } catch (e) {
    console.warn("[push] Erro ao salvar subscrição:", e);
  }
}