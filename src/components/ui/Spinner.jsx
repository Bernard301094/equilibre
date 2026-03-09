import "./Spinner.css";

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
      <div className="spinner__ring" aria-hidden="true" />
      {message && (
        <span className="spinner__message">{message}</span>
      )}
    </div>
  );
}