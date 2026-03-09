import "./Skeleton.css";

/**
 * Skeleton — componente base con animación shimmer.
 *
 * Variantes prontas:
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonStatCard />
 *   <SkeletonPatientRow />
 *   <SkeletonExCard />
 *   <SkeletonDashboard />
 *   <SkeletonList rows={4} />
 *   <SkeletonResponses />
 */

/* ── Base block ─────────────────────────────────────────────────────────── */
export function Skeleton({ width = "100%", height = 16, radius = 8 }) {
  return (
    <div
      aria-hidden="true"
      className="skeleton-block"
      style={{
        "--sk-w": typeof width === "number" ? `${width}px` : width,
        "--sk-h": typeof height === "number" ? `${height}px` : height,
        "--sk-r": typeof radius === "number" ? `${radius}px` : radius,
      }}
    />
  );
}

/* ── Text lines ─────────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 3 }) {
  const widths = ["100%", "88%", "72%", "60%", "80%", "45%"];
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={13} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/* ── Stat card skeleton ─────────────────────────────────────────────────── */
export function SkeletonStatCard() {
  return (
    <div className="stat-card skeleton-stat-card" aria-hidden="true">
      <Skeleton width={32} height={32} radius={8} />
      <Skeleton width="55%" height={34} radius={8} />
      <Skeleton width="70%" height={12} />
    </div>
  );
}

/* ── Generic card skeleton ──────────────────────────────────────────────── */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <Skeleton width="60%" height={18} />
      <SkeletonText lines={lines} />
    </div>
  );
}

/* ── Patient row skeleton ───────────────────────────────────────────────── */
export function SkeletonPatientRow() {
  return (
    <div className="skeleton-patient-row" aria-hidden="true">
      <Skeleton width={40} height={40} radius="50%" />
      <div className="skeleton-patient-row__info">
        <Skeleton width="45%" height={13} />
        <Skeleton width="65%" height={11} />
      </div>
      <Skeleton width={80} height={30} radius={8} />
    </div>
  );
}

/* ── Exercise card skeleton ─────────────────────────────────────────────── */
export function SkeletonExCard() {
  return (
    <div className="ex-card skeleton-ex-card" aria-hidden="true">
      <Skeleton width={70} height={20} radius={20} />
      <Skeleton width="80%" height={18} />
      <SkeletonText lines={2} />
      <div className="skeleton-ex-card__footer">
        <Skeleton width={60} height={12} />
        <Skeleton width={80} height={28} radius={8} />
      </div>
    </div>
  );
}

/* ── List rows skeleton ─────────────────────────────────────────────────── */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-list__item">
          <SkeletonPatientRow />
          {i < rows - 1 && <div className="skeleton-list__divider" />}
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard skeleton ─────────────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div aria-label="Cargando dashboard..." aria-busy="true">
      <div className="skeleton-dashboard__header">
        <Skeleton width="42%" height={28} />
        <Skeleton width="60%" height={14} />
      </div>

      <div className="grid-3 skeleton-dashboard__stats">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="card">
        <Skeleton width="35%" height={18} />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}

/* ── Responses skeleton ─────────────────────────────────────────────────── */
export function SkeletonResponses() {
  return (
    <div aria-busy="true">
      <div className="skeleton-responses__header">
        <Skeleton width="38%" height={28} />
        <Skeleton width="55%" height={14} />
      </div>

      <div className="grid-2 skeleton-responses__grid">
        <div className="card skeleton-responses__sidebar">
          <Skeleton width="50%" height={16} />
          {[80, 100, 90, 75].map((w, i) => (
            <Skeleton key={i} height={36} width={`${w}%`} />
          ))}
        </div>

        <div className="skeleton-responses__cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card skeleton-responses__card">
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={11} />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;