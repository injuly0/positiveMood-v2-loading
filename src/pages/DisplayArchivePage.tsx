export default function DisplayArchivePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        textAlign: 'center',
        color: '#6b5b95',
        background: 'linear-gradient(135deg, #f8f4ff 0%, #f0e8ff 50%, #f0f4ff 100%)',
      }}
    >
      <h2 style={{ fontWeight: 600, fontSize: 22, margin: '0 0 12px', color: '#2d2048' }}>
        信念之树
      </h2>
      <p style={{ margin: 0, color: '#9b8ec0', lineHeight: 1.6 }}>
        即将实现 — 展示你的反思结晶与信念之树
      </p>
    </div>
  );
}
