import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useProcedures } from "../../../hooks/useProcedures";
import Loader from "../../../components/shared/admin/Loader";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import type {
  ProcedureResponseDto,
  ProcedureStatus,
} from "../../../types/procedures.types";
import {
  Search,
  Edit2,
  Trash2,
  Eye,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";

const Procedures = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [destinationFilter, setDestinationFilter] = useState<string>("tous");
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const {
    procedures,
    loading: { list: loading, delete: loadingDelete },
    statistics,
    remove,
  } = useProcedures({
    autoLoad: true,
    shouldLoadStatistics: true, // Admin charge les stats
    refreshInterval: undefined,
  });

  // Filtrer les procédures
  const filteredProcedures = useMemo(() => {
    let filtered = procedures || [];

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (procedure: ProcedureResponseDto) =>
          procedure.destination
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          procedure.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          procedure.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          procedure.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filtrer par statut
    if (statusFilter !== "tous") {
      filtered = filtered.filter(
        (procedure: ProcedureResponseDto) => procedure.statut === statusFilter,
      );
    }

    // Filtrer par destination
    if (destinationFilter !== "tous") {
      filtered = filtered.filter(
        (procedure: ProcedureResponseDto) =>
          procedure.destination === destinationFilter,
      );
    }

    return filtered;
  }, [procedures, searchTerm, statusFilter, destinationFilter]);

  // Obtenir les destinations uniques pour le filtre
  const destinations = useMemo(() => {
    const uniqueDestinations = [
      ...new Set(
        (procedures || []).map((p) => p.destination).filter(Boolean),
      ),
    ];
    return uniqueDestinations.sort();
  }, [procedures]);

  // Fonctions pour les badges
  const getStatusBadge = (status: ProcedureStatus) => {
    const styles = {
      IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
    };

    const icons = {
      IN_PROGRESS: <Clock className="w-4 h-4" />,
      COMPLETED: <CheckCircle className="w-4 h-4" />,
      CANCELLED: <XCircle className="w-4 h-4" />,
      PENDING: <AlertCircle className="w-4 h-4" />,
      REJECTED: <XCircle className="w-4 h-4" />,
    };

    const labels = {
      IN_PROGRESS: "En cours",
      COMPLETED: "Terminé",
      CANCELLED: "Annulé",
      PENDING: "En attente",
      REJECTED: "Rejeté",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  // Obtenir le nombre de procédures par statut (utiliser les statistiques du backend)
  const getStatusCount = (status: ProcedureStatus) => {
    return statistics?.byStatus?.[status] || 0;
  };

  // Calculer la progression d'une procédure
  const getProcedureProgress = (procedure: ProcedureResponseDto) => {
    // Si la procédure a des étapes, calculer la progression basée sur les étapes complétées
    if (procedure.steps && procedure.steps.length > 0) {
      const completedSteps = procedure.steps.filter(
        (step) => step.statut === "COMPLETED"
      ).length;
      return Math.round((completedSteps / procedure.steps.length) * 100);
    }
    
    // Sinon, baser la progression sur le statut
    switch (procedure.statut) {
      case "COMPLETED":
        return 100;
      case "IN_PROGRESS":
        return 50;
      case "PENDING":
        return 10;
      case "CANCELLED":
      case "REJECTED":
        return 0;
      default:
        return 0;
    }
  };

  // Handlers pour la suppression
  const handleDelete = (id: string) => {
    setConfirmModal({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    if (confirmModal.id) {
      await remove(confirmModal.id, "Suppression par l'administrateur");
    }
    setConfirmModal({ open: false, id: null });
  };

  const handleCancelDelete = () => {
    setConfirmModal({ open: false, id: null });
  };

  return (
    <>
      <Helmet>
        <title>Gestion Des Procédures - Paname Consulting</title>
        <meta
          name="description"
          content="Gestion des procédures d'immigration"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Procédures</h1>
          <p className="text-gray-600">
            Gérez toutes les procédures d'immigration
          </p>
        </div>

        {/* Statistiques */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {getStatusCount("IN_PROGRESS")}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Terminées</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getStatusCount("COMPLETED")}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {getStatusCount("PENDING")}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtre statut */}
            <div className="w-full lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="tous">Tous les statuts</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="PENDING">En attente</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            {/* Filtre destination */}
            <div className="w-full lg:w-48">
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="tous">Toutes les destinations</option>
                {destinations.map((dest) => (
                  <option key={dest} value={dest}>
                    {dest}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de début
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progression
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader loading={true} size="md" />
                    </td>
                  </tr>
                ) : filteredProcedures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">
                          Aucune procédure trouvée
                        </p>
                        <p className="text-sm">
                          Essayez de modifier vos filtres de recherche
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProcedures.map((procedure) => (
                    <tr key={procedure.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {procedure.prenom} {procedure.nom}
                          </div>
                          <div className="text-sm text-gray-500">
                            {procedure.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900">
                          {procedure.destination}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(procedure.statut)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900">
                          {procedure.createdAt
                            ? new Date(procedure.createdAt).toLocaleDateString(
                                "fr-FR",
                              )
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getProcedureProgress(procedure)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {getProcedureProgress(procedure)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-gray-400 hover:text-sky-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-sky-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            onClick={() => handleDelete(procedure.id)}
                            disabled={loadingDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        title="Supprimer la procédure"
        content="Êtes-vous sûr de vouloir supprimer cette procédure définitivement ? Cette action est irréversible."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        open={confirmModal.open}
      />
    </>
  );
};

export default Procedures;
