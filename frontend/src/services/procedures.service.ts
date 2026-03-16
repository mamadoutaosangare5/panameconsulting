// services/procedures.service.ts
// Calqué strictement sur procedures.controller.ts (NestJS)
// Chaque méthode = un endpoint exact du controller

import { toast } from "react-hot-toast";
import type {
  ProcedureResponseDto,
  PaginatedProcedureResponseDto,
  ProcedureStatisticsDto,
  CreateProcedureDto,
  UpdateProcedureDto,
  UpdateStepDto,
  ProcedureQueryDto,
  ProcedureFilters,
  StepName,
  ApiError,
} from "../types/procedures.types";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const JSON_HEADERS = { "Content-Type": "application/json" };

// ─── Gestion des erreurs ──────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  // 204 No Content — DELETE retourne void
  if (res.status === 204) return undefined as unknown as T;

  // Type for wrapped responses from NestJS ApiResponse
  type WrappedResponse<TData> = {
    data: TData;
    message?: string;
    statusCode?: number;
  };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { message: `Erreur ${res.status}` };
  }

  if (!res.ok) {
    const apiError = body as ApiError;
    const err = new Error(
      apiError.message || `Erreur ${res.status}`,
    ) as Error & {
      apiError: ApiError;
      status: number;
    };
    err.apiError = apiError;
    err.status = res.status;
    throw err;
  }

  // Le backend NestJS wrappe dans { data: T } via ApiResponse
  // Certaines routes retournent directement le tableau (findByUserEmail)
  // Vérifier si la réponse a une propriété 'data' (wrapped response)
  if (body && typeof body === "object" && "data" in body) {
    return (body as WrappedResponse<T>).data;
  }
  return body as T;
}

// ─── Fetch authentifié (délégué à apiFetch de l'AuthContext) ─────────────────
// On importe apiFetch pour conserver la gestion du refresh token existante
import { apiFetch } from "../context/AuthContext";

// ─── Service ─────────────────────────────────────────────────────────────────

