export default function Loading() {
  return (
    <div className="page">
      <header className="tb">
        <h1 className="tb-title">加载中…</h1>
        <div className="tb-spacer" />
      </header>
      <div className="page-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skel"
              style={{ flex: 1, height: 64, borderRadius: 8 }}
            />
          ))}
        </div>
        <div className="skel" style={{ height: 320, borderRadius: 8 }} />
      </div>
    </div>
  )
}
