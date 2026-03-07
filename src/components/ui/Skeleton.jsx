/**
 * Skeleton — componente base com animação shimmer.
 *
 * Variantes prontas:
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonStatCard />
 *   <SkeletonPatientRow />
 *   <SkeletonExCard />
 *   <SkeletonDashboard />
 *   <SkeletonList rows={4} />
 */

const shimmerStyle = {
  background: "linear-gradient(90deg, var(--warm) 25%, var(--cream) 50%, var(--warm) 75%)",
  backgroundSize: "400px 100%",
  animation: "skeleton-shimmer 1.4s ease infinite",
  borderRadius: 8,
};

/* ── Base block ─────────────────────────────────────────────────────────── */
export function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{ ...shimmerStyle, width, height, borderRadius: radius, ...style }}
    />
  );
}

/* ── Text lines ─────────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 3, gap = 8 }) {
  const widths = ["100%", "88%", "72%", "60%", "80%", "45%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={13} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/* ── Stat card skeleton ─────────────────────────────────────────────────── */
export function SkeletonStatCard() {
  return (
    <div className="stat-card" aria-hidden="true">
      <Skeleton width={32} height={32} radius={8} style={{ marginBottom: 12 }} />
      <Skeleton width="55%" height={34} radius={8} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={12} />
    </div>
  );
}

/* ── Generic card skeleton ──────────────────────────────────────────────── */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton width="60%" height={18} style={{ marginBottom: 16 }} />
      <SkeletonText lines={lines} />
    </div>
  );
}

/* ── Patient row skeleton ───────────────────────────────────────────────── */
export function SkeletonPatientRow() {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}
      aria-hidden="true"
    >
      <Skeleton width={40} height={40} radius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton width="45%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="65%" height={11} />
      </div>
      <Skeleton width={80} height={30} radius={8} />
    </div>
  );
}

/* ── Exercise card skeleton ─────────────────────────────────────────────── */
export function SkeletonExCard() {
  return (
    <div className="ex-card" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <Skeleton width={70}  height={20} radius={20} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={18} style={{ marginBottom: 8 }} />
      <SkeletonText lines={2} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <Skeleton width={60} height={12} />
        <Skeleton width={80} height={28} radius={8} />
      </div>
    </div>
  );
}

/* ── List rows skeleton ─────────────────────────────────────────────────── */
export function SkeletonList({ rows = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <SkeletonPatientRow />
          {i < rows - 1 && (
            <div style={{ height: 1, background: "var(--warm)", margin: "2px 0" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard skeleton ─────────────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div aria-label="A carregar dashboard..." aria-busy="true">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Skeleton width="42%" height={28} style={{ marginBottom: 10 }} />
        <Skeleton width="60%" height={14} />
      </div>

      {/* Stat cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Recent patients */}
      <div className="card">
        <Skeleton width="35%" height={18} style={{ marginBottom: 18 }} />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}

/* ── Responses skeleton ─────────────────────────────────────────────────── */
export function SkeletonResponses() {
  return (
    <div aria-busy="true">
      <div style={{ marginBottom: 28 }}>
        <Skeleton width="38%" height={28} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={14} />
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <Skeleton width="50%" height={16} style={{ marginBottom: 14 }} />
          {[80, 100, 90, 75].map((w, i) => (
            <Skeleton key={i} height={36} width={`${w}%`} style={{ marginBottom: 8 }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card">
              <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={11} style={{ marginBottom: 16 }} />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;