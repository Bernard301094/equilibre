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
 *   name        — user's display name (used for initial fallback)
 *   avatarUrl   — optional URL string
 *   size        — diameter in px (default: 40)
 *   onClick     — optional click handler
 *   title       — tooltip text
 *   className   — extra CSS class (default: "avatar")
 */
export default function AvatarDisplay({
  name = "?",
  avatarUrl,
  size = 40,
  onClick,
  title,
  className = "avatar",
}) {
  const initial    = name.trim()[0]?.toUpperCase() ?? "?";
  const baseStyle  = {
    width:         size,
    height:        size,
    borderRadius:  "50%",
    cursor:        onClick ? "pointer" : "inherit",
    pointerEvents: onClick ? "auto" : "none",
    flexShrink:    0,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto de ${name}`}
        className={className}
        style={{ ...baseStyle, objectFit: "cover" }}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background:     stringToColor(name),
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "#ffffff",
        fontWeight:     700,
        fontSize:       size * 0.42,
        fontFamily:     "'DM Sans', sans-serif",
        userSelect:     "none",
        letterSpacing:  "0.01em",
      }}
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