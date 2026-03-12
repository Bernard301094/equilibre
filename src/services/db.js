/**
 * db.js — Equilibre data layer
 *
 * Offline-first enhancements:
 * • IndexedDB queue for insert/update/delete mutations
 * • Auto-sync when connection is restored
 * • Dispatches "equilibre-sync-status" events for UI feedback
 *
 * CORREÇÃO CRÍTICA (makeHeaders):
 * Authorization: `Bearer ${token || SUPA_KEY}` causava fallback silencioso
 * para a anon key quando token era null/undefined. O Supabase recebia a anon
 * key como Bearer → auth.uid() = null → RLS bloqueava INSERT/UPDATE sem erro.
 * Fix: mutations (insert/update/delete) exigem token explícito e lançam erro
 * claro se ausente. Queries públicas mantêm o fallback para a anon key.
 */

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error("[db] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos.");
}

/* ─────────────────────────────────────────────────────────────
   IndexedDB helpers
───────────────────────────────────────────────────────────── */
const IDB_NAME    = "equilibre_offline";
const IDB_VERSION = 1;
const STORE_NAME  = "mutation_queue";

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "queueId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbEnqueue(mutation) {
  const idb   = await openIDB();
  return new Promise((resolve, reject) => {
    const tx    = idb.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add({ ...mutation, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbDequeue(queueId) {
  const idb   = await openIDB();
  return new Promise((resolve, reject) => {
    const tx    = idb.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(queueId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function idbGetAll() {
  const idb   = await openIDB();
  return new Promise((resolve, reject) => {
    const tx    = idb.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/* ─────────────────────────────────────────────────────────────
   Helper: detecta erro de rede real (sem conexão)
───────────────────────────────────────────────────────────── */
function isNetworkError(e) {
  return (
    !navigator.onLine ||
    e.message === "Failed to fetch" ||
    e.message === "Network request failed" ||
    e.name    === "NetworkError"
  );
}

/* ─────────────────────────────────────────────────────────────
   Sync engine — replays queued mutations against Supabase
───────────────────────────────────────────────────────────── */
let syncInProgress = false;

function emitSyncStatus(status, count = 0) {
  window.dispatchEvent(new CustomEvent("equilibre-sync-status", {
    detail: { status, count },
  }));
}

async function flushQueue() {
  if (syncInProgress || !navigator.onLine) return;
  const pending = await idbGetAll();
  if (pending.length === 0) return;

  syncInProgress = true;
  emitSyncStatus("syncing", pending.length);

  let failed = 0;
  for (const item of pending) {
    try {
      await replayMutation(item);
      // Éxito: se procesó correctamente, lo quitamos de la cola
      await idbDequeue(item.queueId);
    } catch (e) {
      console.warn("[db] Sync falhou para item", item.queueId, e);
      
      // SOLUCIÓN: Si no es un error de red (el servidor rechazó la petición por RLS, token, etc.),
      // obligatoriamente lo sacamos de la cola para evitar el bucle infinito.
      if (!isNetworkError(e)) {
        console.warn("[db] Erro definitivo do servidor. Removendo item corrompido da fila offline para evitar loop.");
        await idbDequeue(item.queueId);
      } else {
        // Es una falla real de conexión. Se queda en la cola para el próximo intento.
        failed++;
      }
    }
  }

  syncInProgress = false;
  emitSyncStatus(failed === 0 ? "synced" : "error", pending.length - failed);
}

async function replayMutation({ method, table, filter, data, token }) {
  switch (method) {
    case "insert": return db.insert(table, data, token);
    case "update": return db.update(table, filter, data, token);
    case "delete": return db.delete(table, filter, token);
    default: throw new Error(`[db] Método de replay desconhecido: ${method}`);
  }
}

window.addEventListener("online", () => {
  console.info("[db] Conexão restaurada — sincronizando fila offline…");
  flushQueue();
});

window.addEventListener("focus", () => {
  if (navigator.onLine) flushQueue();
});

/* ─────────────────────────────────────────────────────────────
   Core helpers
───────────────────────────────────────────────────────────── */
function fireUnauthorized() {
  window.dispatchEvent(new Event("equilibre-unauthorized"));
}

function buildUrl(table, options = {}) {
  let url = `${SUPA_URL}/rest/v1/${table}?`;
  if (options.select) {
    url += `select=${options.select.replace(/\s+/g, "")}&`;
  }
  if (options.filter) {
    for (const [k, v] of Object.entries(options.filter)) {
      url += `${k}=eq.${encodeURIComponent(v)}&`;
    }
  }
  if (options.filterIn) {
    for (const [k, vals] of Object.entries(options.filterIn)) {
      if (!Array.isArray(vals) || vals.length === 0) continue;
      url += `${k}=in.(${vals.map(encodeURIComponent).join(",")})&`;
    }
  }
  if (options.order) {
    url += `order=${options.order}&`;
  }
  return url;
}

function hasEmptyFilterIn(options = {}) {
  if (!options.filterIn) return false;
  return Object.values(options.filterIn).some(
    (vals) => Array.isArray(vals) && vals.length === 0
  );
}

/**
 * Headers para queries públicas (SELECT sem RLS restritivo).
 * Mantém fallback para anon key quando token está ausente.
 */
function makeQueryHeaders(token, extra = {}) {
  return {
    apikey:         SUPA_KEY,
    Authorization:  `Bearer ${token || SUPA_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * ✅ CORRIGIDO — Headers para mutations (INSERT / UPDATE / DELETE).
 */
function makeMutationHeaders(token, extra = {}) {
  if (!token) {
    throw new Error(
      "[db] access_token ausente numa operação de escrita. " +
      "Certifica-te de que session.access_token está a ser passado ao chamar " +
      "db.insert / db.update / db.delete."
    );
  }
  return {
    apikey:         SUPA_KEY,
    Authorization:  `Bearer ${token}`,   // ← nunca faz fallback para anon key
    "Content-Type": "application/json",
    ...extra,
  };
}

async function handleResponse(res, context) {
  if (res.status === 401) {
    fireUnauthorized();
    throw new Error("Sessão expirada.");
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = [err.message, err.msg, err.hint, err.details]
        .filter(Boolean)
        .join(" | ") || detail;
    } catch (_) {}
    throw new Error(`[db.${context}] ${detail}`);
  }
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */
const db = {
  /**
   * Leituras sempre vão para a rede (não são enfileiradas offline).
   */
  async query(table, options = {}, token = null) {
    if (hasEmptyFilterIn(options)) return [];
    const url = buildUrl(table, options);
    const res = await fetch(url, {
      cache:   "no-store",
      headers: makeQueryHeaders(token),
    });
    await handleResponse(res, "query");
    return res.json();
  },

  /**
   * Insert: tenta sempre a rede primeiro.
   */
  async insert(table, data, token = null) {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method:  "POST",
        headers: makeMutationHeaders(token, { Prefer: "return=representation" }),
        body:    JSON.stringify(data),
      });
      await handleResponse(res, "insert");
      const json = await res.json();
      return Array.isArray(json) ? json[0] : json;
    } catch (e) {
      if (isNetworkError(e)) {
        await idbEnqueue({ method: "insert", table, data, token });
        console.info(`[db] Offline — insert em "${table}" enfileirado.`);
        return data;
      }
      throw e;
    }
  },

  /**
   * Update: tenta sempre a rede primeiro.
   */
  async update(table, filter, data, token = null) {
    try {
      const url = buildUrl(table, { filter });
      const res = await fetch(url, {
        method:  "PATCH",
        headers: makeMutationHeaders(token, { Prefer: "return=representation" }),
        body:    JSON.stringify(data),
      });
      await handleResponse(res, "update");
      const json = await res.json();
      if (Array.isArray(json)) return json[0] ?? null;
      return json ?? null;
    } catch (e) {
      if (isNetworkError(e)) {
        await idbEnqueue({ method: "update", table, filter, data, token });
        console.info(`[db] Offline — update em "${table}" enfileirado.`);
        return data;
      }
      throw e;
    }
  },

  /**
   * Delete: tenta sempre a rede primeiro.
   */
  async delete(table, filter, token = null) {
    try {
      const url = buildUrl(table, { filter });
      const res = await fetch(url, {
        method:  "DELETE",
        headers: makeMutationHeaders(token),
      });
      await handleResponse(res, "delete");
      return true;
    } catch (e) {
      if (isNetworkError(e)) {
        await idbEnqueue({ method: "delete", table, filter, token });
        console.info(`[db] Offline — delete em "${table}" enfileirado.`);
        return true;
      }
      throw e;
    }
  },

  /** Expõe flush manual para debugging / pull-to-refresh. */
  flushQueue,

  /** Retorna o número de itens pendentes na fila offline. */
  async getPendingCount() {
    const items = await idbGetAll();
    return items.length;
  },
};

export default db;