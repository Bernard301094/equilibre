// src/services/profile.js
import db from "./db";

/**
 * Busca o perfil completo do usuário na tabela `users`
 * e mescla no objeto de sessão retornado pelo Supabase Auth.
 *
 * Deve ser chamado logo após auth.signIn() e auth.signUp().
 *
 * Por que é necessário?
 *  O Supabase Auth retorna apenas dados do JWT (id, email, etc.).
 *  Campos como `therapist_id` e `role` vivem na tabela `users`
 *  e precisam ser buscados explicitamente para popular o session.
 *
 * @param {object} rawSession  — retorno bruto de auth.signIn / auth.signUp
 * @returns {Promise<object>}  — sessão enriquecida com campos do perfil
 */
export async function hydrateSession(rawSession) {
  if (!rawSession?.access_token) return rawSession;

  // O Supabase Auth devolve o UUID em user.id (no signIn) ou direto em id
  const userId =
    rawSession.user?.id ??
    rawSession.id ??
    null;

  if (!userId) {
    console.warn("[hydrateSession] Não foi possível determinar o userId.", rawSession);
    return rawSession;
  }

  try {
    const rows = await db.query(
      "users",
      {
        filter: { id: userId },
        select: "id, name, role, therapist_id, email",
      },
      rawSession.access_token
    );

    const profile = Array.isArray(rows) ? rows[0] : rows;

    if (!profile) {
      console.warn("[hydrateSession] Perfil não encontrado para userId:", userId);
      return rawSession;
    }

    // Mescla: tokens do Auth + campos de perfil no nível raiz do objeto session
    return {
      ...rawSession,
      id:           profile.id,
      name:         profile.name,
      email:        profile.email ?? rawSession.user?.email ?? "",
      role:         profile.role,                     // "therapist" | "patient"
      therapist_id: profile.therapist_id ?? null,     // null para terapeutas
    };
  } catch (e) {
    console.error("[hydrateSession] Erro ao buscar perfil:", e.message);
    // Degradação graciosa: retorna a sessão sem o perfil
    // O usuário verá uma tela limitada, mas não será deslogado
    return rawSession;
  }
}