const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const storage = {
  /**
   * Uploads an avatar file to Supabase Storage.
   * Returns the public URL of the uploaded file.
   *
   * @param {File} file
   * @param {string} userId
   * @param {string} token  — user's access_token (required for authenticated bucket)
   * @returns {Promise<string>} public URL
   */
  async uploadAvatar(file, userId, token) {
    if (!file) throw new Error("Nenhum ficheiro selecionado.");
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error("A foto deve ter no máximo 2 MB.");
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      throw new Error("Formato não suportado. Use JPEG, PNG, WebP ou GIF.");
    }

    const ext = file.name.split(".").pop().toLowerCase();
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const res = await fetch(`${SUPA_URL}/storage/v1/object/${filePath}`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type here — let the browser set it with the boundary
      },
      body: file,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Erro ao carregar foto.");
    }

    return `${SUPA_URL}/storage/v1/object/public/${filePath}`;
  },
};

export default storage;