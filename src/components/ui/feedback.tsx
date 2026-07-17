export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state-message" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="error-state" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
