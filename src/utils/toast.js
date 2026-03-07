/**
 * Sistema de toasts baseado em eventos — sem Context, sem Provider.
 * Qualquer componente pode chamar toast.success("msg") e o ToastContainer
 * vai exibi-lo automaticamente.
 */

const listeners = new Set();

let _id = 0;

function emit(toast) {
  listeners.forEach((fn) => fn(toast));
}

export const toast = {
  success: (message, duration = 3500) => emit({ id: ++_id, message, type: "success", duration }),
  error:   (message, duration = 4500) => emit({ id: ++_id, message, type: "error",   duration }),
  info:    (message, duration = 3500) => emit({ id: ++_id, message, type: "info",    duration }),
  warning: (message, duration = 4000) => emit({ id: ++_id, message, type: "warning", duration }),

  subscribe:   (fn) => { listeners.add(fn);    return () => listeners.delete(fn); },
  unsubscribe: (fn) => listeners.delete(fn),
};

export default toast;