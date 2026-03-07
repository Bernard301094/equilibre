const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

async function parseAuthResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error_description ||
      data?.msg ||
      data?.message ||
      "Erro de autenticação.";
    throw new Error(msg);
  }
  return data;
}

const auth = {
  /**
   * Creates a new Supabase Auth user.
   * Note: Supabase may return 200 even for existing emails (email confirmation flow).
   * The caller should handle the "already registered" case by catching and retrying signIn.
   */
  async signUp(email, password, metaData = {}) {
    const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: metaData }),
    });
    return parseAuthResponse(res);
  },

  /**
   * Signs in with email + password.
   * Returns the full Supabase auth response including access_token, refresh_token, user.
   */
  async signIn(email, password) {
    const res = await fetch(
      `${SUPA_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );
    return parseAuthResponse(res);
  },

  /**
   * Refreshes the JWT using the stored refresh_token.
   * Returns new access_token + refresh_token.
   */
  async refresh(refreshToken) {
    const res = await fetch(
      `${SUPA_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    return parseAuthResponse(res);
  },

  /**
   * Sends a password recovery email.
   * redirectTo ensures the link points back to this app, not the Supabase dashboard.
   */
  async resetPassword(email) {
    const redirectTo = `${window.location.origin}/`;
    const res = await fetch(`${SUPA_URL}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, options: { redirectTo } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || err.msg || "Erro ao enviar e-mail de recuperação."
      );
    }
  },

  /**
   * Invalidates the current session server-side.
   * Best-effort — failure does not block the local logout.
   */
  async signOut(accessToken) {
    try {
      await fetch(`${SUPA_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (e) {
      console.warn("[auth.signOut] best-effort failure:", e);
    }
  },
};

export default auth;