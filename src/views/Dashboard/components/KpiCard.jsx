import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accent = false,
  variant = 'default', // default | success | danger | warning | info
  expandableDetails = null, // Array of { label: string, value: string }
  className = ''
}) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = trend >= 0;
  const hasExpandable = Array.isArray(expandableDetails) && expandableDetails.length > 0;

  const variantStyles = {
    default: 'bg-surface-container-lowest border-outline-variant/60 text-charcoal-ink',
    accent: 'bg-accent/5 border-accent/20 text-accent',
    success: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    danger: 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  const iconBgStyles = {
    default: 'bg-surface-container-high text-on-surface-variant',
    accent: 'bg-accent text-on-primary',
    success: 'bg-emerald-500 text-white',
    danger: 'bg-rose-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div className={`border rounded-2xl p-6 flex flex-col justify-between min-h-[140px] shadow-whisper transition-all duration-200 card-lift ${variantStyles[variant] || variantStyles.default} ${className}`}>
      <div className="flex justify-between items-start">
        <span className="text-label-sm text-muted-steel uppercase tracking-wider font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {hasExpandable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-muted-steel transition-all cursor-pointer"
              title={expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {Icon && (
            <div className={`p-2.5 rounded-xl ${accent ? iconBgStyles.accent : (iconBgStyles[variant] || iconBgStyles.default)} shadow-sm`}>
              <Icon size={20} strokeWidth={1.8} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col justify-end">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-h2 font-mono-tabular tracking-tight font-bold">{value}</div>
            {subtitle && (
              <div className="text-label-sm text-muted-steel mt-1 font-normal">{subtitle}</div>
            )}
            {trendValue && (
              <div className={`flex items-center gap-1 mt-1 text-label-sm font-medium ${isPositive ? 'text-accent' : 'text-error'}`}>
                {isPositive ? <ArrowUpRight size={14} strokeWidth={2.2} /> : <ArrowDownRight size={14} strokeWidth={2.2} />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Breakdown Drawer */}
        {hasExpandable && expanded && (
          <div className="mt-4 pt-3 border-t border-outline-variant/40 space-y-2 animate-fade-in-up">
            {expandableDetails.map((detail, idx) => (
              <div key={idx} className="flex justify-between items-center text-label-sm">
                <span className="text-muted-steel font-medium">{detail.label}:</span>
                <span className="font-mono-tabular font-bold text-charcoal-ink">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
