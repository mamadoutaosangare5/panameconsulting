// types/procedure.types.ts
// Source unique de vérité pour tout le module Procedures (frontend)
// Calqué strictement sur :
//   - procedure.entity.ts + procedure-audit.entity.ts + procedure-timeline.entity.ts
//   - create-procedure.dto.ts + update-procedure.dto.ts + update-step.dto.ts
//   - procedure-query.dto.ts + procedure-response.dto.ts
//   - procedures.service.ts (backend NestJS)

// ─── Enums (miroir Prisma) ────────────────────────────────────────────────────

export const ProcedureStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type ProcedureStatus =
  (typeof ProcedureStatus)[keyof typeof ProcedureStatus];

export const StepStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const StepName = {
  DEMANDE_ADMISSION: "DEMANDE_ADMISSION",
  PREPARATION_DOSSIERS: "PREPARATION_DOSSIERS",
  SOUMISSION_DOSSIERS: "SOUMISSION_DOSSIERS",
  ATTENTE_DECISION: "ATTENTE_DECISION",
  DEMANDE_VISA: "DEMANDE_VISA",
  PREPARATIF_VOYAGE: "PREPARATIF_VOYAGE",
  ARRIVEE_PAYS: "ARRIVEE_PAYS",
  INSCRIPTION_ETABLISSEMENT: "INSCRIPTION_ETABLISSEMENT",
} as const;
export type StepName = (typeof StepName)[keyof typeof StepName];

export type SortOrder = "asc" | "desc";
export type GroupBy = "day" | "month" | "year";
export type ExportFormat = "csv" | "excel" | "pdf";
export type StatusColor =
  | "blue"
  | "green"
  | "red"
  | "gray"
  | "orange"
  | "purple";

// ─── DTOs Création (create-procedure.dto.ts) ──────────────────────────────────

export interface CreateProcedureDto {
  rendezVousId: string; // UUID v4, requis
  prenom: string; // min 2, max 50, lettres/espaces/tirets/apostrophes
  nom: string; // min 2, max 50, lettres/espaces/tirets/apostrophes
  email: string; // format email valide, requis
  telephone: string; // format international +XXXXXXXXXXX, requis
  destination: string; // requis
  destinationAutre?: string; // si destination = "Autre"
  filiere: string; // requis
  filiereAutre?: string; // si filiere = "Autre"
  niveauEtude: string; // requis
  niveauEtudeAutre?: string; // si niveauEtude = "Autre"
}

// ─── DTO Mise à jour (update-procedure.dto.ts) ────────────────────────────────

export interface UpdateProcedureDto extends Partial<CreateProcedureDto> {
  raisonRejet?: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO date string
  deletionReason?: string;
}

// ─── DTO Mise à jour étape (update-step.dto.ts) ───────────────────────────────

export interface UpdateStepDto {
  statut?: StepStatus;
  raisonRefus?: string;
  dateCompletion?: string; // ISO date string
}

// ─── DTO Query (procedure-query.dto.ts) ───────────────────────────────────────

export interface ProcedureQueryDto {
  page?: number; // default 1, min 1
  limit?: number; // default 10, min 1
  status?: ProcedureStatus;
  email?: string;
  destination?: string;
  filiere?: string;
  includeDeleted?: boolean; // default false
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  search?: string;
  sortBy?: string; // default 'createdAt'
  sortOrder?: SortOrder; // default 'desc'
}

export interface ProcedureStatsQueryDto {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  groupBy?: GroupBy; // default 'month'
}

// ─── DTO Réponse étape (procedure-response.dto.ts → StepResponseDto) ─────────

export interface StepResponseDto {
  id: string;
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateCreation: Date;
  dateMaj: Date;
  dateCompletion?: Date;
  // Virtuels calculés par le service
  canBeModified: boolean;
  duration?: number; // en jours, si complétée
  isOverdue: boolean; // >7 jours sans complétion
  statusLabel: string; // "En cours", "Terminée"…
  statusColor: StatusColor;
}

// ─── DTO Réponse procédure (procedure-response.dto.ts) ───────────────────────

