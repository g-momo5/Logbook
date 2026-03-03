import type {
  AccessSite,
  AngioplastyTechnique,
  Cannulation,
  HemostasisType,
  ImagingType,
  OperatorRole,
  PciVessel,
  PlaqueDebulkingType,
  ProcedureEntry,
  ProcedureKind,
  SupportedProcedureKind,
  TreatmentType,
  VesselSegment,
} from '../types'

type Option<T extends string> = {
  value: T
  label: string
}

export const procedureCatalog: Array<{
  kind: ProcedureKind
  label: string
  description: string
  enabled: boolean
  path?: string
}> = [
  {
    kind: 'coronarografia',
    label: 'Coronarografia',
    description: 'Studio coronarico con accesso, incannulazione e note.',
    enabled: true,
    path: '/new/coronarografia',
  },
  {
    kind: 'coronarografia_angioplastica',
    label: 'Coronarografia + Angioplastica',
    description: 'PCI con tecniche, trattamenti, imaging e vasi trattati.',
    enabled: true,
    path: '/new/coronarografia-angioplastica',
  },
  {
    kind: 'cateterismo_destro',
    label: 'Cateterisimo Destro',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
  {
    kind: 'chiusura_pfo',
    label: 'Chiusura PFO',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
  {
    kind: 'chiusura_auricola',
    label: 'Chiusura Auricola',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
  {
    kind: 'tavi',
    label: 'TAVI',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
  {
    kind: 'mitraclip',
    label: 'MitraClip',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
  {
    kind: 'triclip',
    label: 'Triclip',
    description: 'Disponibile dopo la definizione del tracciato clinico.',
    enabled: false,
  },
]

export const procedureLabels: Record<ProcedureKind, string> = Object.fromEntries(
  procedureCatalog.map((item) => [item.kind, item.label]),
) as Record<ProcedureKind, string>

export const operatorRoleOptions: Option<OperatorRole>[] = [
  { value: 'first_operator', label: 'Primo operatore' },
  { value: 'second_operator', label: 'Secondo operatore' },
]

export const accessSiteOptions: Option<AccessSite>[] = [
  { value: 'radiale_destro', label: 'Radiale destro' },
  { value: 'radiale_sinistro', label: 'Radiale sinistro' },
  { value: 'femorale', label: 'Femorale' },
]

export const cannulationOptions: Option<Cannulation>[] = [
  { value: 'coronaria_sinistra', label: 'Coronaria sinistra' },
  { value: 'coronaria_destra', label: 'Coronaria destra' },
  { value: 'mammaria_interna_sinistra', label: 'Mammaria interna sinistra' },
  { value: 'mammaria_interna_destra', label: 'Mammaria interna destra' },
  { value: 'free_graft_venoso', label: 'Free graft venoso' },
]

export const angioplastyTechniqueOptions: Option<AngioplastyTechnique>[] = [
  { value: 'pallone_semicompliante_nc', label: 'Pallone semicompliante/NC' },
  { value: 'cutting_balloon', label: 'Cutting balloon' },
  { value: 'scoring_balloon', label: 'Scoring balloon' },
]

export const treatmentOptions: Option<TreatmentType>[] = [
  { value: 'des', label: 'DES' },
  { value: 'bms', label: 'BMS' },
  { value: 'dcb', label: 'DCB' },
]

export const imagingOptions: Option<ImagingType>[] = [
  { value: 'ivus', label: 'IVUS' },
  { value: 'oct', label: 'OCT' },
]

export const plaqueDebulkingOptions: Option<PlaqueDebulkingType>[] = [
  { value: 'rotablator', label: 'Rotablator' },
  { value: 'shockwave', label: 'ShockWave' },
  { value: 'laser', label: 'Laser' },
]

export const hemostasisOptions: Option<HemostasisType>[] = [
  { value: 'tr_band', label: 'TR Band' },
  { value: 'perclose_prostyle', label: 'Perclose ProStyle' },
  { value: 'angio_seal', label: 'Angio-Seal' },
  { value: 'vascade', label: 'VASCADE' },
  { value: 'manta', label: 'MANTA' },
]

export const pciVesselOptions: Option<PciVessel>[] = [
  { value: 'tc', label: 'TC' },
  { value: 'iva', label: 'IVA' },
  { value: 'cx', label: 'Cx' },
  { value: 'cdx', label: 'Cdx' },
  { value: 'd1', label: 'D1' },
  { value: 'd2', label: 'D2' },
  { value: 'mo1', label: 'MO1' },
  { value: 'mo2', label: 'MO2' },
  { value: 'ramo_intermedio', label: 'Ramo intermedio' },
]

export const vesselSegmentOptions: Option<VesselSegment>[] = [
  { value: 'prossimale', label: 'Prossimale' },
  { value: 'medio', label: 'Medio' },
  { value: 'distale', label: 'Distale' },
]

function getLabel<T extends string>(options: Option<T>[], value: T | null | undefined) {
  if (!value) {
    return null
  }

  return options.find((option) => option.value === value)?.label ?? value
}

export function getProcedureLabel(kind: ProcedureKind) {
  return procedureLabels[kind]
}

export function getOperatorRoleLabel(role: OperatorRole) {
  return getLabel(operatorRoleOptions, role) ?? role
}

export function getAccessSiteLabel(accessSite: AccessSite | null) {
  return getLabel(accessSiteOptions, accessSite)
}

export function getCannulationLabel(cannulation: Cannulation) {
  return getLabel(cannulationOptions, cannulation) ?? cannulation
}

export function getAngioplastyTechniqueLabel(technique: AngioplastyTechnique) {
  return getLabel(angioplastyTechniqueOptions, technique) ?? technique
}

export function getTreatmentLabel(treatment: TreatmentType) {
  return getLabel(treatmentOptions, treatment) ?? treatment
}

export function getImagingLabel(imaging: ImagingType) {
  return getLabel(imagingOptions, imaging) ?? imaging
}

export function getPlaqueDebulkingLabel(value: PlaqueDebulkingType) {
  return getLabel(plaqueDebulkingOptions, value) ?? value
}

export function getHemostasisLabel(value: HemostasisType | null) {
  return getLabel(hemostasisOptions, value)
}

export function getPciVesselLabel(vessel: PciVessel) {
  return getLabel(pciVesselOptions, vessel) ?? vessel
}

export function getVesselSegmentLabel(segment: VesselSegment) {
  return getLabel(vesselSegmentOptions, segment) ?? segment
}

export function buildCardSummary(role: OperatorRole) {
  return getOperatorRoleLabel(role)
}

export function getEntryAccessSite(entry: ProcedureEntry) {
  return entry.details.accessSite
}

export function isSupportedProcedureKind(value: string): value is SupportedProcedureKind {
  return value === 'coronarografia' || value === 'coronarografia_angioplastica'
}
