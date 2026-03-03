interface StatusPillProps {
  tone: 'teal' | 'amber' | 'red' | 'slate'
  children: string
}

const toneClasses = {
  teal: 'bg-teal-700/10 text-teal-900 ring-teal-900/10',
  amber: 'bg-amber-500/15 text-amber-900 ring-amber-700/10',
  red: 'bg-rose-500/15 text-rose-900 ring-rose-900/10',
  slate: 'bg-slate-900/5 text-slate-700 ring-slate-900/10',
}

function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

export default StatusPill
