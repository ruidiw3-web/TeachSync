import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas, #F5F5F7)',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          background: '#fff',
          border: '1px solid #E0E0E0',
          borderRadius: 12,
          padding: '28px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F' }}>页面不存在</div>
        <div style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.6 }}>
          这个地址没有对应的页面，可能是链接过期或者输入有误。
        </div>
        <Link
          href="/today"
          style={{
            marginTop: 6,
            alignSelf: 'flex-start',
            height: 34,
            padding: '0 16px',
            borderRadius: 17,
            background: '#0066CC',
            color: '#fff',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          回到工作台
        </Link>
      </div>
    </div>
  )
}
