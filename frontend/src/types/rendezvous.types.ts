// ============================================================
// rendezvous.types.ts
// Version COMPLÈTE alignée sur le backend Prisma
// ============================================================

// ==================== TYPES PERSONNALISÉS (STRING) ====================

/**
 * Destinations - Accepte n'importe quelle valeur string
 * Valeurs communes suggérées pour l'UI
 */
export type Destination = string;

/**
 * Niveaux d'étude - Accepte n'importe quelle valeur string
 * Valeurs communes suggérées pour l'UI
 */
export type NiveauEtude = string;

/**
 * Filières - Accepte n'importe quelle valeur string
 * Valeurs communes suggérées pour l'UI
 */
export type Filiere = string;

/**
 * Créneaux horaires - Correspond exactement à Prisma TimeSlot
 */
export const TimeSlot = {
	"09:00": "09:00",
	"09:30": "09:30",
	"10:00": "10:00",
	"10:30": "10:30",
	"11:00": "11:00",
	"11:30": "11:30",
	"12:00": "12:00",
	"12:30": "12:30",
	"13:00": "13:00",
	"13:30": "13:30",
	"14:00": "14:00",
	"14:30": "14:30",
	"15:00": "15:00",
	"15:30": "15:30",
	"16:00": "16:00",
	"16:30": "16:30",
} as const;
export type TimeSlot = (typeof TimeSlot)[keyof typeof TimeSlot];

/**
 * Statuts du rendez-vous - Correspond exactement à Prisma RendezvousStatus
 */
export const RendezvousStatus = {
	PENDING: "PENDING",
	CONFIRMED: "CONFIRMED",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED",
} as const;
export type RendezvousStatus = (typeof RendezvousStatus)[keyof typeof RendezvousStatus];

/**
 * Avis administrateur - Correspond exactement à Prisma AdminOpinion
 */
export const AdminOpinion = {
	FAVORABLE: "FAVORABLE",
	UNFAVORABLE: "UNFAVORABLE",
} as const;
export type AdminOpinion = (typeof AdminOpinion)[keyof typeof AdminOpinion];

/**
 * Annulé par - Correspond exactement à Prisma CancelledBy
 */
export const CancelledBy = {
	USER: "USER",
	ADMIN: "ADMIN",
	SYSTEM: "SYSTEM",
} as const;
export type CancelledBy = (typeof CancelledBy)[keyof typeof CancelledBy];

// ==================== DTOs REQUÊTE ====================

/**
 * POST /rendezvous
 * Miroir EXACT de CreateRendezvousDto (backend)
 */
export interface CreateRendezvousDto {
	firstName: string;
	lastName: string;
	email: string;
	telephone: string;
	destination: Destination;
	destinationAutre?: string;
	niveauEtude: NiveauEtude;
	niveauEtudeAutre?: string;
	filiere: Filiere;
	filiereAutre?: string;
	date: string; // Format: YYYY-MM-DD
	time: TimeSlot; // Format: HH:MM (parmi TimeSlot)
}

/**
 * PATCH /admin/rendezvous/:id/patch
 * Miroir EXACT de UpdateRendezvousDto (backend)
 */
export interface UpdateRendezvousDto extends Partial<CreateRendezvousDto> {
	avisAdmin?: AdminOpinion;
	cancellationReason?: string;
	status?: RendezvousStatus;
}

/**
 * PATCH /rendezvous/:id/cancel
 * Miroir EXACT de CancelRendezvousDto (backend)
 */
export interface CancelRendezvousDto {
	reason: string;
	cancelledBy?: CancelledBy;
}

/**
 * PATCH /admin/rendezvous/:id/complete
 * Miroir EXACT de CompleteRendezvousDto (backend)
 */
export interface CompleteRendezvousDto {
	avisAdmin: AdminOpinion;
	comments?: string;
}

/**
 * GET /admin/rendezvous/all — Query params
 * Miroir EXACT de RendezvousQueryDto (backend)
 */
export interface RendezvousQueryDto {
	page?: number;
	limit?: number;
	status?: RendezvousStatus;
	date?: string; // YYYY-MM-DD
	email?: string;
	destination?: string;
	filiere?: string;
	startDate?: string; // YYYY-MM-DD
	endDate?: string; // YYYY-MM-DD
	search?: string;
	hasAvis?: boolean;
	hasProcedure?: boolean;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

// ==================== DTOs RÉPONSE ====================

/**
 * User info dans les relations
 */
export interface UserInfoDto {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	fullName: string;
}

/**
 * Procedure info dans les relations
 */
export interface ProcedureInfoDto {
	id: string;
	statut: string;
}

/**
 * RendezvousResponseDto - Miroir EXACT de ce que le backend renvoie
 */
export interface RendezvousResponseDto {
	// Identifiants
	id: string;

