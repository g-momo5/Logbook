import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  accessSiteOptions,
  angioplastyTechniqueOptions,
  cannulationOptions,
  getProcedureLabel,
  hemostasisOptions,
  imagingOptions,
  operatorRoleOptions,
  pciVesselOptions,
  plaqueDebulkingOptions,
  treatmentOptions,
  vesselSegmentOptions,
} from '../lib/clinical'
import { todayDateValue } from '../lib/format'
import { deleteEntry, getProcedureEntry, saveEntry } from '../lib/logbook'
import { formatSyncSuccessMessage, syncPending } from '../lib/sync'
import { refreshAppSnapshot, useAppStore } from '../store/app-store'
import type {
  AccessSite,
  AngioplastyTechnique,
  Cannulation,
  HemostasisType,
  ImagingType,
  OperatorRole,
  PciVessel,
  PlaqueDebulkingType,
  SupportedProcedureKind,
  TreatmentType,
  TreatedSegment,
  VesselSegment,
} from '../types'

interface ChoiceOption {
  value: string
  label: string
}

interface EntryEditorPageProps {
  mode: 'create' | 'edit'
  procedureKind?: SupportedProcedureKind
}

interface TreatedSegmentRow {
  id: string
  vessel: PciVessel | ''
  segment: VesselSegment | ''
}

interface FormState {
  procedureDate: string
  operatorRole: OperatorRole | ''
  notes: string
  accessSite: AccessSite | ''
  hemostasis: HemostasisType | ''
  cannulations: Cannulation[]
  angioplastyTechniques: AngioplastyTechnique[]
  treatments: TreatmentType[]
  imaging: ImagingType[]
  plaqueDebulking: PlaqueDebulkingType[]
  treatedSegments: TreatedSegmentRow[]
}

function createInitialFormState(): FormState {
  return {
    procedureDate: todayDateValue(),
    operatorRole: '',
    notes: '',
    accessSite: '',
    hemostasis: '',
    cannulations: [],
    angioplastyTechniques: [],
    treatments: [],
    imaging: [],
    plaqueDebulking: [],
    treatedSegments: [],
  }
}

function createTreatedSegmentRow(input?: TreatedSegment): TreatedSegmentRow {
  return {
    id: crypto.randomUUID(),
    vessel: input?.vessel ?? '',
    segment: input?.segment ?? '',
  }
}

