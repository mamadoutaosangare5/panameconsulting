// ============================================================
// useRendezvous.ts
// Version COMPLÈTE alignée sur le backend Prisma
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { rendezvousService } from "../services/rendezvous.service";
import { useAuth } from "./useAuth";
import { toast } from "react-hot-toast";
import { apiFetch } from "../context/AuthContext";
import { API_URL } from "../context/AuthContext";
import type {
  TimeSlot,

  // DTOs
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  CompleteRendezvousDto,
  RendezvousQueryDto,
  RendezvousResponseDto,
  RendezvousStatisticsDto,
  AvailableSlotsDto,
  AvailabilityCheckDto,
  AvailableDatesResponseDto,
  RendezvousFilters,
} from "../types/rendezvous.types";

// ==================== TYPES DU HOOK ====================

interface UseRendezvousOptions {
  /** Charge automatiquement les données au montage */
  autoLoad?: boolean;
  /** Paramètres initiaux pour la liste paginée */
  initialParams?: RendezvousQueryDto;
  /** Date de début pour les dates disponibles */
  initialStartDate?: string;
  /** Date de fin pour les dates disponibles */
  initialEndDate?: string;
  /** Rafraîchissement automatique (en ms) */
  refreshInterval?: number;
}

interface LoadingState {
  list: boolean;
  details: boolean;
  statistics: boolean;
  create: boolean;
  update: boolean;
  cancel: boolean;
  complete: boolean;
  delete: boolean;
  availability: boolean;
  slots: boolean;
  dates: boolean;
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface UseRendezvousReturn {
  // ── État ──────────────────────────────────────────────────────────────────
  /** Liste des rendez-vous (paginnée) */
  rendezvous: RendezvousResponseDto[];
  /** Rendez-vous sélectionné (détail) */
  selectedRendezvous: RendezvousResponseDto | null;
  /** Statistiques des rendez-vous (admin) */
  statistics: RendezvousStatisticsDto | null;
  /** Créneaux disponibles par date */
  availableSlots: AvailableSlotsDto[];
  /** Dates disponibles */
  availableDates: AvailableDatesResponseDto[];
  /** État de la pagination */
  pagination: PaginationState;
  /** États de chargement */
  loading: LoadingState;
  /** Erreur éventuelle */
  error: string | null;
  /** Filtres actifs */
  filters: RendezvousFilters;

  // ── Actions utilisateur ────────────────────────────────────────────────────
  /** Crée un nouveau rendez-vous */
  createRendezvous: (
    data: CreateRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  /** Récupère les rendez-vous d'un utilisateur par email */
  getRendezvousByEmail: (email: string) => Promise<RendezvousResponseDto[]>;
  /** Annule un rendez-vous */
  cancelRendezvous: (
    id: string,
    data: CancelRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  /** Vérifie la disponibilité d'un créneau */
  checkAvailability: (
    date: string,
    time: TimeSlot,
  ) => Promise<AvailabilityCheckDto | null>;

  // ── Actions admin ──────────────────────────────────────────────────────────
  /** Charge la liste paginée des rendez-vous */
  loadRendezvous: (params?: RendezvousQueryDto) => Promise<void>;
  /** Charge un rendez-vous par son ID */
  loadRendezvousById: (id: string) => Promise<void>;
  /** Charge les statistiques */
  loadStatistics: () => Promise<void>;
  /** Charge les dates disponibles */
  loadAvailableDates: (startDate?: string, endDate?: string) => Promise<void>;
  /** Récupère les dates disponibles (sans modifier l'état) */
  getAvailableDates: (
    startDate?: string,
    endDate?: string,
  ) => Promise<AvailableDatesResponseDto[]>;
  /** Récupère les créneaux pour une date */
  getAvailableSlots: (date: string) => Promise<AvailableSlotsDto>;
  /** Récupère la liste des créneaux (version simplifiée) */
  getAvailableSlotsList: (date: string) => Promise<TimeSlot[]>;
  /** Met à jour un rendez-vous */
  updateRendezvous: (
    id: string,
    data: UpdateRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  /** Marque un rendez-vous comme terminé */
  completeRendezvous: (
    id: string,
    data: CompleteRendezvousDto,
  ) => Promise<RendezvousResponseDto | null>;
  /** Supprime un rendez-vous (soft delete) */
  deleteRendezvous: (id: string) => Promise<boolean>;
  /** Récupère les rendez-vous par date */
  getRendezvousByDate: (date: string) => Promise<RendezvousResponseDto[]>;
  /** Rafraîchit les rendez-vous du jour */
  refreshTodayRendezvous: () => Promise<void>;
  /** Récupère les prochains rendez-vous confirmés */
  getUpcomingRendezvous: (limit?: number) => Promise<RendezvousResponseDto[]>;
  /** Export CSV des rendez-vous */
  exportRendezvous: (filters?: RendezvousFilters) => Promise<string>;

  // ── Utilitaires ────────────────────────────────────────────────────────────
  /** Efface le rendez-vous sélectionné */
  clearSelectedRendezvous: () => void;
  /** Met à jour les paramètres de requête */
  setQueryParams: (params: Partial<RendezvousQueryDto>) => void;
  /** Met à jour les filtres */
  setFilters: (filters: RendezvousFilters) => void;
  /** Réinitialise les filtres */
  resetFilters: () => void;
  /** Passe à la page suivante */
  nextPage: () => void;
  /** Passe à la page précédente */
  previousPage: () => void;
  /** Va à une page spécifique */
  goToPage: (page: number) => void;
  /** Change la limite par page */
  setLimit: (limit: number) => void;
}

// ==================== HOOK ====================

export const useRendezvous = (
  options: UseRendezvousOptions = {},
): UseRendezvousReturn => {
  const {
    autoLoad = true,
    initialParams = {},
    initialStartDate,
    initialEndDate,
    refreshInterval,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Refs pour éviter les dépendances circulaires
  const initialParamsRef = useRef(initialParams);
  const initialStartDateRef = useRef(initialStartDate);
  const initialEndDateRef = useRef(initialEndDate);

  // ── État ──────────────────────────────────────────────────────────────────

  const [rendezvous, setRendezvous] = useState<RendezvousResponseDto[]>([]);
  const [selectedRendezvous, setSelectedRendezvous] =
    useState<RendezvousResponseDto | null>(null);
  const [statistics, setStatistics] = useState<RendezvousStatisticsDto | null>(
    null,
  );
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotsDto[]>([]);
  const [availableDates, setAvailableDates] = useState<
    AvailableDatesResponseDto[]
  >([]);
  const [filters, setFiltersState] = useState<RendezvousFilters>({});
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [loading, setLoading] = useState<LoadingState>({
    list: false,
    details: false,
    statistics: false,
    create: false,
    update: false,
    cancel: false,
    complete: false,
    delete: false,
    availability: false,
    slots: false,
    dates: false,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setLoadingKey = (key: keyof LoadingState, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  const handleError = (err: unknown, defaultMessage: string): string => {
    const message = err instanceof Error ? err.message : defaultMessage;
    setError(message);
    toast.error(message);
    return message;
  };

  // ── Log dev (désactivé pour éviter les logs de données) ─────────────────────────────
  // ── Actions admin ──────────────────────────────────────────────────────────

  /**
   * Charge la liste paginée des rendez-vous
   */
  const loadRendezvous = useCallback(
    async (params: RendezvousQueryDto = {}) => {
      if (!isAdmin) {
        console.warn(
          "[useRendezvous] Tentative d'accès admin par utilisateur non-admin",
        );
        return;
      }

      setLoadingKey("list", true);
      setError(null);

      try {
        const mergedParams = { ...initialParamsRef.current, ...params };
        const res = await rendezvousService.searchRendezvous(mergedParams);

        setRendezvous(res.data);
        setPagination({
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
          hasNext: res.hasNext,
          hasPrevious: res.hasPrevious,
        });

        // Log de succès sans données sensibles
        console.log(
          `[useRendezvous] ✅ ${res.data.length} rendez-vous chargés (page ${res.page}/${res.totalPages})`,
        );
      } catch (err) {
        handleError(err, "Erreur lors du chargement des rendez-vous");
      } finally {
        setLoadingKey("list", false);
      }
    },
    [isAdmin],
  );

  /**
   * Charge un rendez-vous par son ID
   */
  const loadRendezvousById = useCallback(async (id: string) => {
    setLoadingKey("details", true);
    setError(null);

    try {
      const data = await rendezvousService.getRendezvousById(id);
      setSelectedRendezvous(data);
      // Log de succès sans données sensibles
      console.log(`[useRendezvous] ✅ Rendez-vous ${id} chargé`);
    } catch (err) {
      handleError(err, "Rendez-vous introuvable");
    } finally {
      setLoadingKey("details", false);
    }
  }, []);

  /**
   * Charge les statistiques des rendez-vous
   */
  const loadStatistics = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingKey("statistics", true);

    try {
      const stats = await rendezvousService.getStatistics();
      setStatistics(stats);
      // Log de succès sans données sensibles
      console.log("[useRendezvous] ✅ Statistiques chargées");
    } catch (err) {
      console.error("[useRendezvous] Erreur chargement statistiques:", err);
    } finally {
      setLoadingKey("statistics", false);
    }
  }, [isAdmin]);

  /**
   * Charge les dates disponibles
   */
  const loadAvailableDates = useCallback(
    async (startDate?: string, endDate?: string) => {
      setLoadingKey("dates", true);

      try {
        const dates = await rendezvousService.getAvailableDates(
          startDate,
          endDate,
        );
        setAvailableDates(dates);
        // Log de succès sans données sensibles
        console.log(
          `[useRendezvous] ✅ ${dates.length} dates disponibles chargées`,
        );
      } catch (err) {
        console.error("[useRendezvous] Erreur chargement dates:", err);
        setAvailableDates([]);
      } finally {
        setLoadingKey("dates", false);
      }
    },
    [],
  );

  /**
   * Récupère les dates disponibles (sans modifier l'état)
   */
  const getAvailableDates = useCallback(
    async (
      startDate?: string,
      endDate?: string,
    ): Promise<AvailableDatesResponseDto[]> => {
      try {
        return await rendezvousService.getAvailableDates(startDate, endDate);
      } catch (err) {
        console.error("[useRendezvous] Erreur récupération dates:", err);
        throw err;
      }
    },
    [],
  );

  /**
   * Récupère les créneaux disponibles pour une date
   */
  const getAvailableSlots = useCallback(
    async (date: string): Promise<AvailableSlotsDto> => {
      setLoadingKey("slots", true);

      try {
        const slots = await rendezvousService.getAvailableSlots(date);

        // Mettre à jour l'état availableSlots
        setAvailableSlots((prev) => {
          const exists = prev.some((s) => s.date === slots.date);
          if (exists) {
            return prev.map((s) => (s.date === slots.date ? slots : s));
          }
          return [...prev, slots];
        });

        // Log de succès sans données sensibles
        console.log(
          `[useRendezvous] ✅ ${slots.availableSlots.length} créneaux pour ${date}`,
        );
        return slots;
      } catch (err) {
        console.error(
          `[useRendezvous] Erreur chargement créneaux pour ${date}:`,
          err,
        );

        const defaultSlots: AvailableSlotsDto = {
          date: new Date().toISOString(),
          available: false,
          availableSlots: [],
          totalSlots: 16,
          occupiedSlots: 0,
        };
        return defaultSlots;
      } finally {
        setLoadingKey("slots", false);
      }
    },
    [],
  );

  /**
   * Version simplifiée - retourne seulement la liste des créneaux
   */
  const getAvailableSlotsList = useCallback(
    async (date: string): Promise<TimeSlot[]> => {
      try {
        const slots = await getAvailableSlots(date);
        return slots.availableSlots;
      } catch {
        return [];
      }
    },
    [getAvailableSlots],
  );

  /**
   * Met à jour un rendez-vous
   */
  const updateRendezvous = useCallback(
    async (
      id: string,
      data: UpdateRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAdmin) {
        toast.error("Action réservée aux administrateurs");
        return null;
      }

      setLoadingKey("update", true);

      try {
        const updated = await rendezvousService.updateRendezvous(id, data);

        // Mettre à jour la liste
        setRendezvous((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );

        // Mettre à jour le rendez-vous sélectionné si c'est le même
        if (selectedRendezvous?.id === updated.id) {
          setSelectedRendezvous(updated);
        }

        toast.success("Rendez-vous mis à jour avec succès");
       

        return updated;
      } catch (err) {
        handleError(err, "Erreur lors de la mise à jour");
        return null;
      } finally {
        setLoadingKey("update", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  /**
   * Récupère les rendez-vous par date
   */
  const getRendezvousByDate = useCallback(
    async (date: string): Promise<RendezvousResponseDto[]> => {
      if (!isAdmin) return [];

      try {
        // Créer une instance temporaire du service pour appeler l'endpoint par date
        const response = await apiFetch(
          `${API_URL}/rendezvous/by-date/${date}`,
          {
            method: "GET",
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.message ||
            "Erreur lors de la récupération des rendez-vous";
          toast.error(errorMessage);
          return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error(
          `[useRendezvous] Erreur chargement rendez-vous pour ${date}:`,
          err,
        );
        return [];
      }
    },
    [isAdmin],
  );

  /**
   * Marque un rendez-vous comme terminé
   */
  const completeRendezvous = useCallback(
    async (
      id: string,
      data: CompleteRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAdmin) {
        toast.error("Action réservée aux administrateurs");
        return null;
      }

      setLoadingKey("complete", true);

      try {
        const completed = await rendezvousService.completeRendezvous(id, data);

        // Mettre à jour la liste
        setRendezvous((prev) =>
          prev.map((r) => (r.id === completed.id ? completed : r)),
        );

        // Mettre à jour le rendez-vous sélectionné si c'est le même
        if (selectedRendezvous?.id === completed.id) {
          setSelectedRendezvous(completed);
        }

        const avisMsg =
          data.avisAdmin === "FAVORABLE" ? "favorable" : "défavorable";
        toast.success(`Rendez-vous terminé avec avis ${avisMsg}`);
        

        return completed;
      } catch (err) {
        handleError(err, "Erreur lors de la validation");
        return null;
      } finally {
        setLoadingKey("complete", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  /**
   * Supprime un rendez-vous (soft delete)
   */
  const deleteRendezvous = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAdmin) {
        toast.error("Action réservée aux administrateurs");
        return false;
      }

      setLoadingKey("delete", true);

      try {
        await rendezvousService.deleteRendezvous(id);

        // Retirer de la liste
        setRendezvous((prev) => prev.filter((r) => r.id !== id));

        // Effacer le rendez-vous sélectionné si c'est le même
        if (selectedRendezvous?.id === id) {
          setSelectedRendezvous(null);
        }

        toast.success("Rendez-vous supprimé avec succès");
        

        return true;
      } catch (err) {
        handleError(err, "Erreur lors de la suppression");
        return false;
      } finally {
        setLoadingKey("delete", false);
      }
    },
    [isAdmin, selectedRendezvous],
  );

  /**
   * Rafraîchit les rendez-vous du jour
   */
  const refreshTodayRendezvous = useCallback(async () => {
    if (!isAdmin) return;

    const today = new Date().toISOString().split("T")[0];
    const todayRdv = await getRendezvousByDate(today);

    // Mettre à jour la liste en conservant les autres dates
    setRendezvous((prev) => [
      ...prev.filter((r) => r.date !== today),
      ...todayRdv,
    ]);

    
  }, [isAdmin, getRendezvousByDate]);

  /**
   * Récupère les prochains rendez-vous confirmés
   */
  const getUpcomingRendezvous = useCallback(
    async (limit = 10): Promise<RendezvousResponseDto[]> => {
      if (!isAdmin) return [];

      try {
        const upcoming = await rendezvousService.getUpcomingRendezvous(limit);
        
        return upcoming;
      } catch (err) {
        console.error(
          "[useRendezvous] Erreur chargement prochains rendez-vous:",
          err,
        );
        return [];
      }
    },
    [isAdmin],
  );

  /**
   * Export CSV des rendez-vous
   */
  const exportRendezvous = useCallback(
    async (filters?: RendezvousFilters): Promise<string> => {
      if (!isAdmin) {
        toast.error("Action réservée aux administrateurs");
        return "";
      }

      try {
        const csv = await rendezvousService.exportToCSV(filters);
        toast.success("Export CSV réussi");
        
        return csv;
      } catch (err) {
        handleError(err, "Erreur lors de l'export CSV");
        return "";
      }
    },
    [isAdmin],
  );

  // ── Actions utilisateur ────────────────────────────────────────────────────

  /**
   * Crée un nouveau rendez-vous
   */
  const createRendezvous = useCallback(
    async (
      data: CreateRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAuthenticated) {
        toast.error("Vous devez être connecté pour prendre un rendez-vous");
        return null;
      }

      setLoadingKey("create", true);

      try {
        const newRdv = await rendezvousService.createRendezvous(data);
        toast.success("Rendez-vous confirmé avec succès !");
        
        return newRdv;
      } catch (err) {
        handleError(err, "Erreur lors de la création du rendez-vous");
        return null;
      } finally {
        setLoadingKey("create", false);
      }
    },
    [isAuthenticated],
  );

  /**
   * Récupère les rendez-vous d'un utilisateur par email
   */
  const getRendezvousByEmail = useCallback(
    async (email: string): Promise<RendezvousResponseDto[]> => {
      if (!isAuthenticated) return [];

      try {
        const data = await rendezvousService.getRendezvousByEmail(email);
        // Mettre à jour l'état local
        setRendezvous(data);
        return data;
      } catch (err) {
        console.error(
          `[useRendezvous] Erreur chargement rendez-vous pour ${email}:`,
          err,
        );
        // Afficher seulement l'erreur, pas le succès
        toast.error("Erreur lors du chargement de vos rendez-vous");
        return [];
      }
    },
    [isAuthenticated],
  );

  /**
   * Annule un rendez-vous
   */
  const cancelRendezvous = useCallback(
    async (
      id: string,
      data: CancelRendezvousDto,
    ): Promise<RendezvousResponseDto | null> => {
      if (!isAuthenticated) {
        toast.error("Vous devez être connecté");
        return null;
      }

      setLoadingKey("cancel", true);

      try {
        const updated = await rendezvousService.cancelRendezvous(id, data);

        // Mettre à jour la liste
        setRendezvous((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );

        // Mettre à jour le rendez-vous sélectionné si c'est le même
        if (selectedRendezvous?.id === updated.id) {
          setSelectedRendezvous(updated);
        }

        toast.success("Rendez-vous annulé avec succès");

        return updated;
      } catch (err) {
        handleError(err, "Erreur lors de l'annulation");
        return null;
      } finally {
        setLoadingKey("cancel", false);
      }
    },
    [isAuthenticated, selectedRendezvous],
  );

  /**
   * Vérifie la disponibilité d'un créneau
   */
  const checkAvailability = useCallback(
    async (
      date: string,
      time: TimeSlot,
    ): Promise<AvailabilityCheckDto | null> => {
      setLoadingKey("availability", true);

      try {
        const result = await rendezvousService.checkAvailability(date, time);
        return result;
      } catch (err) {
        console.error(
          "[useRendezvous] Erreur vérification disponibilité:",
          err,
        );
        return null;
      } finally {
        setLoadingKey("availability", false);
      }
    },
    [],
  );

  // ── Utilitaires de pagination ──────────────────────────────────────────────

  /**
   * Met à jour les paramètres de requête
   */
  const setQueryParams = useCallback(
    (params: Partial<RendezvousQueryDto>) => {
      loadRendezvous({ ...initialParamsRef.current, ...params });
    },
    [loadRendezvous],
  );

  /**
   * Met à jour les filtres
   */
  const setFilters = useCallback(
    (newFilters: RendezvousFilters) => {
      setFiltersState(newFilters);

      // Appliquer les filtres via searchRendezvous
      rendezvousService
        .searchRendezvous(newFilters, 1, pagination.limit)
        .then((res) => {
          setRendezvous(res.data);
          setPagination({
            total: res.total,
            page: res.page,
            limit: res.limit,
            totalPages: res.totalPages,
            hasNext: res.hasNext,
            hasPrevious: res.hasPrevious,
          });
        });
    },
    [pagination.limit],
  );

  /**
   * Réinitialise les filtres
   */
  const resetFilters = useCallback(() => {
    setFiltersState({});
    loadRendezvous(initialParamsRef.current);
  }, [loadRendezvous]);

  /**
   * Passe à la page suivante
   */
  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      loadRendezvous({
        ...initialParamsRef.current,
        page: pagination.page + 1,
      });
    }
  }, [pagination.hasNext, pagination.page, loadRendezvous]);

  /**
   * Passe à la page précédente
   */
  const previousPage = useCallback(() => {
    if (pagination.hasPrevious) {
      loadRendezvous({
        ...initialParamsRef.current,
        page: pagination.page - 1,
      });
    }
  }, [pagination.hasPrevious, pagination.page, loadRendezvous]);

  /**
   * Va à une page spécifique
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        loadRendezvous({ ...initialParamsRef.current, page });
      }
    },
    [pagination.totalPages, loadRendezvous],
  );

  /**
   * Change la limite par page
   */
  const setLimit = useCallback(
    (limit: number) => {
      loadRendezvous({ ...initialParamsRef.current, limit, page: 1 });
    },
    [loadRendezvous],
  );

  /**
   * Efface le rendez-vous sélectionné
   */
  const clearSelectedRendezvous = useCallback(() => {
    setSelectedRendezvous(null);
  }, []);

  // ==================== EFFETS ====================

  // Chargement initial
  useEffect(() => {
    if (!autoLoad || !isAuthenticated) return;

    if (isAdmin) {
      loadRendezvous(initialParamsRef.current);
      loadStatistics();
    }

    loadAvailableDates(initialStartDateRef.current, initialEndDateRef.current);
  }, [
    autoLoad,
    isAuthenticated,
    isAdmin,
    loadRendezvous,
    loadStatistics,
    loadAvailableDates,
  ]);

  // Rafraîchissement automatique (pour admin)
  useEffect(() => {
    if (!refreshInterval || !isAdmin) return;

    const intervalId = setInterval(() => {
      refreshTodayRendezvous();
      if (statistics) loadStatistics();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [
    refreshInterval,
    isAdmin,
    refreshTodayRendezvous,
    loadStatistics,
    statistics,
  ]);

  // ==================== RETOUR ====================

  return {
    // État
    rendezvous,
    selectedRendezvous,
    statistics,
    availableSlots,
    availableDates,
    pagination,
    loading,
    error,
    filters,

    // Actions utilisateur
    createRendezvous,
    getRendezvousByEmail,
    cancelRendezvous,
    checkAvailability,

    // Actions admin
    loadRendezvous,
    loadRendezvousById,
    loadStatistics,
    loadAvailableDates,
    getAvailableDates,
    getAvailableSlots,
    getAvailableSlotsList,
    updateRendezvous,
    completeRendezvous,
    deleteRendezvous,
    getRendezvousByDate,
    refreshTodayRendezvous,
    getUpcomingRendezvous,
    exportRendezvous,

    // Utilitaires
    clearSelectedRendezvous,
    setQueryParams,
    setFilters,
    resetFilters,
    nextPage,
    previousPage,
    goToPage,
    setLimit,
  };
};
