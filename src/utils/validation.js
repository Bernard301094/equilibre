/**
 * Validates the therapist/patient registration form.
 *
 * @param {{ name: string, email: string, password: string, confirm: string, role: string, inviteCode?: string }} form
 * @returns {string|null}  error message or null if valid
 */
export function validateRegisterForm(form) {
  if (!form.name?.trim()) return "Informe o seu nome completo.";
  if (!form.email?.trim()) return "Informe o seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Informe um e-mail válido.";
  }
  if (!form.password || form.password.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (form.password !== form.confirm) {
    return "As senhas não coincidem.";
  }
  if (form.role === "patient" && !form.inviteCode?.trim()) {
    return "Informe o código de convite.";
  }
  return null;
}

/**
 * Validates the exercise creation/editing form.
 *
 * @param {{ title: string, description: string }} form
 * @param {Array<{ text: string, type: string }>} questions
 * @returns {string|null}
 */
export function validateExerciseForm(form, questions) {
  if (!form.title?.trim()) return "Informe o título do exercício.";
  if (form.title.trim().length < 3) return "O título deve ter pelo menos 3 caracteres.";
  if (!form.description?.trim()) return "Informe uma descrição breve.";
  if (!questions || questions.length === 0) {
    return "Adicione pelo menos uma pergunta ou instrução.";
  }
  for (let i = 0; i < questions.length; i++) {
    if (!questions[i].text?.trim()) {
      return `A ${i + 1}.ª pergunta não pode estar vazia.`;
    }
  }
  return null;
}

/**
 * Validates the login form.
 *
 * @param {{ email: string, password: string }} form
 * @returns {string|null}
 */
export function validateLoginForm(form) {
  if (!form.email?.trim()) return "Informe o e-mail.";
  if (!form.password) return "Informe a senha.";
  return null;
}

/**
 * Validates a diary entry before saving.
 *
 * @param {{ mood: number|null }} entry
 * @returns {string|null}
 */
export function validateDiaryEntry(entry) {
  if (entry.mood === null || entry.mood === undefined) {
    return "Selecione como você está se sentindo hoje.";
  }
  return null;
}

/**
 * Validates a new activity (Behavioral Activation) form.
 *
 * @param {{ title: string, date: string, time: string }} form
 * @returns {string|null}
 */
export function validateActivityForm(form) {
  if (!form.title?.trim()) return "Descreva o que você vai fazer.";
  if (!form.date) return "Informe o dia da atividade.";
  if (!form.time) return "Informe o horário da atividade.";
  return null;
}

/**
 * Validates a password reset request.
 *
 * @param {string} email
 * @returns {string|null}
 */
export function validateResetEmail(email) {
  if (!email?.trim()) return "Informe o seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Informe um e-mail válido.";
  }
  return null;
}

/**
 * Validates an invite code format (6–8 uppercase alphanumeric chars).
 *
 * @param {string} code
 * @returns {string|null}
 */
export function validateInviteCode(code) {
  if (!code?.trim()) return "Informe o código de convite.";
  if (!/^[A-Z0-9]{4,10}$/.test(code.trim())) {
    return "Código inválido. Verifique e tente novamente.";
  }
  return null;
}