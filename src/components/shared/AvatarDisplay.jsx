import "./AvatarDisplay.css";

function stringToColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue        = Math.abs(hash) % 360;
  const saturation = 55 + (Math.abs(hash >> 8)  % 20);
  const lightness  = 38 + (Math.abs(hash >> 16) % 14);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function AvatarDisplay({
  name      = "?",
  avatarUrl,
  size      = 40,
  onClick,
  title,
  className = "avatar",
}) {
  const initial   = name.trim()[0]?.toUpperCase() ?? "?";
  const fontSize  = size * 0.42;
  const isButton  = !!onClick;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Foto de ${name}`}
        className={`avatar-display avatar-display--photo ${className}`}
        style={{ width: size, height: size }}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      className={`avatar-display avatar-display--initials ${className}`}
      style={{
        width:      size,
        height:     size,
        background: stringToColor(name),
        fontSize,
      }}
      onClick={onClick}
      title={title}
      role={isButton ? "button" : undefined}
      tabIndex={isButton ? 0 : undefined}
      aria-label={isButton ? title : undefined}
      onKeyDown={
        isButton
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(e)
          : undefined
      }
    >
      {initial}
    </div>
  );
}