import { Icon, type IconName } from "@/components/ui/icon";

interface MetricCardProps {
  icon: IconName;
  label: string;
  value: number | string;
  detail: string;
  tone?: "sage" | "mint" | "sand" | "neutral";
}

export function MetricCard({ icon, label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-top">
        <span className="metric-icon"><Icon name={icon} /></span>
        <span className="metric-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
