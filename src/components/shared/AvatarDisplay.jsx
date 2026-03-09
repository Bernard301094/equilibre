import "./AvatarDisplay.css";

/**
 * Generates a deterministic, vibrant HSL background color from a string.
 * Same name → always same color, across sessions and devices.
 */
function stringToColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue        = Math.abs(hash) % 360;
  const saturation = 55 + (Math.abs(hash >> 8)  % 20); // 55–75%
  const lightness  = 38 + (Math.abs(hash >> 16) % 14); // 38–52%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Displays a user avatar: photo if available, initial letter otherwise.
 *
 * Props:
 * name        — user's display name (used for initial fallback)
 * avatarUrl   — optional URL string
 * size        — diameter in px (default: 40)
 * onClick     — optional click handler
 * title       — tooltip text
 * className   — extra CSS class
 */
export default function AvatarDisplay({
  name = "?",
  avatarUrl,
  size = 40,
  onClick,
  title,
  className = "",
}) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  
  // Pasamos los valores dinámicos como variables CSS para mantener el HTML semántico
  const dynamicStyles = {
    "--avatar-size": `${size}px`,
    "--avatar-font-size": `${size * 0.42}px`,
    "--avatar-bg": stringToColor(name),
  };

  const containerClass = `avatar-display ${onClick ? "clickable" : ""} ${className}`.trim();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto de ${name}`}
        className={`${containerClass} avatar-image`}
        style={dynamicStyles}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      className={`${containerClass} avatar-initial`}
      style={dynamicStyles}
      onClick={onClick}
      title={title}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? title : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e)
          : undefined
      }
    >
      {initial}
    </div>
  );
}