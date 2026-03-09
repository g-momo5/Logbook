import {
  getAccessSiteLabel,
  getAngioplastyTechniqueLabel,
  getCannulationLabel,
  getFunctionalTestLabel,
  getHemostasisLabel,
  getImagingLabel,
  getPciVesselLabel,
  getPlaqueDebulkingLabel,
  getTreatmentLabel,
} from './clinical'
import { db, ensureBootstrapped } from './db'
import type { ExportFormat, ExportResult, ProcedureEntry } from '../types'

function escapeCsvValue(value: string | number) {
  const text = String(value)
  if (!text.includes(',') && !text.includes('"') && !text.includes('\n')) {
    return text
  }

  return `"${text.replaceAll('"', '""')}"`
}

export function serializeEntriesToCsv(entries: ProcedureEntry[]) {
  const header = [
    'procedure_date',
    'procedure_kind',
    'procedure_label',
    'operator_role',
    'card_summary',
    'access_site',
    'hemostasis',
    'cannulations',
    'functional_tests',
    'angioplasty_techniques',
    'treatments',
    'imaging',
    'plaque_debulking',
    'treated_segments',
    'notes',
    'sync_status',
  ]

  function serializeArray(values: string[]) {
    return values.join('|')
  }

  const rows = entries.map((entry) =>
    [
      entry.procedureDate,
      entry.procedureKind,
      entry.procedureLabel,
      entry.operatorRole,
      entry.cardSummary,
      getAccessSiteLabel(entry.details.accessSite) ?? '',
      getHemostasisLabel(entry.details.hemostasis) ?? '',
      serializeArray(entry.details.cannulations.map((value) => getCannulationLabel(value))),
      serializeArray((entry.details.functionalTests ?? []).map((value) => getFunctionalTestLabel(value))),
      serializeArray(
        entry.procedureKind === 'coronarografia_angioplastica'
          ? entry.details.angioplastyTechniques.map((value) => getAngioplastyTechniqueLabel(value))
          : [],
      ),
      serializeArray(
        entry.procedureKind === 'coronarografia_angioplastica'
          ? entry.details.treatments.map((value) => getTreatmentLabel(value))
          : [],
      ),
      serializeArray(
        entry.procedureKind === 'coronarografia_angioplastica'
          ? entry.details.imaging.map((value) => getImagingLabel(value))
          : [],
      ),
      serializeArray(
        entry.procedureKind === 'coronarografia_angioplastica'
          ? entry.details.plaqueDebulking.map((value) => getPlaqueDebulkingLabel(value))
          : [],
      ),
      serializeArray(
        entry.procedureKind === 'coronarografia_angioplastica'
          ? entry.details.treatedSegments.map(
              (value) => `${getPciVesselLabel(value.vessel)}:${value.segment}`,
            )
          : [],
      ),
      entry.notes,
      entry.syncStatus,
    ]
      .map(escapeCsvValue)
      .join(','),
  )

  return [header.join(','), ...rows].join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function exportEntries(format: ExportFormat): Promise<ExportResult> {
  await ensureBootstrapped()

  const entries = (await db.entries.toArray())
    .filter((entry) => !entry.deletedAt)
    .sort((left, right) => right.procedureDate.localeCompare(left.procedureDate))

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `logbook-${stamp}.${format}`

  if (format === 'csv') {
    const csv = serializeEntriesToCsv(entries)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
  } else {
    downloadBlob(
      new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json;charset=utf-8' }),
      filename,
    )
  }

  await db.meta.put({
    key: 'lastExportAt',
    value: new Date().toISOString(),
  })

  return {
    format,
    filename,
    count: entries.length,
  }
}
