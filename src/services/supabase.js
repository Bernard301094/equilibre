/**
 * src/services/supabase.js
 *
 * Cliente Supabase singleton — usado exclusivamente para
 * subscriptions Realtime (INSERT / UPDATE / DELETE em tempo real).
 *
 * As queries e mutations continuam a usar db.js (fetch direto),
 * que já tem a lógica de offline-queue, RLS headers e error handling.
 *
 * Uso:
 *   import supabase from "./supabase";
 *   const channel = supabase.channel("nome").on(...).subscribe();
 *   return () => supabase.removeChannel(channel);
 */
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.VITE_SUPABASE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error("[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos.");
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  auth: {
    // Não usamos a gestão de sessão do cliente supabase-js
    // (a sessão é gerida pelo nosso próprio auth flow).
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;