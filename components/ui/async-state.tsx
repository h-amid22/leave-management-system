import { Icon } from "@/components/ui/icon";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <LoadingSkeleton label={label} />;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel state-error" role="alert">
      <Icon name="alert" />
      <strong>Something went wrong</strong>
      <p>{message}</p>
      {onRetry ? (
        <button className="button button-secondary" onClick={onRetry} type="button">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-panel state-empty">
      <span className="empty-icon"><Icon name="file" /></span>
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}