export interface ProcedureResponseDto {
  id: string;
  rendezVousId?: string;
  prenom: string;
  nom: string;
  fullName: string; // calculé : "Jean Dupont"
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  effectiveDestination: string; // destination || destinationAutre
  filiere: string;
  filiereAutre?: string;
  effectiveFiliere: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
  effectiveNiveauEtude: string;
  statut: ProcedureStatus;
  raisonRejet?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletionReason?: string;
  dateCompletion?: Date;
  dateDerniereModification?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
  steps: StepResponseDto[];
  // Virtuels calculés
  progress: number; // 0-100
  completedSteps: number;
  totalSteps: number;
  activeStep?: StepName;
  nextStep?: StepName;
  rendezvousStatus?: string;
  rendezvousDate?: string;
  statusLabel: string;
  statusColor: StatusColor;
  canBeModified: boolean;
  daysSinceCreation: number;
  estimatedCompletionDate?: Date;
  isOverdue: boolean; // >14 jours
}

export interface PaginatedProcedureResponseDto {
  data: ProcedureResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── DTO Statistiques (procedure-response.dto.ts → ProcedureStatisticsDto) ───

export interface ProcedureStatisticsDto {
  total: number;
  byStatus: Record<ProcedureStatus, number>;
  completionRate: number; // %
  rejectionRate: number; // %
  averageCompletionTime: number; // jours
  newProcedures: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topDestinations: { destination: string; count: number }[];
  topFilieres: { filiere: string; count: number }[];
  stepsAnalytics?: {
    stepName: StepName;
    completionRate: number;
    averageTime: number;
  }[];
}

// ─── Entités (procedure.entity.ts) ───────────────────────────────────────────

export interface StepEntity {
  id: string;
  procedureId: string;
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string | null;
  order: number;
  dateMaj: Date;
  dateCreation: Date;
  dateCompletion?: Date | null;
}

export interface ProcedureUserInfoEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  telephone: string;
}

export interface ProcedureRendezvousInfoEntity {
  id: string;
  date: string;
  time: string;
  status: string;
  avisAdmin?: string;
}

export interface ProcedureEntity {
  id: string;
  rendezVousId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string | null;
  filiere: string;
  filiereAutre?: string | null;
  niveauEtude: string;
  niveauEtudeAutre?: string | null;
  statut: ProcedureStatus;
  raisonRejet?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletionReason?: string | null;
  dateCompletion?: Date | null;
  dateDerniereModification?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
  // Relations optionnelles
  steps?: StepEntity[];
  rendezVous?: ProcedureRendezvousInfoEntity;
  user?: ProcedureUserInfoEntity;
}

export interface ProcedureWithMetaEntity extends ProcedureEntity {
  fullName: string;
  effectiveDestination: string;
  effectiveFiliere: string;
  effectiveNiveauEtude: string;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  activeStep?: StepName;
  nextStep?: StepName;
  statusLabel: string;
  statusColor: StatusColor;
  canBeModified: boolean;
  isOverdue: boolean;
  daysSinceCreation: number;
  estimatedCompletionDate?: Date;
  lastActivity: Date;
}

export interface ProcedureStatisticsEntity {
  total: number;
  byStatus: Record<ProcedureStatus, number>;
  completionRate: number;
  rejectionRate: number;
  averageCompletionTime: number;
  newProcedures: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topDestinations: { destination: string; count: number }[];
  topFilieres: { filiere: string; count: number }[];
  stepsAnalytics: {
    stepName: StepName;
    completionRate: number;
    averageTime: number;
  }[];
}

// ─── Entité Audit (procedure-audit.entity.ts) ─────────────────────────────────

export type ProcedureAuditAction =
  | "PROCEDURE CREATED"
  | "PROCEDURE UPDATED"
  | "PROCEDURE STATUS CHANGED"
  | "PROCEDURE DELETED"
  | "PROCEDURE RESTORED"
  | "STEP ADDED"
  | "STEP UPDATED"
  | "STEP STATUS CHANGED"
  | "COMMENT ADDED"
  | "FILE ATTACHED"
  | "FILE REMOVED"
  | "EMAIL SENT"
  | "VIEWED"
  | "EXPORTED";

export type AuditRole = "ADMIN" | "USER" | "SYSTEM";