function ChoiceGrid({
  options,
  value,
  onChange,
  allowClear = false,
}: {
  options: ChoiceOption[]
  value: string
  onChange: (value: string) => void
  allowClear?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(isActive && allowClear ? '' : option.value)}
            className={`rounded-3xl px-4 py-4 text-left text-sm font-semibold transition ${
              isActive
                ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/20'
                : 'bg-white text-slate-700 ring-1 ring-slate-900/8'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function MultiSelectGrid({
  options,
  values,
  onToggle,
}: {
  options: ChoiceOption[]
  values: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isActive = values.includes(option.value)

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`rounded-3xl px-4 py-4 text-left text-sm font-semibold transition ${
              isActive
                ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/20'
                : 'bg-white text-slate-700 ring-1 ring-slate-900/8'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function EntryEditorPage({ mode, procedureKind }: EntryEditorPageProps) {
  const navigate = useNavigate()
  const { entryId } = useParams()
  const setSyncState = useAppStore((state) => state.setSyncState)

  const [resolvedKind, setResolvedKind] = useState<SupportedProcedureKind | null>(
    mode === 'create' ? procedureKind ?? null : null,
  )
  const [form, setForm] = useState<FormState>(createInitialFormState)
  const [pageError, setPageError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(mode === 'edit')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    let isActive = true

    if (mode === 'create') {
      if (!procedureKind) {
        setPageError('Procedura non disponibile.')
        setIsLoading(false)
        return () => {
          isActive = false
        }
      }

      setResolvedKind(procedureKind)
      setForm(createInitialFormState())
      setPageError('')
      setIsLoading(false)

      return () => {
        isActive = false
      }
    }

    if (!entryId) {
      setPageError('Record non trovato.')
      setIsLoading(false)

      return () => {
        isActive = false
      }
    }

    setIsLoading(true)
    setPageError('')

    void (async () => {
      const entry = await getProcedureEntry(entryId)

      if (!isActive) {
        return
      }

      if (!entry) {
        setPageError('Procedura non trovata o già eliminata.')
        setIsLoading(false)
        return
      }

      setResolvedKind(entry.procedureKind)
      setForm({
        procedureDate: entry.procedureDate,
        operatorRole: entry.operatorRole,
        notes: entry.notes,
        accessSite: entry.details.accessSite ?? '',
        hemostasis: entry.details.hemostasis ?? '',
        cannulations: entry.details.cannulations,
        angioplastyTechniques:
          entry.procedureKind === 'coronarografia_angioplastica'
            ? entry.details.angioplastyTechniques
            : [],
        treatments:
          entry.procedureKind === 'coronarografia_angioplastica' ? entry.details.treatments : [],
        imaging: entry.procedureKind === 'coronarografia_angioplastica' ? entry.details.imaging : [],
        plaqueDebulking:
          entry.procedureKind === 'coronarografia_angioplastica'
            ? entry.details.plaqueDebulking
            : [],
        treatedSegments:
          entry.procedureKind === 'coronarografia_angioplastica'
            ? entry.details.treatedSegments.map((item) => createTreatedSegmentRow(item))
            : [],
      })
      setIsLoading(false)
    })()

    return () => {
      isActive = false
    }
  }, [entryId, mode, procedureKind])

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleAccessSiteChange(value: AccessSite | '') {
    setForm((current) => ({
      ...current,
      accessSite: value,
    }))
  }

  function toggleSelection<T extends string>(field: keyof Pick<
    FormState,
    'cannulations' | 'angioplastyTechniques' | 'treatments' | 'imaging' | 'plaqueDebulking'
  >, value: T) {
    setForm((current) => {
      const values = current[field] as T[]

      return {
        ...current,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      }
    })
  }

  function updateTreatedSegmentRow(rowId: string, patch: Partial<Omit<TreatedSegmentRow, 'id'>>) {
    setForm((current) => ({
      ...current,
      treatedSegments: current.treatedSegments.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    }))
  }

  function addTreatedSegmentRow() {
    setForm((current) => ({
      ...current,
      treatedSegments: [...current.treatedSegments, createTreatedSegmentRow()],
    }))
  }

  function removeTreatedSegmentRow(rowId: string) {
    setForm((current) => ({
      ...current,
      treatedSegments: current.treatedSegments.filter((row) => row.id !== rowId),
    }))
  }

  async function triggerSyncAfterSave() {
    setSyncState('syncing', 'Sincronizzazione in corso...')
    const report = await syncPending()
    await refreshAppSnapshot()

    if (report.skipped) {
      if (report.reason === 'not-configured') {
        setSyncState('paused', 'Configura Supabase per attivare la sync.')
      } else if (report.reason === 'unauthenticated') {
        setSyncState('paused', 'Accedi a Supabase per sincronizzare.')
      } else {
        setSyncState('paused', 'Offline: record in coda.')
      }

      return
    }

    if (report.errors.length > 0) {
      setSyncState('error', report.errors[0])
      return
    }

    setSyncState('idle', formatSyncSuccessMessage(report))
  }

  async function handleSave() {
    if (!resolvedKind) {
      setSubmitError('Procedura non disponibile.')
      return
    }

    setSubmitError('')

    if (!form.procedureDate) {
      setSubmitError('La data è obbligatoria.')
      return
    }

    if (!form.operatorRole) {
      setSubmitError('Il ruolo è obbligatorio.')
      return
    }

    const incompleteRows = form.treatedSegments.some((row) => !row.vessel || !row.segment)

    if (incompleteRows) {
      setSubmitError('Ogni vaso trattato deve avere sia vaso sia tratto.')
      return
    }

    const duplicateRows = new Set(
      form.treatedSegments.map((row) => `${row.vessel}:${row.segment}`),
    ).size !== form.treatedSegments.length

    if (duplicateRows) {
      setSubmitError('La stessa coppia vaso/tratto non può essere salvata due volte.')
      return
    }

    setIsSaving(true)

    try {
      const commonDraft = {
        id: mode === 'edit' ? entryId : undefined,
        procedureDate: form.procedureDate,
        operatorRole: form.operatorRole as OperatorRole,
        notes: form.notes.trim(),
      }

      if (resolvedKind === 'coronarografia') {
        await saveEntry({
          ...commonDraft,
          procedureKind: 'coronarografia',
          details: {
            accessSite: form.accessSite || null,
            hemostasis: form.hemostasis || null,
            cannulations: form.cannulations,
          },
        })
      } else {
        await saveEntry({
          ...commonDraft,
          procedureKind: 'coronarografia_angioplastica',
          details: {
            accessSite: form.accessSite || null,
            hemostasis: form.hemostasis || null,
            cannulations: form.cannulations,
            angioplastyTechniques: form.angioplastyTechniques,
            treatments: form.treatments,
            imaging: form.imaging,
            plaqueDebulking: form.plaqueDebulking,
            treatedSegments: form.treatedSegments.map((row) => ({
              vessel: row.vessel as PciVessel,
              segment: row.segment as VesselSegment,
            })),
          },
        })
      }

      await refreshAppSnapshot()

      if (navigator.onLine) {
        await triggerSyncAfterSave()
      }

      navigate('/logbook')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Salvataggio non riuscito.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (mode !== 'edit' || !entryId) {
      return
    }

    const confirmed = window.confirm('Eliminare questa procedura dal logbook?')

    if (!confirmed) {
      return
    }

    setIsRemoving(true)
    setSubmitError('')

    try {
      await deleteEntry(entryId)
      await refreshAppSnapshot()

      if (navigator.onLine) {
        await triggerSyncAfterSave()
      }

      navigate('/logbook')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Eliminazione non riuscita.')
    } finally {
      setIsRemoving(false)
    }
  }

  if (pageError) {
    return (
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-sm font-medium text-rose-700">{pageError}</p>
        <Link
          to="/logbook"
          className="mt-4 inline-flex rounded-3xl bg-teal-800 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          Torna al logbook
        </Link>
      </section>
    )
  }

  if (isLoading || !resolvedKind) {
    return (
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 text-sm font-medium text-slate-600 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        Caricamento procedura...
      </section>
    )
  }

  const procedureLabel = getProcedureLabel(resolvedKind)

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">
              {mode === 'create' ? 'Nuova procedura' : 'Modifica procedura'}
            </p>
            <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
              {procedureLabel}
            </h2>
          </div>
          <Link
            to={mode === 'create' ? '/new' : '/logbook'}
            className="inline-flex rounded-3xl bg-slate-900/5 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Annulla
          </Link>
        </div>
      </section>

      <section className="space-y-5 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Data
          </span>
          <input
            type="date"
            value={form.procedureDate}
            onChange={(event) => setField('procedureDate', event.target.value)}
            className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ruolo
          </span>
          <ChoiceGrid
            options={operatorRoleOptions}
            value={form.operatorRole}
            onChange={(value) => setField('operatorRole', value as OperatorRole)}
          />
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Compila i campi sotto solo per le attivita eseguite da te come primo operatore, anche
            se il ruolo complessivo della procedura e secondo operatore.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Accesso
          </span>
          <ChoiceGrid
            options={accessSiteOptions}
            value={form.accessSite}
            onChange={(value) => handleAccessSiteChange(value as AccessSite | '')}
            allowClear
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Incannulazione
          </span>
          <MultiSelectGrid
            options={cannulationOptions}
            values={form.cannulations}
            onToggle={(value) => toggleSelection('cannulations', value as Cannulation)}
          />
        </div>

        {resolvedKind === 'coronarografia_angioplastica' ? (
          <>
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Angioplastica
              </span>
              <MultiSelectGrid
                options={angioplastyTechniqueOptions}
                values={form.angioplastyTechniques}
                onToggle={(value) =>
                  toggleSelection('angioplastyTechniques', value as AngioplastyTechnique)
                }
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Trattamento
              </span>
              <MultiSelectGrid
                options={treatmentOptions}
                values={form.treatments}
                onToggle={(value) => toggleSelection('treatments', value as TreatmentType)}
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Imaging
              </span>
              <MultiSelectGrid
                options={imagingOptions}
                values={form.imaging}
                onToggle={(value) => toggleSelection('imaging', value as ImagingType)}
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Debulking di placca
              </span>
              <MultiSelectGrid
                options={plaqueDebulkingOptions}
                values={form.plaqueDebulking}
                onToggle={(value) => toggleSelection('plaqueDebulking', value as PlaqueDebulkingType)}
              />
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Vasi trattati
                </span>
                <button
                  type="button"
                  onClick={addTreatedSegmentRow}
                  className="rounded-3xl bg-teal-800 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                >
                  Aggiungi vaso
                </button>
              </div>

              {form.treatedSegments.length === 0 ? (
                <div className="rounded-3xl bg-slate-900/5 p-4 text-sm text-slate-600">
                  Nessun vaso selezionato.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.treatedSegments.map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-3 rounded-3xl border border-slate-900/5 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <select
                        value={row.vessel}
                        onChange={(event) =>
                          updateTreatedSegmentRow(row.id, {
                            vessel: event.target.value as PciVessel | '',
                          })
                        }
                        className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
                      >
                        <option value="">Vaso</option>
                        {pciVesselOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.segment}
                        onChange={(event) =>
                          updateTreatedSegmentRow(row.id, {
                            segment: event.target.value as VesselSegment | '',
                          })
                        }
                        className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
                      >
                        <option value="">Tratto</option>
                        {vesselSegmentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeTreatedSegmentRow(row.id)}
                        className="rounded-3xl bg-rose-700 px-4 py-4 text-sm font-semibold text-white"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Emostasi
          </span>
          <ChoiceGrid
            options={hemostasisOptions}
            value={form.hemostasis}
            onChange={(value) => setField('hemostasis', value as HemostasisType)}
            allowClear
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Note
          </span>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            className="w-full rounded-[28px] border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            placeholder="Note cliniche opzionali"
          />
        </label>

        {submitError ? <p className="text-sm font-medium text-rose-700">{submitError}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              void handleSave()
            }}
            className="inline-flex flex-1 items-center justify-center rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-teal-900/20 disabled:opacity-50"
            disabled={isSaving || isRemoving}
          >
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </button>

          {mode === 'edit' ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-3xl bg-rose-700 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-50"
              onClick={() => {
                void handleDelete()
              }}
              disabled={isSaving || isRemoving}
            >
              {isRemoving ? 'Elimino...' : 'Elimina'}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default EntryEditorPage
