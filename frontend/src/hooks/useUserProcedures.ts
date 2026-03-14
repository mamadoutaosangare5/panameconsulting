// hooks/useUserProcedures.ts
// Hook React spécialisé pour les pages user - utilise uniquement les endpoints user

import { useState, useCallback } from "react";
import { ProceduresService } from "../services/procedures.service";
import type { ProcedureResponseDto } from "../types/procedures.types";

// ─── Types internes du hook ───────────────────────────────────────────────────

export interface UseUserProceduresState {
  // Données
  procedures: ProcedureResponseDto[];
  selectedProcedure: ProcedureResponseDto | null;
  // UI
  loading: boolean;
  error: string | null;
}

export interface UseUserProceduresActions {
  // Chargement
  loadById: (id: string) => Promise<ProcedureResponseDto | null>;
  refresh: () => Promise<void>;

  // Navigation
  selectProcedure: (p: ProcedureResponseDto | null) => void;

  // Lecture publique uniquement
  findByEmail: (email: string) => Promise<ProcedureResponseDto[]>;
  findByRendezvousId: (
    rendezVousId: string,
  ) => Promise<ProcedureResponseDto | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserProcedures(): UseUserProceduresState &
  UseUserProceduresActions {
  // ── State ─────────────────────────────────────────────────────────────────
  const [procedures, setProcedures] = useState<ProcedureResponseDto[]>([]);
  const [selectedProcedure, setSelectedProcedure] =
    useState<ProcedureResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Log dev ───────────────────────────────────────────────────────────────
  const log = useCallback((msg: string, data?: unknown) => {
    if (import.meta.env.DEV)
      console.log(`[useUserProcedures] ${msg}`, data ?? "");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // loadById
  // ─────────────────────────────────────────────────────────────────────────
  const loadById = useCallback(
    async (id: string): Promise<ProcedureResponseDto | null> => {
      setLoading(true);
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
        setLoading(false);
      }
    },
    [log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // refresh - recharge seulement les procédures (pas de stats)
  // ─────────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    // Pas de refresh automatique pour les pages user
    log("refresh - no auto refresh for user pages");
  }, [log]);

  // ─────────────────────────────────────────────────────────────────────────
  // findByEmail - méthode user publique
  // ─────────────────────────────────────────────────────────────────────────
  const findByEmail = useCallback(
    async (email: string): Promise<ProcedureResponseDto[]> => {
      try {
        log("findByEmail", { email });
        const list = await ProceduresService.findByEmail(email);
        setProcedures(list);
        log("findByEmail OK", { count: list.length });
        return list;
      } catch (err: unknown) {
        log("findByEmail ERR", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement",
        );
        return [];
      }
    },
    [log],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // findByRendezvousId - méthode user publique
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

  return {
    // State
    procedures,
    selectedProcedure,
    loading,
    error,

    // Actions chargement
    loadById,
    refresh,

    // Navigation
    selectProcedure: setSelectedProcedure,

    // Lecture publique uniquement
    findByEmail,
    findByRendezvousId,
  };
}
