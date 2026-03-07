const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error("[db] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos.");
}

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

function makeHeaders(token, extra = {}) {
  return {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${token || SUPA_KEY}`,
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

const db = {
  /**
   * @param {string} table
   * @param {{ select?: string, filter?: Record<string,any>, filterIn?: Record<string,any[]>, order?: string }} options
   * @param {string|null} token
   * @returns {Promise<any[]>}
   */
  async query(table, options = {}, token = null) {
    // Short-circuit: if any filterIn array is empty, there are no matching rows.
    if (hasEmptyFilterIn(options)) return [];

    const url = buildUrl(table, options);
    const res = await fetch(url, {
      cache: "no-store",
      headers: makeHeaders(token),
    });

    await handleResponse(res, "query");
    return res.json();
  },

  /**
   * @param {string} table
   * @param {object} data
   * @param {string|null} token
   * @returns {Promise<object>}
   */
  async insert(table, data, token = null) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: makeHeaders(token, { Prefer: "return=representation" }),
      body: JSON.stringify(data),
    });

    await handleResponse(res, "insert");
    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
  },

  /**
   * @param {string} table
   * @param {Record<string,any>} filter   — only eq filters supported
   * @param {object} data
   * @param {string|null} token
   * @returns {Promise<object|null>}
   */
  async update(table, filter, data, token = null) {
    const url = buildUrl(table, { filter });
    const res = await fetch(url, {
      method: "PATCH",
      headers: makeHeaders(token, { Prefer: "return=representation" }),
      body: JSON.stringify(data),
    });

    await handleResponse(res, "update");
    const json = await res.json();
    if (Array.isArray(json)) return json[0] ?? null;
    return json ?? null;
  },

  /**
   * @param {string} table
   * @param {Record<string,any>} filter
   * @param {string|null} token
   * @returns {Promise<true>}
   */
  async delete(table, filter, token = null) {
    const url = buildUrl(table, { filter });
    const res = await fetch(url, {
      method: "DELETE",
      headers: makeHeaders(token),
    });

    await handleResponse(res, "delete");
    return true;
  },
};

export default db;