export function ComingSoonPage({ title, note }) {
  return (
    <div>
      <h1 className="text-lg font-medium mb-2">{title}</h1>
      <p className="text-sm text-text-muted">{note || "Esta pantalla todavía no está construida."}</p>
    </div>
  );
}
