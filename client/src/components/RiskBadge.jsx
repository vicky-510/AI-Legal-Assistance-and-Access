const RISK_STYLES = {
  HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  NOT_SPECIFIED_IN_DOCUMENT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  HIGHER_RISK: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  LOWER_RISK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  NEUTRAL: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const RISK_LABELS = {
  HIGH: 'High Risk',
  MEDIUM: 'Medium Risk',
  LOW: 'Low Risk',
  NOT_SPECIFIED_IN_DOCUMENT: 'Not Specified',
  HIGHER_RISK: 'Higher Risk',
  LOWER_RISK: 'Lower Risk',
  NEUTRAL: 'Neutral',
};

export default function RiskBadge({ level, className = '' }) {
  const style = RISK_STYLES[level] || RISK_STYLES.NEUTRAL;
  const label = RISK_LABELS[level] || level;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
