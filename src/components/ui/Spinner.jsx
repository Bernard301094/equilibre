/**
 * Full-screen centered loading spinner.
 * Used while the app is connecting or session is resolving.
 *
 * Props:
 *   message — optional text below the spinner
 */
export default function Spinner({ message = "Conectando ao Equilibre..." }) {
  return (
    <div
      className="spinner"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="spin" aria-hidden="true" />
      {message && <span>{message}</span>}
    </div>
  );
}