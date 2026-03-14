// hooks/useProcedures.ts
// Hook React strict calqué sur ProceduresService + types procedure.types.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { ProceduresService } from "../services/procedures.service";
import type {
  ProcedureResponseDto,
  PaginatedProcedureResponseDto,
  ProcedureStatisticsDto,
  CreateProcedureDto,
  UpdateProcedureDto,
  UpdateStepDto,
  ProcedureQueryDto,
  ProcedureFilters,
  ProcedureLoadingState,
  ProcedurePagination,
  StepName,
} from "../types/procedures.types";

// ─── Types internes du hook ───────────────────────────────────────────────────

export interface UseProceduresOptions {
  autoLoad?: boolean;
  shouldLoadStatistics?: boolean; // nouvelle option
  initialQuery?: ProcedureQueryDto;
  refreshInterval?: number; // ms, default désactivé
}

export interface UseProceduresState {
  // Données
  procedures: ProcedureResponseDto[];
  selectedProcedure: ProcedureResponseDto | null;
  statistics: ProcedureStatisticsDto | null;
  overdue: ProcedureResponseDto[];
  // UI
  loading: ProcedureLoadingState;
  error: string | null;
  // Filtres & pagination
  query: ProcedureQueryDto;
  filters: ProcedureFilters;
  pagination: ProcedurePagination;
}

export interface UseProceduresActions {
  // Chargement
  loadProcedures: (q?: ProcedureQueryDto) => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadById: (id: string) => Promise<ProcedureResponseDto | null>;
  refresh: () => Promise<void>;

  // Navigation
  selectProcedure: (p: ProcedureResponseDto | null) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Filtres
  setQuery: (partial: Partial<ProcedureQueryDto>) => void;
  setFilters: (
    f: ProcedureFilters | ((prev: ProcedureFilters) => ProcedureFilters),
  ) => void;
  applyFilters: () => Promise<void>;
  resetFilters: () => void;

  // CRUD admin
  create: (data: CreateProcedureDto) => Promise<ProcedureResponseDto | null>;
  update: (
    id: string,
    data: UpdateProcedureDto,
  ) => Promise<ProcedureResponseDto | null>;
  updateStep: (
    id: string,
    stepName: StepName,
    data: UpdateStepDto,
  ) => Promise<ProcedureResponseDto | null>;
  addStep: (
    id: string,
    stepName: StepName,
  ) => Promise<ProcedureResponseDto | null>;
  remove: (id: string, reason?: string) => Promise<boolean>;

  // Lecture publique
  findByEmail: (email: string) => Promise<ProcedureResponseDto[]>;
  findByRendezvousId: (
    rendezVousId: string,
  ) => Promise<ProcedureResponseDto | null>;

