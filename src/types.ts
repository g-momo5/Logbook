export type LocalSyncStatus = 'pending' | 'synced' | 'error'

export type SyncOperation = 'upsert' | 'delete'

export type StatsRange = 'day' | 'week' | 'month' | 'all'

export type SyncBlockReason = 'offline' | 'not-configured' | 'unauthenticated'

export type ProcedureKind =
  | 'coronarografia'
  | 'coronarografia_angioplastica'
  | 'cateterismo_destro'
  | 'chiusura_pfo'
  | 'chiusura_auricola'
  | 'tavi'
  | 'mitraclip'
  | 'triclip'

export type SupportedProcedureKind = Extract<
  ProcedureKind,
  'coronarografia' | 'coronarografia_angioplastica'
>

export type OperatorRole = 'first_operator' | 'second_operator'

export type AccessSite = 'radiale_destro' | 'radiale_sinistro' | 'femorale'

export type Cannulation =
  | 'coronaria_sinistra'
  | 'coronaria_destra'
  | 'mammaria_interna_sinistra'
  | 'mammaria_interna_destra'
  | 'free_graft_venoso'

export type AngioplastyTechnique =
  | 'pallone_semicompliante_nc'
  | 'cutting_balloon'
  | 'scoring_balloon'

export type FunctionalTest = 'ffr' | 'ifr' | 'qfr' | 'imr' | 'cfr'

export type TreatmentType = 'des' | 'bms' | 'dcb'

export type ImagingType = 'ivus' | 'oct'

export type PlaqueDebulkingType = 'rotablator' | 'shockwave' | 'laser'

export type HemostasisType = 'tr_band' | 'perclose_prostyle' | 'angio_seal' | 'vascade' | 'manta'

export type PciVessel =
  | 'tc'
  | 'iva'
  | 'cx'
  | 'cdx'
  | 'd1'
  | 'd2'
  | 'mo1'
  | 'mo2'
  | 'ramo_intermedio'

export type VesselSegment = 'prossimale' | 'medio' | 'distale'

export interface TreatedSegment {
  vessel: PciVessel
  segment: VesselSegment
}

export interface CoronarografiaDetails {
  kind: 'coronarografia'
  accessSite: AccessSite | null
  hemostasis: HemostasisType | null
  cannulations: Cannulation[]
  functionalTests: FunctionalTest[]
}

export interface CoronarografiaAngioplasticaDetails {
  kind: 'coronarografia_angioplastica'
  accessSite: AccessSite | null
  hemostasis: HemostasisType | null
  cannulations: Cannulation[]
  functionalTests: FunctionalTest[]
  angioplastyTechniques: AngioplastyTechnique[]
  treatments: TreatmentType[]
  imaging: ImagingType[]
  plaqueDebulking: PlaqueDebulkingType[]
  treatedSegments: TreatedSegment[]
}

export type ProcedureDetails = CoronarografiaDetails | CoronarografiaAngioplasticaDetails

export interface ProcedureEntryBase<
  TKind extends SupportedProcedureKind,
  TDetails extends ProcedureDetails,
> {
  id: string
  userId: string | null
  procedureKind: TKind
  procedureLabel: string
  procedureDate: string
  operatorRole: OperatorRole
  notes: string
  cardSummary: string
  details: TDetails
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  syncStatus: LocalSyncStatus
  syncError: string | null
}

export type CoronarografiaEntry = ProcedureEntryBase<'coronarografia', CoronarografiaDetails>

export type CoronarografiaAngioplasticaEntry = ProcedureEntryBase<
  'coronarografia_angioplastica',
  CoronarografiaAngioplasticaDetails
>

export type ProcedureEntry = CoronarografiaEntry | CoronarografiaAngioplasticaEntry

interface ProcedureEntryDraftBase {
  id?: string
  procedureDate: string
  operatorRole: OperatorRole
  notes?: string
}

export interface CoronarografiaDraft extends ProcedureEntryDraftBase {
  procedureKind: 'coronarografia'
  details: Omit<CoronarografiaDetails, 'kind'>
}

export interface CoronarografiaAngioplasticaDraft extends ProcedureEntryDraftBase {
  procedureKind: 'coronarografia_angioplastica'
  details: Omit<CoronarografiaAngioplasticaDetails, 'kind'>
}

export type ProcedureEntryDraft = CoronarografiaDraft | CoronarografiaAngioplasticaDraft

export interface ProcedureEntryRemotePayloadBase<
  TKind extends SupportedProcedureKind,
  TDetails extends ProcedureDetails,
> {
  id: string
  user_id: string | null
  procedure_kind: TKind
  procedure_label: string
  procedure_date: string
  operator_role: OperatorRole
  card_summary: string
  access_site: AccessSite | null
  details: TDetails
  notes: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProcedureEntryRemotePayload =
  | ProcedureEntryRemotePayloadBase<'coronarografia', CoronarografiaDetails>
  | ProcedureEntryRemotePayloadBase<
      'coronarografia_angioplastica',
      CoronarografiaAngioplasticaDetails
    >

export type ProcedureEntryRemoteRow =
  | Omit<ProcedureEntryRemotePayloadBase<'coronarografia', CoronarografiaDetails>, 'user_id'> & {
      user_id: string
    }
  | Omit<
      ProcedureEntryRemotePayloadBase<'coronarografia_angioplastica', CoronarografiaAngioplasticaDetails>,
      'user_id'
    > & {
      user_id: string
    }

export interface SyncJob {
  id: string
  entryId: string
  operation: SyncOperation
  payload: ProcedureEntryRemotePayload
  createdAt: string
  updatedAt: string
  attempts: number
  lastError: string | null
}

export interface AppLockRecord {
  id: 'pin'
  pinHash: string
  pinSalt: string
  lastUnlockedAt: string | null
}

export interface MetaRecord {
  key: string
  value: string
}

export interface StatsDatum {
  label: string
  count: number
}

export type StatsMetric =
  | 'byType'
  | 'byTypeAndRole'
  | 'byAccessSite'
  | 'byCannulation'
  | 'byFunctionalTest'
  | 'byHemostasis'
  | 'byAngioplastyTechnique'
  | 'byTreatment'
  | 'byImaging'
  | 'byDebulking'
  | 'byTreatedVessel'
  | 'byTreatedSegment'

export interface StatsQuery {
  range: StatsRange
  from?: string
  to?: string
}

export interface StatsDrilldown {
  metric: StatsMetric
  label: string
  range: StatsRange
}

export interface StatsResult {
  totalEntries: number
  pendingSync: number
  byType: StatsDatum[]
  byTypeAndRole: StatsDatum[]
  byAccessSite: StatsDatum[]
  byCannulation: StatsDatum[]
  byFunctionalTest: StatsDatum[]
  byHemostasis: StatsDatum[]
  byAngioplastyTechnique: StatsDatum[]
  byTreatment: StatsDatum[]
  byImaging: StatsDatum[]
  byDebulking: StatsDatum[]
  byTreatedVessel: StatsDatum[]
  byTreatedSegment: StatsDatum[]
}

export interface SyncReport {
  uploaded: number
  downloaded: number
  merged: number
  keptLocal: number
  processed: number
  skipped: boolean
  errors: string[]
  reason?: SyncBlockReason
  lastSyncedAt?: string
}

export interface SyncDashboard {
  pendingCount: number
  errorCount: number
  lastSyncAt: string | null
}

export type ExportFormat = 'csv' | 'json'

export interface ExportResult {
  format: ExportFormat
  filename: string
  count: number
}
