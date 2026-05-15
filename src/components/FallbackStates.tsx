export function WebGLFallback() {
  return (
    <section className="archive-fallback" role="status">
      <h1>WebGL is unavailable</h1>
      <p>The archive can still be searched and read through the metadata panels.</p>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <section className="archive-fallback" role="status">
      <p>{message}</p>
    </section>
  );
}