  // Validation client
  validate: (data: Partial<CreateProcedureDto>) => Record<string, string>;
  isValid: (data: Partial<CreateProcedureDto>) => boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_QUERY: ProcedureQueryDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const DEFAULT_FILTERS: ProcedureFilters = {};

const DEFAULT_PAGINATION: ProcedurePagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const DEFAULT_LOADING: ProcedureLoadingState = {
  list: false,
  details: false,
  statistics: false,
  create: false,
  update: false,
  updateStep: false,
  delete: false,
  report: false,
  export: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProcedures(
  options: UseProceduresOptions = {},
): UseProceduresState & UseProceduresActions {
  const {
    autoLoad = true,
    shouldLoadStatistics = true, // par défaut pour admin
    initialQuery = {},
    refreshInterval,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────
  const [procedures, setProcedures] = useState<ProcedureResponseDto[]>([]);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureResponseDto | null>(null);
  const [statistics, setStatistics] = useState<ProcedureStatisticsDto | null>(
    null,
  );
  const [overdue, setOverdue] = useState<ProcedureResponseDto[]>([]);
  const [loading, setLoading] =
    useState<ProcedureLoadingState>(DEFAULT_LOADING);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryState] = useState<ProcedureQueryDto>({
    ...DEFAULT_QUERY,
    ...initialQuery,
  });
  const [filters, setFiltersState] =
    useState<ProcedureFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] =
    useState<ProcedurePagination>(DEFAULT_PAGINATION);

  // ── Ref pour éviter les race conditions ──────────────────────────────────
  const loadingRef = useRef(false);

  // ── Log dev ───────────────────────────────────────────────────────────────
  const log = useCallback((msg: string, data?: unknown) => {
    if (import.meta.env.DEV) console.log(`[useProcedures] ${msg}`, data ?? "");
  }, []);

  // ── Helpers état ─────────────────────────────────────────────────────────
  const setLoad = (k: keyof ProcedureLoadingState, v: boolean) =>
    setLoading((prev) => ({ ...prev, [k]: v }));

  const syncPagination = (res: PaginatedProcedureResponseDto) => {
    setPagination({
      total: res.total,
      page: res.page,
      limit: res.limit,
      totalPages: res.totalPages,
      hasNext: res.hasNext,
      hasPrevious: res.hasPrevious,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // loadProcedures
  // ─────────────────────────────────────────────────────────────────────────
  const loadProcedures = useCallback(
    async (override?: ProcedureQueryDto) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoad("list", true);
      setError(null);

      try {
        const merged = { ...query, ...override };
        log("loadProcedures", merged);
        const res = await ProceduresService.findAll(merged);
        setProcedures(res.data);
        syncPagination(res);
        log("loadProcedures OK", { count: res.data.length, total: res.total });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erreur lors du chargement";
        setError(msg);
        log("loadProcedures ERR", err);
      } finally {
        setLoad("list", false);
        loadingRef.current = false;
      }
    },
    [query, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // loadStatistics
  // ─────────────────────────────────────────────────────────────────────────
  const loadStatistics = useCallback(async () => {
    setLoad("statistics", true);
    try {
      log("loadStatistics");
      const stats = await ProceduresService.getStatistics();
      setStatistics(stats);
      log("loadStatistics OK", stats);
    } catch (err) {
      log("loadStatistics ERR", err);
    } finally {
      setLoad("statistics", false);
    }
  }, [log]);

  // ─────────────────────────────────────────────────────────────────────────
  // loadById
  // ─────────────────────────────────────────────────────────────────────────
  const loadById = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      setLoad("details", true);
      setError(null);
      try {
        log("loadById", { id });
        const procedure = await ProceduresService.findById(id);
        setSelectedProcedure(procedure);
        log("loadById OK", { id });
        return procedure;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erreur lors du chargement";
        setError(msg);
        log("loadById ERR", err);
        return null;
      } finally {
        setLoad("details", false);
      }
    },
    [log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // refresh — recharge liste + stats en parallèle
  // ─────────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([loadProcedures(), loadStatistics()]);
  }, [loadProcedures, loadStatistics]);

  // ─────────────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────────────
  const create = useCallback(
    async (data: CreateProcedureDto): Promise<ProcedureResponseDto | null> => {
      setLoad("create", true);
      setError(null);
      try {
        log("create", { rendezVousId: data.rendezVousId });
        const procedure = await ProceduresService.create(data);
        // Ajout optimiste en tête de liste
        setProcedures((prev) => [procedure, ...prev]);
        setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        // Rafraîchir les stats
        await loadStatistics();
        log("create OK", { id: procedure.id });
        return procedure;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erreur lors de la création";
        setError(msg);
        log("create ERR", err);
        return null;
      } finally {
        setLoad("create", false);
      }
    },
    [loadStatistics, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────────────
  const update = useCallback(
    async (
      id: string,
      data: UpdateProcedureDto,
    ): Promise<ProcedureResponseDto | null> => {
      // Sauvegarder pour rollback
      const original = procedures.find((p) => p.id === id) ?? null;

      setLoad("update", true);
      setError(null);
      try {
        log("update", { id });
        const updated = await ProceduresService.update(id, data);
        // Mettre à jour la liste
        setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        log("update OK", { id });
        return updated;
      } catch (err: unknown) {
        // Rollback
        if (original)
          setProcedures((prev) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        setError((err as Error).message ?? "Erreur lors de la mise à jour");
        log("update ERR", err);
        return null;
      } finally {
        setLoad("update", false);
      }
    },
    [procedures, selectedProcedure, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // updateStep
  // ─────────────────────────────────────────────────────────────────────────
  const updateStep = useCallback(
    async (
      id: string,
      stepName: StepName,
      data: UpdateStepDto,
    ): Promise<ProcedureResponseDto | null> => {
      const original = procedures.find((p) => p.id === id) ?? null;

      setLoad("updateStep", true);
      setError(null);
      try {
        log("updateStep", { id, stepName });
        const updated = await ProceduresService.updateStep(id, stepName, data);
        setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        log("updateStep OK", { id, stepName });
        return updated;
      } catch (err: unknown) {
        if (original)
          setProcedures((prev) =>
            prev.map((p) => (p.id === id ? original : p)),
          );
        setError(
          (err as Error).message ?? "Erreur lors de la mise à jour de l'étape",
        );
        log("updateStep ERR", err);
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [procedures, selectedProcedure, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // addStep
  // ─────────────────────────────────────────────────────────────────────────
  const addStep = useCallback(
    async (
      id: string,
      stepName: StepName,
    ): Promise<ProcedureResponseDto | null> => {
      setLoad("updateStep", true);
      setError(null);
      try {
        log("addStep", { id, stepName });
        const updated = await ProceduresService.addStep(id, stepName);
        setProcedures((prev) => prev.map((p) => (p.id === id ? updated : p)));
        if (selectedProcedure?.id === id) setSelectedProcedure(updated);
        log("addStep OK", { id, stepName });
        return updated;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'ajout de l'étape",
        );
        log("addStep ERR", err);
        return null;
      } finally {
        setLoad("updateStep", false);
      }
    },
    [selectedProcedure, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────────────────────────────────
  const remove = useCallback(
    async (id: string, reason?: string): Promise<boolean> => {
      const original = procedures.find((p) => p.id === id) ?? null;

      // Optimistic update
      setProcedures((prev) => prev.filter((p) => p.id !== id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      setLoad("delete", true);
      setError(null);
      try {
        log("remove", { id, reason });
        await ProceduresService.remove(id, reason);
        if (selectedProcedure?.id === id) setSelectedProcedure(null);
        await loadStatistics();
        log("remove OK", { id });
        return true;
      } catch (err: unknown) {
        // Rollback
        if (original) {
          setProcedures((prev) => [...prev, original]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression",
        );
        log("remove ERR", err);
        return false;
      } finally {
        setLoad("delete", false);
      }
    },
    [procedures, selectedProcedure, loadStatistics, log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // findByEmail
  // ─────────────────────────────────────────────────────────────────────────
  const findByEmail = useCallback(
    async (email: string): Promise<ProcedureResponseDto[]> => {
      try {
        log("findByEmail", { email });
        const list = await ProceduresService.findByEmail(email);
        log("findByEmail OK", { count: list.length });
        return list;
      } catch (err: unknown) {
        log("findByEmail ERR", err);
        return [];
      }
    },
    [log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // findByRendezvousId
  // ─────────────────────────────────────────────────────────────────────────
  const findByRendezvousId = useCallback(
    async (rendezVousId: string): Promise<ProcedureResponseDto | null> => {
      try {
        log("findByRendezvousId", { rendezVousId });
        const procedure =
          await ProceduresService.findByRendezvousId(rendezVousId);
        log("findByRendezvousId OK", { id: procedure?.id });
        return procedure;
      } catch (err: unknown) {
        log("findByRendezvousId ERR", err);
        return null;
      }
    },
    [log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Filtres
  // ─────────────────────────────────────────────────────────────────────────
  const setQuery = useCallback((partial: Partial<ProcedureQueryDto>) => {
    setQueryState((prev) => ({ ...prev, ...partial, page: 1 }));
  }, []);

  const applyFilters = useCallback(async () => {
    try {
      log("applyFilters", filters);
      const res = await ProceduresService.findWithFilters(filters);
      setProcedures(res.data);
      syncPagination(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du filtrage");
      log("applyFilters ERR", err);
    }
  }, [filters, log]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setQueryState({ ...DEFAULT_QUERY, ...initialQuery });
  }, [initialQuery]);

  const setPage = useCallback(
    (page: number) => setQueryState((prev) => ({ ...prev, page })),
    [],
  );
  const setLimit = useCallback(
    (limit: number) => setQueryState((prev) => ({ ...prev, limit, page: 1 })),
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Chargement initial
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoLoad) return;
    // Charger les procédures, et les statistiques seulement si demandé
    const promises = [loadProcedures()];
    if (shouldLoadStatistics) promises.push(loadStatistics());
    Promise.all(promises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProcedures, loadStatistics, shouldLoadStatistics]); // Added dependencies for proper hook behavior

  // ─────────────────────────────────────────────────────────────────────────
  // Rechargement quand query change (page, limit, filtres, tri)
  // ─────────────────────────────────────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadProcedures();
  }, [
    query.page,
    query.limit,
    query.status,
    query.search,
    query.sortBy,
    query.sortOrder,
    query.startDate,
    query.endDate,
    query.includeDeleted,
    query.destination,
    query.filiere,
    query.email,
    loadProcedures,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Rafraîchissement périodique des procédures en retard
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoLoad || !refreshInterval) return;
    const id = setInterval(async () => {
      log("refresh interval — chargement procédures en retard");
      const list = await ProceduresService.findOverdue();
      setOverdue(list);
    }, refreshInterval);
    return () => clearInterval(id);
  }, [autoLoad, refreshInterval, log]);

  // ─────────────────────────────────────────────────────────────────────────
  // Validation — délégué au service
  // ─────────────────────────────────────────────────────────────────────────
  const validate = useCallback(
    (data: Partial<CreateProcedureDto>) => ProceduresService.validate(data),
    [],
  );
  const isValid = useCallback(
    (data: Partial<CreateProcedureDto>) => ProceduresService.isValid(data),
    [],
  );

  return {
    // State
    procedures,
    selectedProcedure,
    statistics,
    overdue,
    loading,
    error,
    query,
    filters,
    pagination,

    // Actions chargement
    loadProcedures,
    loadStatistics,
    loadById,
    refresh,

    // Navigation
    selectProcedure: setSelectedProcedure,
    setPage,
    setLimit,

    // Filtres
    setQuery,
    setFilters: setFiltersState,
    applyFilters,
    resetFilters,

    // CRUD admin
    create,
    update,
    updateStep,
    addStep,
    remove,

    // Lecture publique
    findByEmail,
    findByRendezvousId,

    // Validation
    validate,
    isValid,
  };
}
