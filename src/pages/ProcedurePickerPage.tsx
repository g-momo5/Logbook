import { Link } from 'react-router-dom'

import { procedureCatalog } from '../lib/clinical'

function ProcedurePickerPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Nuova procedura</p>
        <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
          Scegli il tracciato clinico
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Le prime due procedure sono già strutturate. Le altre restano visibili ma bloccate finché
          non definisci i rispettivi campi clinici.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {procedureCatalog.map((item) =>
          item.enabled && item.path ? (
            <Link
              key={item.kind}
              to={item.path}
              className="block rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(11,93,86,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
                <span className="rounded-full bg-teal-700/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-900">
                  Attiva
                </span>
              </div>
            </Link>
          ) : (
            <div
              key={item.kind}
              className="rounded-[28px] border border-slate-900/5 bg-slate-900/5 p-5 opacity-70"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
                <span className="rounded-full bg-slate-900/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                  In definizione
                </span>
              </div>
            </div>
          ),
        )}
      </section>
    </div>
  )
}

export default ProcedurePickerPage
