// ============================================================
// rendezvous.service.ts
// Version COMPLÈTE alignée sur le backend Prisma
// ============================================================

import { apiFetch } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import type {
  // Enums
  TimeSlot,

  // DTOs Requête
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  CompleteRendezvousDto,
  RendezvousQueryDto,

  // DTOs Réponse
  RendezvousResponseDto,
  PaginatedRendezvousResponseDto,
  RendezvousStatisticsDto,
  AvailableSlotsDto,
  AvailabilityCheckDto,
  AvailableDatesResponseDto,

  // Types utilitaires
  ApiError,
  RendezvousFilters,
} from "../types/rendezvous.types";

class RendezvousService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL as string;
  }

  // ─────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────

  /**
   * Calcule les champs effectifs (destination, niveau, filière)
   * Préserve toutes les propriétés du backend dont canCancel, canModify, etc.
   */
  private calculateEffectiveFields(
    rdv: RendezvousResponseDto,
  ): RendezvousResponseDto {
    return {
      ...rdv, // Préserver TOUTES les propriétés du backend
      effectiveDestination: rdv.destinationAutre || rdv.destination || "",
      effectiveNiveauEtude: rdv.niveauEtudeAutre || rdv.niveauEtude || "",
      effectiveFiliere: rdv.filiereAutre || rdv.filiere || "",
    };
  }

  // ==================== UTILITAIRES PRIVÉS ====================

  /**
   * Construit l'URL avec les paramètres de requête
   */
  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean> | RendezvousQueryDto,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Formate une date en YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (typeof date === "string") return date;
    return date.toISOString().split("T")[0];
  }

  /**
   * Gère les erreurs API de manière centralisée
   */
  private async handleError(response: Response): Promise<never> {
    let errorMessage = `Erreur ${response.status}`;

    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.message || errorMessage;

      // Afficher les erreurs de validation détaillées
      if (errorData.errors?.length) {
        errorData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(errorMessage);
      }
    } catch {
      toast.error(errorMessage);
    }

    throw new Error(errorMessage);
  }

  /**
   * Traite la réponse API de manière uniforme
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) await this.handleError(response);

    // Cas 204 No Content
    if (response.status === 204) return undefined as T;

    try {
      const data = await response.json();

      // Cas 1: Réponse enveloppée { data, message, statusCode }
      if (data && typeof data === "object" && "data" in data) {
        return data.data as T;
      }

      // Cas 2: Réponse directe
      return data as T;
    } catch (error) {
      console.error("Erreur parsing JSON:", error);
      throw new Error("Réponse invalide du serveur", { cause: error });
    }
  }

  /**
   * Masque les données sensibles pour les logs
   */
  private maskSensitiveData(data: unknown): unknown {
    if (!data || typeof data !== "object") return data;

    const masked = { ...data } as Record<string, unknown>;

    if (masked.email && typeof masked.email === "string") {
      const [local, domain] = masked.email.split("@");
      masked.email = `${local.charAt(0)}***@${domain}`;
    }

    if (masked.telephone && typeof masked.telephone === "string") {
      masked.telephone = masked.telephone.replace(/\d(?=\d{4})/g, "*");
    }

    return masked;
  }

  // ==================== ROUTES PUBLIQUES ====================

  /**
   * GET /rendezvous/available-slots/:date
   * Récupère les créneaux disponibles pour une date donnée
   */
  async getAvailableSlots(date: Date | string): Promise<AvailableSlotsDto> {
    const dateStr = this.formatDate(date);
    const url = `${this.baseUrl}/rendezvous/available-slots/${encodeURIComponent(dateStr)}`;

    try {
      const response = await apiFetch(url);
      const result = await this.handleResponse<AvailableSlotsDto>(response);

      console.log(
        `[RendezvousService]  ${result.availableSlots.length} créneaux disponibles pour ${dateStr}`,
      );
      toast.success(
        `${result.availableSlots.length} créneaux disponibles pour ${dateStr}`,
      );
      return result;
    } catch (error) {
      console.error(`[RendezvousService] Erreur getAvailableSlots:`, error);

      // Fallback en cas d'erreur
      return {
        date: new Date().toISOString(),
        available: false,
        availableSlots: [],
        totalSlots: 16,
        occupiedSlots: 0,
      };
    }
  }

  /**
   * GET /rendezvous/available-dates
   * Récupère les dates disponibles sur une période
   */
  async getAvailableDates(
    startDate?: Date | string,
    endDate?: Date | string,
  ): Promise<AvailableDatesResponseDto[]> {
    const params: Record<string, string> = {};

    if (startDate) params.startDate = this.formatDate(startDate);
    if (endDate) params.endDate = this.formatDate(endDate);

    const url = this.buildUrl("/rendezvous/available-dates", params);
    console.log(`[RendezvousService] GET ${url}`);

    try {
      const response = await apiFetch(url);
      const result =
        await this.handleResponse<AvailableDatesResponseDto[]>(response);

      console.log(
        `[RendezvousService]  ${result.length} dates disponibles trouvées`,
      );
      toast.success(`${result.length} dates disponibles`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService]  Erreur getAvailableDates:`, error);
      return [];
    }
  }

  /**
   * GET /rendezvous/check-availability
   * Vérifie la disponibilité d'un créneau spécifique
   */
  async checkAvailability(
    date: Date | string,
    time: TimeSlot,
  ): Promise<AvailabilityCheckDto> {
    const dateStr = this.formatDate(date);
    const url = `${this.baseUrl}/rendezvous/check-availability?date=${encodeURIComponent(dateStr)}&time=${encodeURIComponent(time)}`;

    console.log(`[RendezvousService] GET ${url}`);

    try {
      const response = await apiFetch(url);
      const result = await this.handleResponse<AvailabilityCheckDto>(response);
      if (result.available) {
        toast.success(`Créneau ${dateStr} ${time} disponible`);
      } else {
        toast.error(`Créneau ${dateStr} ${time} non disponible`);
      }
      return result;
    } catch (error) {
      console.error(`[RendezvousService]  Erreur checkAvailability:`, error);

      // Fallback
      return {
        available: false,
        date: dateStr,
        time,
        alternativeSlots: [],
      };
    }
  }

  // ==================== ROUTES UTILISATEUR ====================

  /**
   * POST /rendezvous
   * Crée un nouveau rendez-vous
   */
  async createRendezvous(
    data: CreateRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    // Valider les champs "Autre" obligatoires
    this.validateAutreFields(data);

    // Préparer les données en gérant la logique "Autre"
    const preparedData = this.prepareCreateData(data);

    const url = `${this.baseUrl}/rendezvous`;
    const maskedData = this.maskSensitiveData(preparedData);

    console.log(`[RendezvousService] POST ${url}`, maskedData);

    try {
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preparedData),
      });

      const result = await this.handleResponse<RendezvousResponseDto>(response);
      toast.success(`Rendez-vous créé avec succès`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService]  Erreur createRendezvous:`, error);
      throw error;
    }
  }

  /**
   * GET /rendezvous/by-email/:email
   * Récupère les rendez-vous d'un utilisateur par email
   */
  async getRendezvousByEmail(email: string): Promise<RendezvousResponseDto[]> {
    const url = `${this.baseUrl}/rendezvous/by-email/${encodeURIComponent(email)}`;
    console.log(`[RendezvousService] GET ${url}`);

    try {
      const response = await apiFetch(url);
      const result =
        await this.handleResponse<RendezvousResponseDto[]>(response);

      // Appliquer les champs effectifs
      const processedResult = result.map((rdv: RendezvousResponseDto) =>
        this.calculateEffectiveFields(rdv),
      );

      toast.success(`${processedResult.length} rendez-vous trouvés`);
      return processedResult;
    } catch (error) {
      console.error(`[RendezvousService]  Erreur getRendezvousByEmail:`, error);
      toast.error("Erreur lors de la récupération des rendez-vous");
      return [];
    }
  }

  /**
   * GET /rendezvous/:id
   * Récupère un rendez-vous par son ID
   */
  async getRendezvousById(id: string): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/rendezvous/${id}`;
    console.log(`[RendezvousService] GET ${url}`);

    try {
      const response = await apiFetch(url);
      const result = await this.handleResponse<RendezvousResponseDto>(response);
      toast.success(`Rendez-vous trouvé`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService] Erreur getRendezvousById:`, error);
      toast.error("Erreur lors de la récupération du rendez-vous");
      throw error;
    }
  }

  /**
   * PATCH /rendezvous/:id/cancel
   * Annule un rendez-vous
   */
  async cancelRendezvous(
    id: string,
    data: CancelRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/rendezvous/${id}/cancel`;
    console.log(`[RendezvousService] PATCH ${url}`, data);

    try {
      const response = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<RendezvousResponseDto>(response);
      toast.success(`Rendez-vous annulé`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService]  Erreur cancelRendezvous:`, error);
      toast.error("Erreur lors de l'annulation du rendez-vous");
      throw error;
    }
  }

  // ==================== ROUTES ADMIN ====================

  /**
   * PATCH /admin/rendezvous/:id/patch
   * Met à jour un rendez-vous
   */
  async updateRendezvous(
    id: string,
    data: UpdateRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    // Valider les champs "Autre" obligatoires
    this.validateAutreFields(data as CreateRendezvousDto);

    // Préparer les données en gérant la logique "Autre"
    const preparedData = this.prepareUpdateData(data);

    const url = `${this.baseUrl}/admin/rendezvous/${id}/patch`;

    try {
      const response = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preparedData),
      });

      const result = await this.handleResponse<RendezvousResponseDto>(response);
      toast.success(`Rendez-vous mis à jour`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService] Erreur updateRendezvous:`, error);
      toast.error("Erreur lors de la mise à jour du rendez-vous");
      throw error;
    }
  }

  /**
   * PATCH /admin/rendezvous/:id/complete
   * Marque un rendez-vous comme terminé (avec avis admin)
   */
  async completeRendezvous(
    id: string,
    data: CompleteRendezvousDto,
  ): Promise<RendezvousResponseDto> {
    const url = `${this.baseUrl}/admin/rendezvous/${id}/complete`;

    try {
      const response = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<RendezvousResponseDto>(response);
      toast.success(`Rendez-vous marqué comme terminé`);
      return result;
    } catch (error) {
      console.error(`[RendezvousService] Erreur completeRendezvous:`, error);
      toast.error("Erreur lors de la marquage du rendez-vous comme terminé");
      throw error;
    }
  }

  /**
   * DELETE /admin/rendezvous/:id/delete
   * Supprime (soft delete) un rendez-vous
   */
  async deleteRendezvous(id: string): Promise<void> {
    const url = `${this.baseUrl}/admin/rendezvous/${id}/delete`;

    try {
      const response = await apiFetch(url, { method: "DELETE" });
      await this.handleResponse<void>(response);
      toast.success(`Rendez-vous supprimé`);
    } catch (error) {
      console.error(`[RendezvousService]  Erreur deleteRendezvous:`, error);
      toast.error("Erreur lors de la suppression du rendez-vous");
      throw error;
    }
  }

  /**
   * GET /admin/rendezvous/statistics
   * Récupère les statistiques des rendez-vous (admin seulement)
   */
  async getStatistics(): Promise<RendezvousStatisticsDto> {
    try {
      console.log("[RendezvousService] Récupération des statistiques...");
      const response = await apiFetch(
        `${this.baseUrl}/admin/rendezvous/statistics`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          "Erreur lors de la récupération des statistiques";
        console.error("[RendezvousService] Erreur:", errorMessage, errorData);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("[RendezvousService] ✅ Statistiques reçues:", result);

      // Extraire les données du wrapper si nécessaire
      const statistics = result.data || result;
      console.log("[RendezvousService] 📊 Statistiques extraites:", statistics);

      return statistics;
    } catch (error) {
      console.error(
        "[RendezvousService] ❌ Erreur lors de la récupération des statistiques:",
        error,
      );
      toast.error("Erreur lors de la récupération des statistiques");
      throw error;
    }
  }

  // ==================== MÉTHODES UTILITAIRES POUR VALEURS PERSONNALISÉES ====================

  /**
   * Récupère la valeur effective d'un champ (gère la logique "Autre")
   */
  private getEffectiveValue(
    mainValue: string,
    autreValue?: string | null,
  ): string {
    if (mainValue?.toLowerCase().trim() === "autre" && autreValue) {
      return autreValue.trim();
    }
    return mainValue?.trim() || "";
  }

  /**
   * Prépare les données pour la création en gérant la logique "Autre"
   */
  private prepareCreateData(data: CreateRendezvousDto): CreateRendezvousDto {
    return {
      ...data,
      destination: this.getEffectiveValue(
        data.destination,
        data.destinationAutre,
      ),
      niveauEtude: this.getEffectiveValue(
        data.niveauEtude,
        data.niveauEtudeAutre,
      ),
      filiere: this.getEffectiveValue(data.filiere, data.filiereAutre),
    };
  }

  /**
   * Prépare les données pour la mise à jour en gérant la logique "Autre"
   */
  private prepareUpdateData(data: UpdateRendezvousDto): UpdateRendezvousDto {
    const prepared: UpdateRendezvousDto = { ...data };

    if (data.destination !== undefined) {
      prepared.destination = this.getEffectiveValue(
        data.destination,
        data.destinationAutre,
      );
    }
    if (data.niveauEtude !== undefined) {
      prepared.niveauEtude = this.getEffectiveValue(
        data.niveauEtude,
        data.niveauEtudeAutre,
      );
    }
    if (data.filiere !== undefined) {
      prepared.filiere = this.getEffectiveValue(
        data.filiere,
        data.filiereAutre,
      );
    }

    return prepared;
  }

  /**
   * Valide les champs "Autre" obligatoires
   */
  private validateAutreFields(data: CreateRendezvousDto): void {
    const errors: string[] = [];

    if (data.destination?.toLowerCase().trim() === "autre") {
      if (!data.destinationAutre?.trim()) {
        errors.push('La destination "Autre" nécessite une précision');
      }
    }

    if (data.niveauEtude?.toLowerCase().trim() === "autre") {
      if (!data.niveauEtudeAutre?.trim()) {
        errors.push('Le niveau d\'étude "Autre" nécessite une précision');
      }
    }

    if (data.filiere?.toLowerCase().trim() === "autre") {
      if (!data.filiereAutre?.trim()) {
        errors.push('La filière "Autre" nécessite une précision');
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.join(". ");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  // ==================== MÉTHODES UTILITAIRES AVANCÉES ====================

  /**
   * Récupère les créneaux disponibles sous forme de simple liste
   */
  async getAvailableSlotsList(date: Date | string): Promise<TimeSlot[]> {
    try {
      const slots = await this.getAvailableSlots(date);
      return slots.availableSlots;
    } catch {
      return [];
    }
  }

  /**
   * Rendez-vous du jour (admin)
   */
  async getTodayRendezvous(): Promise<RendezvousResponseDto[]> {
    const today = new Date();
    const dateStr = this.formatDate(today);
    const response = await apiFetch(
      `${this.baseUrl}/rendezvous/by-date/${dateStr}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message ||
        "Erreur lors de la récupération des rendez-vous du jour";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  }

  /**
   * Prochains rendez-vous confirmés (admin)
   */
  async getUpcomingRendezvous(limit = 10): Promise<RendezvousResponseDto[]> {
    try {
      const today = new Date();
      const dateStr = this.formatDate(today);
      const response = await apiFetch(
        `${this.baseUrl}/admin/rendezvous/all?status=CONFIRMED&startDate=${dateStr}&sortBy=date&sortOrder=asc&limit=${limit}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          "Erreur lors de la récupération des prochains rendez-vous";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      toast.error("Erreur lors de la récupération des prochains rendez-vous");
      throw error;
    }
  }

  /**
   * Recherche avancée avec filtres
   */
  async searchRendezvous(
    filters: RendezvousFilters,
    page = 1,
    limit = 10,
  ): Promise<PaginatedRendezvousResponseDto> {
    try {
      const params: RendezvousQueryDto = {
        page,
        limit,
      };

      if (filters.status) {
        params.status = Array.isArray(filters.status)
          ? filters.status[0]
          : filters.status;
      }

      if (filters.searchTerm) params.search = filters.searchTerm;
      if (filters.hasProcedure !== undefined)
        params.hasProcedure = filters.hasProcedure;
      if (filters.avisAdmin) {
        params.hasAvis = true;
      }

      if (filters.dateRange) {
        params.startDate = filters.dateRange.start;
        params.endDate = filters.dateRange.end;
      }

      // Construire l'URL avec les paramètres
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });

      const url = `${this.baseUrl}/admin/rendezvous/all${searchParams.toString() ? `?${searchParams}` : ""}`;
      const response = await apiFetch(url, { method: "GET" });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || "Erreur lors de la recherche des rendez-vous";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Appliquer les champs effectifs
      result.data = result.data.map((rdv: RendezvousResponseDto) =>
        this.calculateEffectiveFields(rdv),
      );

      return result;
    } catch (error) {
      toast.error("Erreur lors de la recherche des rendez-vous");
      throw error;
    }
  }

  /**
   * Export CSV des rendez-vous
   */
  async exportToCSV(filters?: RendezvousFilters): Promise<string> {
    const result = await this.searchRendezvous(filters || {}, 1, 1000);

    const headers = [
      "ID",
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Destination",
      "Niveau d'étude",
      "Filière",
      "Date",
      "Heure",
      "Statut",
      "Avis Admin",
      "Date création",
    ];

    const rows = result.data.map((rdv) => [
      rdv.id,
      rdv.firstName,
      rdv.lastName,
      rdv.email,
      rdv.telephone,
      rdv.effectiveDestination,
      rdv.effectiveNiveauEtude,
      rdv.effectiveFiliere,
      rdv.date,
      rdv.time,
      rdv.status,
      rdv.avisAdmin || "",
      new Date(rdv.createdAt).toLocaleDateString("fr-FR"),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  /**
   * Vérifie si un utilisateur peut prendre un rendez-vous
   */
  async canUserCreateRendezvous(
    email: string,
    date: Date | string,
  ): Promise<boolean> {
    try {
      const userRendezvous = await this.getRendezvousByEmail(email);
      const dateStr = this.formatDate(date);

      // Vérifier s'il a déjà un rendez-vous pour cette date
      const existingForDate = userRendezvous.some(
        (rdv) =>
          rdv.date === dateStr &&
          (rdv.status === "CONFIRMED" || rdv.status === "PENDING"),
      );

      return !existingForDate;
    } catch {
      return false;
    }
  }

  // ==================== MÉTHODES UTILITAIRES POUR VALEURS PERSONNALISÉES (PUBLIQUES) ====================

  /**
   * Vérifie si une valeur nécessite un champ "Autre"
   */
  static requiresAutreField(value: string): boolean {
    return value?.toLowerCase().trim() === "autre";
  }

  /**
   * Formate une valeur pour l'affichage (gère la logique "Autre")
   */
  static formatValue(mainValue: string, autreValue?: string | null): string {
    if (mainValue?.toLowerCase().trim() === "autre" && autreValue) {
      return autreValue.trim();
    }
    return mainValue?.trim() || "";
  }

  /**
   * Génère les options suggérées pour un champ
   */
  static getSuggestedOptions(
    type: "destination" | "niveauEtude" | "filiere",
  ): string[] {
    switch (type) {
      case "destination":
        return [
          "France",
          "Russie",
          "Chypre",
          "Chine",
          "Maroc",
          "Algérie",
          "Turquie",
          "Autre",
        ];
      case "niveauEtude":
        return [
          "Bac",
          "Bac+1",
          "Bac+2",
          "Licence",
          "Master I",
          "Master II",
          "Doctorat",
          "Autre",
        ];
      case "filiere":
        return [
          "Informatique",
          "Médecine",
          "Droit",
          "Commerce",
          "Ingénierie",
          "Architecture",
          "Autre",
        ];
      default:
        return [];
    }
  }

  /**
   * Valide une valeur personnalisée
   */
  static validateCustomValue(
    value: string,
    type: "destination" | "niveauEtude" | "filiere",
  ): { isValid: boolean; message?: string } {
    const trimmed = value?.trim() || "";

    if (trimmed.length < 2) {
      return { isValid: false, message: "Doit contenir au moins 2 caractères" };
    }

    if (trimmed.length > 100) {
      return { isValid: false, message: "Ne peut pas dépasser 100 caractères" };
    }

    // Validation spécifique par type
    switch (type) {
      case "destination":
        // Accepte lettres, espaces, tirets, apostrophes
        if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
          return { isValid: false, message: "Caractères non valides" };
        }
        break;
      case "niveauEtude":
        // Accepte lettres, chiffres, espaces, tirets, plus, apostrophes
        if (!/^[a-zA-Z0-9\s+\-']+$/.test(trimmed)) {
          return { isValid: false, message: "Caractères non valides" };
        }
        break;
      case "filiere":
        // Accepte lettres, espaces, tirets, apostrophes
        if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
          return { isValid: false, message: "Caractères non valides" };
        }
        break;
    }

    return { isValid: true };
  }
}

// ==================== EXPORT ====================

export const rendezvousService = new RendezvousService();
