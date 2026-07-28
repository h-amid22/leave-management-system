interface LoadingSkeletonProps {
  label?: string;
  rows?: number;
}

export function LoadingSkeleton({ label = "Loading", rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="skeleton-panel" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton skeleton-heading" />
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton skeleton-row" key={index} />
      ))}
    </div>
  );
}