export interface ProcedureAuditEntity {
  id: string;
  procedureId: string;
  action: ProcedureAuditAction;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface StepAuditEntity {
  stepId: string;
  stepName: StepName;
  action: ProcedureAuditAction;
  oldStatus?: StepStatus;
  newStatus?: StepStatus;
  oldRaisonRefus?: string;
  newRaisonRefus?: string;
  updatedAt: Date;
}

export interface ProcedureAuditFilterEntity {
  procedureId?: string;
  action?: ProcedureAuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number; // default 100
  offset?: number; // default 0
  sortBy?: string; // default 'createdAt'
  sortOrder?: SortOrder; // default 'desc'
}

export interface PaginatedProcedureAuditEntity {
  data: ProcedureAuditEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ─── Entité Timeline (procedure-timeline.entity.ts) ───────────────────────────

export type TimelineEventType =
  | "STEP_CREATED"
  | "STEP_UPDATED"
  | "STEP_COMPLETED"
  | "STATUS_CHANGED"
  | "COMMENT_ADDED";

export interface TimelineEventEntity {
  id: string;
  procedureId: string;
  type: TimelineEventType;
  stepName?: StepName;
  oldStatus?: StepStatus;
  newStatus?: StepStatus;
  oldProcedureStatus?: string;
  newProcedureStatus?: string;
  comment?: string;
  createdBy: string;
  createdByRole: AuditRole;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ProcedureTimelineEntity {
  procedureId: string;
  events: TimelineEventEntity[];
  summary: {
    totalEvents: number;
    firstEvent: Date;
    lastEvent: Date;
    duration: number; // en jours
    stepsTimeline: {
      stepName: StepName;
      created: Date;
      completed?: Date;
      duration?: number;
    }[];
  };
}

export interface ProcedureCommentEntity {
  id: string;
  procedureId: string;
  content: string;
  createdBy: string;
  createdByRole: "ADMIN" | "USER";
  createdAt: Date;
  updatedAt: Date;
  isInternal: boolean;
  attachments?: { name: string; url: string; size: number }[];
}

// ─── Types utilitaires service frontend ───────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: { field: string; message: string; value?: unknown }[];
  statusCode?: number;
}

export interface ApiResponse<T = unknown> {
  statusCode?: number;
  message?: string;
  data: T;
}

// ─── Types hook useProcedures ─────────────────────────────────────────────────

export interface ProcedureLoadingState {
  list: boolean;
  details: boolean;
  statistics: boolean;
  create: boolean;
  update: boolean;
  updateStep: boolean;
  delete: boolean;
  report: boolean;
  export: boolean;
}

export interface ProcedurePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProcedureFilters {
  status?: ProcedureStatus;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
  email?: string;
  destination?: string;
  filiere?: string;
  includeDeleted?: boolean;
}

// ─── Types export & rapport ───────────────────────────────────────────────────

export interface ProcedureExportData {
  format: ExportFormat;
  filters?: ProcedureFilters;
  includeSteps?: boolean;
  includeAudit?: boolean;
}

export interface ProcedureReport {
  id: string;
  title: string;
  description: string;
  generatedAt: Date;
  generatedBy: string;
  data: {
    totalProcedures: number;
    byStatus: Record<string, number>;
    byDestination: Record<string, number>;
    byFiliere: Record<string, number>;
    completionTimes: number[];
    averageCompletionTime: number;
    dateRange: { start: Date; end: Date };
  };
}

// ─── Types métriques & alertes ────────────────────────────────────────────────

export interface ProcedureMetrics {
  averageStepDuration: Record<StepName, number>;
  bottleneckSteps: StepName[];
  completionRateByStep: Record<StepName, number>;
  failureRateByStep: Record<StepName, number>;
  averageProcedureDuration: number;
  proceduresPerMonth: Record<string, number>;
}

export interface ProcedureAlert {
  id: string;
  procedureId: string;
  type: "OVERDUE" | "BOTTLENECK" | "HIGH_FAILURE_RATE" | "COMPLETION_SOON";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  isActive: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ProcedureNotification {
  id: string;
  type:
    | "STEP_COMPLETED"
    | "STEP_FAILED"
    | "PROCEDURE_COMPLETED"
    | "PROCEDURE_REJECTED";
  procedureId: string;
  stepId?: string;
  message: string;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
}