export const ProceduresService = {
  // ── Routes Admin ─────────────────────────────────────────────────────────

  /**
   * POST /admin/procedures/create — Admin
   * Créer une procédure depuis un rendez-vous éligible
   */
  async create(data: CreateProcedureDto): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/procedures/create`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      });
      const result = handleResponse<ProcedureResponseDto>(res);
      toast.success("Procédure créée avec succès");
      return result;
    } catch (error) {
      toast.error("Erreur lors de la création de la procédure");
      throw error;
    }
  },

  /**
   * GET /admin/procedures/all — Admin
   * Liste paginée avec filtres, tri, recherche, plage de dates
   */
  async findAll(
    query: ProcedureQueryDto = {},
  ): Promise<PaginatedProcedureResponseDto> {
    const params = new URLSearchParams();

    const entries: [string, unknown][] = Object.entries(query);
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }

    const url = `${BASE_URL}/admin/procedures/all${params.toString() ? `?${params}` : ""}`;
    const res = await apiFetch(url, { method: "GET" });
    return handleResponse<PaginatedProcedureResponseDto>(res);
  },

  /**
   * GET /admin/procedures/statistics — Admin
   */
  async getStatistics(): Promise<ProcedureStatisticsDto> {
    try {
      console.log("[ProceduresService] Récupération des statistiques...");
      const res = await apiFetch(`${BASE_URL}/admin/procedures/statistics`, {
        method: "GET",
      });
      const result = await handleResponse<ProcedureStatisticsDto>(res);
      console.log("[ProceduresService] Statistiques reçues .");
      console.log("[ProceduresService] Statistiques extraites:", Object.keys(result).length);
      toast.success("Statistiques chargées avec succès");
      return result;
    } catch (error) {
      console.error("[ProceduresService] Erreur lors de la récupération des statistiques:", error);
      toast.error("Erreur lors du chargement des statistiques");
      throw error;
    }
  },

  /**
   * PATCH /admin/procedures/:id/steps/:stepName — Admin
   * Mettre à jour une étape existante
   */
  async updateStep(
    id: string,
    stepName: StepName,
    data: UpdateStepDto,
  ): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(
        `${BASE_URL}/admin/procedures/${id}/steps/${stepName}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        },
      );
      const result = handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} mise à jour avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de la mise à jour de l'étape ${stepName}`);
      throw error;
    }
  },

  /**
   * POST /admin/procedures/:id/steps/:stepName — Admin
   * Ajouter une nouvelle étape (409 si déjà existante)
   */
  async addStep(id: string, stepName: StepName): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(
        `${BASE_URL}/admin/procedures/${id}/steps/${stepName}`,
        { method: "POST" },
      );
      const result = handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} ajoutée avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de l'ajout de l'étape ${stepName}`);
      throw error;
    }
  },

  /**
   * DELETE /admin/procedures/:id/delete — Admin
   * Soft delete, body: { reason?: string }
   * Backend retourne 204 No Content
   */
  async remove(id: string, reason = "Suppression manuelle"): Promise<void> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/procedures/${id}/delete`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reason }),
      });
      await handleResponse<void>(res);
      toast.success("Procédure supprimée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la suppression de la procédure");
      throw error;
    }
  },

  // ── Routes mixtes (admin + utilisateur connecté) ──────────────────────────

  /**
   * GET /procedures/:email
   * Trouver toutes les procédures d'un utilisateur par email
   * Le backend retourne directement un tableau (pas de wrapper ApiResponse)
   */
  async findByEmail(email: string): Promise<ProcedureResponseDto[]> {
    const res = await apiFetch(
      `${BASE_URL}/procedures/${encodeURIComponent(email)}`,
      { method: "GET" },
    );
    // Cette route retourne directement un tableau
    if (res.status === 204) return [];
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return [];
    }
    if (!res.ok) {
      const err = new Error(
        (body as { message?: string })?.message ?? `Erreur ${res.status}`,
      ) as Error & {
        apiError: unknown;
      };
      err.apiError = body;
      throw err;
    }
    return Array.isArray(body)
      ? body
      : (((body as { data?: unknown })?.data as ProcedureResponseDto[]) ?? []);
  },

  /**
   * GET /procedures/:rendezVousId
   * Trouver une procédure par ID de rendez-vous
   */
  async findByRendezvousId(
    rendezVousId: string,
  ): Promise<ProcedureResponseDto | null> {
    const res = await apiFetch(`${BASE_URL}/procedures/${rendezVousId}`, {
      method: "GET",
    });
    if (res.status === 404) return null;
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * GET /procedures/:id/details
   * Détails complets d'une procédure (toutes les virtuels calculés)
   */
  async findById(id: string): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}/procedures/${id}/details`, {
      method: "GET",
    });
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * PATCH /procedures/:id/update
   * Mettre à jour une procédure (admin ou propriétaire selon le guard)
   */
  async update(
    id: string,
    data: UpdateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}/procedures/${id}/update`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    });
    return handleResponse<ProcedureResponseDto>(res);
  },

  // ── Helpers frontend (pas de nouvelles routes) ────────────────────────────

  /**
   * Convertit un objet ProcedureFilters en ProcedureQueryDto
   * et appelle findAll — pas de nouvelle route
   */
  async findWithFilters(
    filters: ProcedureFilters,
  ): Promise<PaginatedProcedureResponseDto> {
    const query: ProcedureQueryDto = {
      status: filters.status,
      email: filters.email,
      destination: filters.destination,
      filiere: filters.filiere,
      includeDeleted: filters.includeDeleted,
      search: filters.searchTerm,
    };
    if (filters.dateRange) {
      query.startDate = filters.dateRange.start.toISOString().split("T")[0];
      query.endDate = filters.dateRange.end.toISOString().split("T")[0];
    }
    return this.findAll(query);
  },

  /**
   * Récupère les procédures en retard (isOverdue = true)
   * Basé sur le virtual calculé côté backend — pas de nouvelle route
   */
  async findOverdue(): Promise<ProcedureResponseDto[]> {
    const result = await this.findAll({
      status: "IN_PROGRESS",
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "asc",
    });
    return result.data.filter((p) => p.isOverdue);
  },

  /**
   * PATCH /procedures/:id/cancel — User
   * Annuler une procédure (utilisateur connecté)
   */
  async cancel(id: string, reason?: string): Promise<void> {
    try {
      const res = await apiFetch(`${BASE_URL}/procedures/${id}/cancel`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reason }),
      });
      await handleResponse<void>(res);
      toast.success("Procédure annulée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'annulation de la procédure");
      throw error;
    }
  },

  /**
   * Validation client — miroir des contraintes create-procedure.dto.ts
   */
  validate(data: Partial<CreateProcedureDto>): Record<string, string> {
    const errors: Record<string, string> = {};
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const NAME_RE = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    const PHONE_RE = /^\+?[1-9]\d{1,14}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if ("rendezVousId" in data) {
      if (!data.rendezVousId)
        errors.rendezVousId = "L'ID du rendez-vous est requis";
      else if (!UUID_RE.test(data.rendezVousId))
        errors.rendezVousId = "UUID invalide";
    }
    if ("prenom" in data) {
      if (!data.prenom || data.prenom.trim().length < 2)
        errors.prenom = "Min 2 caractères";
      else if (data.prenom.length > 50) errors.prenom = "Max 50 caractères";
      else if (!NAME_RE.test(data.prenom))
        errors.prenom = "Caractères invalides";
    }
    if ("nom" in data) {
      if (!data.nom || data.nom.trim().length < 2)
        errors.nom = "Min 2 caractères";
      else if (data.nom.length > 50) errors.nom = "Max 50 caractères";
      else if (!NAME_RE.test(data.nom)) errors.nom = "Caractères invalides";
    }
    if ("email" in data) {
      if (!data.email) errors.email = "L'email est requis";
      else if (!EMAIL_RE.test(data.email))
        errors.email = "Format d'email invalide";
    }
    if ("telephone" in data) {
      if (!data.telephone) errors.telephone = "Le téléphone est requis";
      else if (!PHONE_RE.test(data.telephone))
        errors.telephone = "Format international requis";
    }
    if (
      "destination" in data &&
      (!data.destination || data.destination.trim().length < 2)
    )
      errors.destination = "Destination requise (min 2 caractères)";
    if ("filiere" in data && (!data.filiere || data.filiere.trim().length < 2))
      errors.filiere = "Filière requise (min 2 caractères)";
    if ("niveauEtude" in data && !data.niveauEtude?.trim())
      errors.niveauEtude = "Niveau d'étude requis";

    return errors;
  },

  isValid(data: Partial<CreateProcedureDto>): boolean {
    return Object.keys(this.validate(data)).length === 0;
  },
};
