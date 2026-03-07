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
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const style = { width: size, height: size, cursor: onClick ? "pointer" : "default" };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto de ${name}`}
        className={className}
        style={{ ...style, objectFit: "cover", borderRadius: "50%" }}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      className={className}
      style={style}
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