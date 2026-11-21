export default function IssuedPass({ visitor, onDismiss }) {
  if (!visitor?.passcode) return null;
  return (
    <section aria-label="New visitor pass" className="content-card" style={{ padding: '20px', border: '1px solid var(--primary)' }}>
      <strong>Save this pass for {visitor.name} · {visitor.flatNo}</strong>
      <p style={{ fontSize: '1.8rem', letterSpacing: '0.15em', margin: '12px 0', userSelect: 'all' }}><code>{visitor.passcode}</code></p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Share this code privately with the visitor. It is shown only when issued and cannot be retrieved after leaving this page. Entry requires resident approval and gate verification.</p>
      <button type="button" onClick={onDismiss} style={{ marginTop: '12px', padding: '8px 12px', cursor: 'pointer' }}>I have saved the code</button>
    </section>
  );
}