	// Informations personnelles
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	telephone: string;

	// Destination
	destination: string;
	destinationAutre?: string | null;
	effectiveDestination: string;

	// Niveau d'étude
	niveauEtude: string;
	niveauEtudeAutre?: string | null;
	effectiveNiveauEtude: string;

	// Filière
	filiere: string;
	filiereAutre?: string | null;
	effectiveFiliere: string;

	// Date et heure
	date: string; // YYYY-MM-DD
	time: TimeSlot; // HH:MM
	dateTime: string; // ISO string

	// Statut
	status: RendezvousStatus;
	avisAdmin?: AdminOpinion | null;

	// Annulation
	cancelledAt?: string | null; // ISO string
	cancelledBy?: CancelledBy | null;
	cancellationReason?: string | null;

	// Métadonnées
	createdAt: string; // ISO string
	updatedAt: string; // ISO string
	userId?: string | null;

	// Relations
	user?: UserInfoDto | null;
	procedure?: ProcedureInfoDto | null;

	// Propriétés calculées (virtuelles)
	canCancel: boolean;
	canModify: boolean;
	isPast: boolean;
	isToday: boolean;
	minutesUntilRendezvous: number;
}

/**
 * PaginatedRendezvousResponseDto - Miroir EXACT du backend
 */
export interface PaginatedRendezvousResponseDto {
	data: RendezvousResponseDto[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

/**
 * RendezvousStatisticsDto - Miroir EXACT du backend
 */
export interface RendezvousStatisticsDto {
	total: number;
	byStatus: {
		confirmed: number;
		completed: number;
		cancelled: number;
		pending: number;
	};
	upcoming: {
		today: number;
		tomorrow: number;
		thisWeek: number;
		thisMonth: number;
	};
	topDestinations: { destination: string; count: number }[];
	completionRate: number;
	cancellationRate: number;
}

/**
 * AvailableSlotsDto - Ce que le backend renvoie pour /available-slots/:date
 */
export interface AvailableSlotsDto {
	date: string; // ISO string
	available: boolean;
	availableSlots: TimeSlot[]; // Liste des créneaux disponibles
	totalSlots: number;
	occupiedSlots: number;
}

/**
 * AvailabilityCheckDto - Ce que le backend renvoie pour /check-availability
 */
export interface AvailabilityCheckDto {
	available: boolean;
	date: string; // YYYY-MM-DD
	time: TimeSlot; // HH:MM
	alternativeSlots?: TimeSlot[]; // Créneaux alternatifs
	nextAvailableSlot?: { date: string; time: TimeSlot };
}

/**
 * AvailableDatesResponseDto - Ce que le backend renvoie pour /available-dates
 */
export interface AvailableDatesResponseDto {
	date: string; // YYYY-MM-DD
	availableSlots: number;
	hasSlots: boolean;
}

// ==================== FILTRES INTERNES ====================

export interface RendezvousFilterEntity {
	status?: RendezvousStatus | RendezvousStatus[];
	dateRange?: { start: string; end: string };
	destinations?: string[];
	searchTerm?: string;
	hasProcedure?: boolean;
	avisAdmin?: AdminOpinion;
	createdAfter?: string;
	createdBefore?: string;
}

// ==================== OPTIONS SUGGÉRÉES POUR L'UI ====================

/**
 * Options de destination suggérées pour l'interface
 */
export const DESTINATION_OPTIONS = [
	"France",
	"Russie",
	"Chypre",
	"Chine",
	"Maroc",
	"Algérie",
	"Turquie",
	"Autre",
] as const;

/**
 * Options de niveau d'étude suggérées pour l'interface
 */
export const NIVEAU_ETUDE_OPTIONS = [
	"Bac",
	"Bac+1",
	"Bac+2",
	"Licence",
	"Master I",
	"Master II",
	"Doctorat",
	"Autre",
] as const;

/**
 * Options de filière suggérées pour l'interface
 */
export const FILIERE_OPTIONS = [
	"Informatique",
	"Médecine",
	"Droit",
	"Commerce",
	"Ingénierie",
	"Architecture",
	"Autre",
] as const;

// ==================== ALIASES FRONTEND ====================

export type Rendezvous = RendezvousResponseDto;
export type CreateRendezvousData = CreateRendezvousDto;
export type UpdateRendezvousData = UpdateRendezvousDto;
export type CancelRendezvousData = CancelRendezvousDto;
export type CompleteRendezvousData = CompleteRendezvousDto;
export type RendezvousQueryParams = RendezvousQueryDto;
export type RendezvousStatistics = RendezvousStatisticsDto;
export type AvailableSlots = AvailableSlotsDto;
export type AvailabilityCheck = AvailabilityCheckDto;
export type AvailableDate = AvailableDatesResponseDto;
export type RendezvousFilters = RendezvousFilterEntity;

// ==================== ERREURS API ====================

export interface ApiErrorDetail {
	field: string;
	message: string;
	value?: unknown;
}

export interface ApiError {
	message: string;
	errors?: ApiErrorDetail[];
	statusCode?: number;
}

// ==================== CONSTANTES UTILITAIRES ====================

/**
 * Mapping des libellés français pour l'affichage
 */
export const RendezvousStatusLabels: Record<RendezvousStatus, string> = {
	PENDING: "En attente",
	CONFIRMED: "Confirmé",
	COMPLETED: "Terminé",
	CANCELLED: "Annulé",
};

export const AdminOpinionLabels: Record<AdminOpinion, string> = {
	FAVORABLE: "Favorable",
	UNFAVORABLE: "Défavorable",
};

export const CancelledByLabels: Record<CancelledBy, string> = {
	USER: "Utilisateur",
	ADMIN: "Administrateur",
	SYSTEM: "Système",
};

// ==================== UTILITAIRES TIMESLOT ====================

/**
 * Convertit un TimeSlot (ex: SLOT_0930) en format lisible (ex: 9H30)
 */
export const formatTimeSlot = (timeSlot: string): string => {
	const timeMap: Record<string, string> = {
		SLOT_0900: "9H00",
		SLOT_0930: "9H30",
		SLOT_1000: "10H00",
		SLOT_1030: "10H30",
		SLOT_1100: "11H00",
		SLOT_1130: "11H30",
		SLOT_1200: "12H00",
		SLOT_1230: "12H30",
		SLOT_1300: "13H00",
		SLOT_1330: "13H30",
		SLOT_1400: "14H00",
		SLOT_1430: "14H30",
		SLOT_1500: "15H00",
		SLOT_1530: "15H30",
		SLOT_1600: "16H00",
		SLOT_1630: "16H30",
	};

	return timeMap[timeSlot] || timeSlot;
};

/**
 * Convertit un TimeSlot (ex: SLOT_0930) en format HH:MM pour les calculs (ex: 09:30)
 */
export const timeSlotToDateTime = (timeSlot: string): string => {
	const timeMap: Record<string, string> = {
		SLOT_0900: "09:00",
		SLOT_0930: "09:30",
		SLOT_1000: "10:00",
		SLOT_1030: "10:30",
		SLOT_1100: "11:00",
		SLOT_1130: "11:30",
		SLOT_1200: "12:00",
		SLOT_1230: "12:30",
		SLOT_1300: "13:00",
		SLOT_1330: "13:30",
		SLOT_1400: "14:00",
		SLOT_1430: "14:30",
		SLOT_1500: "15:00",
		SLOT_1530: "15:30",
		SLOT_1600: "16:00",
		SLOT_1630: "16:30",
	};

	return timeMap[timeSlot] || timeSlot;
};

/**
 * Vérifie si un rendez-vous peut être annulé (moins de 2H avant)
 */
export const canCancelRendezvous = (rdv: Rendezvous): boolean => {
	return rdv.canCancel && rdv.status === RendezvousStatus.CONFIRMED;
};

/**
 * Calcule le temps restant avant l'annulation (max 2H avant)
 */
export const getRemainingCancellationTime = (rdv: Rendezvous): string | null => {
	if (!rdv.canCancel) return null;
	const now = new Date();
	const rdvDateTime = new Date(`${rdv.date}T${timeSlotToDateTime(rdv.time)}`);
	const diffMs = rdvDateTime.getTime() - now.getTime();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
	return diffHours > 0 ? `${diffHours}h ${diffMinutes}min` : `${diffMinutes}min`;
};
