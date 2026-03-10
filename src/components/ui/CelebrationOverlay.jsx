import { useEffect, useRef, useState } from "react";
import "./CelebrationOverlay.css";

/**
 * CelebrationOverlay
 *
 * Renders a full-screen canvas of falling green leaves + an
 * affirming message card over the exercise done-screen.
 *
 * Props:
 *   active   — bool, triggers the animation
 *   duration — ms to run the leaf shower (default 3200)
 *   message  — override the headline
 */

const LEAF_EMOJIS = ["🍃", "🌿", "🌱", "🍀", "✨", "🌸"];

export default function CelebrationOverlay({
  active,
  duration = 3200,
  message = "Parabéns pelo seu autocuidado!",
}) {
  const canvasRef  = useRef(null);
  const frameRef   = useRef(null);
  const leavesRef  = useRef([]);
  const [show, setShow]    = useState(false);
  const [fading, setFading] = useState(false);

  /* spawn & animate leaves on canvas */
  useEffect(() => {
    if (!active) return;
    setShow(true);
    setFading(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const spawnLeaf = () => ({
      x:        Math.random() * canvas.width,
      y:        -50,
      vx:       (Math.random() - .5) * 2.2,
      vy:       1.4 + Math.random() * 2.2,
      angle:    Math.random() * Math.PI * 2,
      va:       (Math.random() - .5) * .08,
      emoji:    LEAF_EMOJIS[Math.floor(Math.random() * LEAF_EMOJIS.length)],
      size:     18 + Math.random() * 22,
      opacity:  .7 + Math.random() * .3,
      drift:    (Math.random() - .5) * .012,
    });

    // initial burst
    for (let i = 0; i < 28; i++) leavesRef.current.push(spawnLeaf());

    let spawning = true;
    const spawnTimer = setTimeout(() => { spawning = false; }, duration * .65);

    const intervalId = setInterval(() => {
      if (spawning) leavesRef.current.push(spawnLeaf());
    }, 90);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      leavesRef.current = leavesRef.current.filter((l) => l.y < canvas.height + 60);

      leavesRef.current.forEach((l) => {
        l.y     += l.vy;
        l.x     += l.vx;
        l.vx    += l.drift;
        l.angle += l.va;

        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.font        = `${l.size}px serif`;
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        ctx.fillText(l.emoji, -l.size / 2, l.size / 2);
        ctx.restore();
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, duration - 400);

    const hideTimer = setTimeout(() => {
      setShow(false);
      leavesRef.current = [];
      cancelAnimationFrame(frameRef.current);
    }, duration);

    return () => {
      clearTimeout(spawnTimer);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      clearInterval(intervalId);
      cancelAnimationFrame(frameRef.current);
    };
  }, [active, duration]);

  if (!show) return null;

  return (
    <div
      className={["cel-overlay", fading ? "cel-overlay--fade" : ""].filter(Boolean).join(" ")}
      aria-live="assertive"
      aria-label={message}
    >
      <canvas ref={canvasRef} className="cel-canvas" aria-hidden="true" />

      <div className="cel-card">
        <div className="cel-card__sparkles" aria-hidden="true">
          {["✨", "🌟", "✨"].map((s, i) => (
            <span key={i} className="cel-spark" style={{ "--i": i }}>{s}</span>
          ))}
        </div>
        <div className="cel-card__icon" aria-hidden="true">🌱</div>
        <h3 className="cel-card__title">{message}</h3>
        <p className="cel-card__sub">
          Cada passo conta. Você está cuidando de si mesmo(a).
        </p>
        <div className="cel-card__bar" aria-hidden="true">
          <div className="cel-card__bar-fill" />
        </div>
      </div>
    </div>
  );
}