// services/procedures.service.ts
// Calqué strictement sur procedures.controller.ts (NestJS)

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

// ─── Gestion des réponses ─────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as unknown as T;

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
    ) as Error & { apiError: ApiError; status: number };
    err.apiError = apiError;
    err.status = res.status;
    throw err;
  }

  // Détection réponse paginée (avec data, total, page, limit, totalPages, hasNext, hasPrevious)
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    Array.isArray((body as unknown as { data: unknown[] }).data) &&
    "total" in body &&
    typeof (body as unknown as { total: number }).total === "number" &&
    "page" in body &&
    "limit" in body
  ) {
    return body as T;
  }

  // Wrapper NestJS simple { data: T, message?, statusCode? }
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    !("id" in body) &&
    !Array.isArray(body)
  ) {
    return (body as { data: T }).data;
  }

  return body as T;
}

// ─── Fetch authentifié ────────────────────────────────────────────────────────
import { apiFetch } from "../context/AuthContext";

// ─── Service ─────────────────────────────────────────────────────────────────

export const ProceduresService = {
  // ── Routes Admin ─────────────────────────────────────────────────────────

  /**
   * POST /admin/procedures/create — ADMIN
   */
  async create(data: CreateProcedureDto): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/procedures/create`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success("Procédure créée avec succès");
      return result;
    } catch (error) {
      toast.error("Erreur lors de la création de la procédure");
      throw error;
    }
  },

  /**
   * GET /admin/procedures/all — ADMIN
   * Retourne PaginatedProcedureResponseDto avec data, total, page, limit, totalPages, hasNext, hasPrevious
   */
  async findAll(
    query: ProcedureQueryDto = {},
  ): Promise<PaginatedProcedureResponseDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const url = `${BASE_URL}/admin/procedures/all${params.toString() ? `?${params}` : ""}`;
    console.log("[ProceduresService] GET", url);

    try {
      const res = await apiFetch(url, { method: "GET" });
      console.log("[ProceduresService] Response status:", res.status);
      const result = await handleResponse<PaginatedProcedureResponseDto>(res);
      
      // Validation de la structure paginée
      if (!result.data || !Array.isArray(result.data)) {
        console.error("[ProceduresService] Réponse invalide:", result);
        return {
          data: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        };
      }
      
      return result;
    } catch (error) {
      console.error("[ProceduresService] Erreur findAll:", error);
      throw error;
    }
  },

  /**
   * GET /admin/procedures/statistics — ADMIN
   */
  async getStatistics(): Promise<ProcedureStatisticsDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/admin/procedures/statistics`, {
        method: "GET",
      });
      const result = await handleResponse<ProcedureStatisticsDto>(res);
      return result;
    } catch (error) {
      toast.error("Erreur lors du chargement des statistiques");
      throw error;
    }
  },

  /**
   * PATCH /admin/procedures/:id/steps/:stepName — ADMIN
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
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} mise à jour avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de la mise à jour de l'étape ${stepName}`);
      throw error;
    }
  },

  /**
   * POST /admin/procedures/:id/steps/:stepName — ADMIN
   */
  async addStep(id: string, stepName: StepName): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(
        `${BASE_URL}/admin/procedures/${id}/steps/${stepName}`,
        { method: "POST" },
      );
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} ajoutée avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de l'ajout de l'étape ${stepName}`);
      throw error;
    }
  },

  /**
   * DELETE /admin/procedures/:id/delete — ADMIN
   * Retourne 204 No Content
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
   */
  async findByEmail(email: string): Promise<ProcedureResponseDto[]> {
    const res = await apiFetch(
      `${BASE_URL}/procedures/${encodeURIComponent(email)}`,
      { method: "GET" },
    );
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
      ) as Error & { apiError: unknown };
      err.apiError = body;
      throw err;
    }

    if (Array.isArray(body)) return body as ProcedureResponseDto[];
    if (
      body &&
      typeof body === "object" &&
      "data" in body &&
      Array.isArray((body as { data: unknown }).data)
    ) {
      return (body as { data: ProcedureResponseDto[] }).data;
    }
    return [];
  },

  /**
   * GET /procedures/:rendezVousId
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
   */
  async findById(id: string): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}/procedures/${id}/details`, {
      method: "GET",
    });
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * PATCH /procedures/:id/update
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

  /**
   * PATCH /procedures/:id/cancel
   */
  async cancel(
    id: string,
    reason = "Annulation par l'utilisateur",
  ): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}/procedures/${id}/cancel`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reason }),
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success("Procédure annulée avec succès");
      return result;
    } catch (error) {
      toast.error("Erreur lors de l'annulation de la procédure");
      throw error;
    }
  },

  // ── Helpers frontend ────────────────────────────────────────────

  /**
   * Convertit ProcedureFilters en ProcedureQueryDto et appelle findAll
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
   * Récupère les procédures en retard
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

  // ── Validation client ─────────────────────────────────────────────────────

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