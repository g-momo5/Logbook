function InstallHintCard() {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">
          Installazione iPhone
        </p>
        <div className="rounded-full bg-teal-700/10 px-3 py-1 text-[11px] font-semibold text-teal-900">
          PWA
        </div>
      </div>
      <ol className="space-y-3 text-sm leading-6 text-slate-700">
        <li>
          1. Apri il sito in Safari o in Chrome su iPhone. Se Chrome non mostra chiaramente
          l’opzione, usa Safari per la prima installazione.
        </li>
        <li>2. Tocca Condividi e scegli “Aggiungi a Home”.</li>
        <li>3. Avvia l’icona dalla Home: si aprirà in modalità standalone, senza App Store.</li>
      </ol>
    </section>
  )
}

export default InstallHintCard
