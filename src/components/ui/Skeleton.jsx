import "./Skeleton.css";

/**
 * Skeleton — componente base com animação shimmer.
 *
 * Variantes prontas:
 * <SkeletonText lines={3} />
 * <SkeletonCard />
 * <SkeletonStatCard />
 * <SkeletonPatientRow />
 * <SkeletonExCard />
 * <SkeletonDashboard />
 * <SkeletonList rows={4} />
 */

/* ── Base block ─────────────────────────────────────────────────────────── */
export function Skeleton({ width = "100%", height = 16, radius = 8, className = "" }) {
  const dynamicStyle = {
    "--skel-w": typeof width === "number" ? `${width}px` : width,
    "--skel-h": typeof height === "number" ? `${height}px` : height,
    "--skel-r": typeof radius === "number" ? `${radius}px` : radius,
  };

  return (
    <div
      className={`skel-base ${className}`.trim()}
      aria-hidden="true"
      style={dynamicStyle}
    />
  );
}

/* ── Text lines ─────────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 3, gap = 8 }) {
  const widths = ["100%", "88%", "72%", "60%", "80%", "45%"];
  
  return (
    <div className="skel-text-wrapper" style={{ "--skel-gap": `${gap}px` }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={13} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/* ── Stat card skeleton ─────────────────────────────────────────────────── */
export function SkeletonStatCard() {
  return (
    <div className="skel-stat-card" aria-hidden="true">
      <Skeleton width={32} height={32} radius={8} className="skel-mb-md" />
      <Skeleton width="55%" height={34} radius={8} className="skel-mb-sm" />
      <Skeleton width="70%" height={12} />
    </div>
  );
}

/* ── Generic card skeleton ──────────────────────────────────────────────── */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="skel-card" aria-hidden="true">
      <Skeleton width="60%" height={18} className="skel-mb-lg" />
      <SkeletonText lines={lines} />
    </div>
  );
}

/* ── Patient row skeleton ───────────────────────────────────────────────── */
export function SkeletonPatientRow() {
  return (
    <div className="skel-row" aria-hidden="true">
      <Skeleton width={40} height={40} radius="50%" className="skel-row-avatar" />
      <div className="skel-row-content">
        <Skeleton width="45%" height={13} className="skel-mb-xs" />
        <Skeleton width="65%" height={11} />
      </div>
      <Skeleton width={80} height={30} radius={8} />
    </div>
  );
}

/* ── Exercise card skeleton ─────────────────────────────────────────────── */
export function SkeletonExCard() {
  return (
    <div className="skel-card skel-ex-card" aria-hidden="true">
      <Skeleton width={70} height={20} radius={20} className="skel-mb-md" />
      <Skeleton width="80%" height={18} className="skel-mb-sm" />
      <SkeletonText lines={2} />
      <div className="skel-ex-footer">
        <Skeleton width={60} height={12} />
        <Skeleton width={80} height={28} radius={8} />
      </div>
    </div>
  );
}

/* ── List rows skeleton ─────────────────────────────────────────────────── */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="skel-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <SkeletonPatientRow />
          {i < rows - 1 && <div className="skel-divider" />}
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard skeleton ─────────────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div aria-label="A carregar dashboard..." aria-busy="true">
      <div className="skel-header">
        <Skeleton width="42%" height={28} className="skel-mb-sm" />
        <Skeleton width="60%" height={14} />
      </div>

      <div className="skel-grid-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="skel-card">
        <Skeleton width="35%" height={18} className="skel-mb-lg" />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}

/* ── Responses skeleton ─────────────────────────────────────────────────── */
export function SkeletonResponses() {
  return (
    <div aria-busy="true">
      <div className="skel-header">
        <Skeleton width="38%" height={28} className="skel-mb-sm" />
        <Skeleton width="55%" height={14} />
      </div>
      
      <div className="skel-grid-2">
        <div className="skel-card">
          <Skeleton width="50%" height={16} className="skel-mb-md" />
          {[80, 100, 90, 75].map((w, i) => (
            <Skeleton key={i} height={36} width={`${w}%`} className="skel-mb-sm" />
          ))}
        </div>
        
        <div className="skel-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel-card">
              <Skeleton width="60%" height={16} className="skel-mb-sm" />
              <Skeleton width="40%" height={11} className="skel-mb-lg" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;