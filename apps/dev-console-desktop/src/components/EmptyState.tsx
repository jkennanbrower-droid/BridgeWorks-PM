export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="emptyTitle">{title}</div>
      <div className="emptyBody">{body}</div>
      {cta ? <div style={{ marginTop: 10 }}>{cta}</div> : null}
    </div>
  );
}

