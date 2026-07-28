import type { LeaveBalance } from "@/lib/api/types";

interface BalanceCardProps {
  balance?: LeaveBalance;
  code: string;
  name: string;
  tone: "violet" | "blue" | "amber";
}

export function BalanceCard({ balance, code, name, tone }: BalanceCardProps) {
  const remaining = Number(balance?.remainingDays ?? 0);
  const entitled = Number(balance?.entitledDays ?? 0);
  const used = Number(balance?.usedDays ?? 0);
  const percentage = entitled > 0 ? Math.min(100, Math.max(0, (remaining / entitled) * 100)) : 0;

  return (
    <article className={`balance-card balance-${tone}`}>
      <div className="balance-card-head">
        <span className="balance-code">{code.slice(0, 1)}</span>
        <span>{name}</span>
      </div>
      <div className="balance-value">
        <strong>{remaining}</strong>
        <span>days left</span>
      </div>
      <div className="progress-track" aria-label={`${percentage.toFixed(0)} percent remaining`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="balance-meta">
        <span>{used} used</span>
        <span>{entitled} total</span>
      </div>
    </article>
  );
}
