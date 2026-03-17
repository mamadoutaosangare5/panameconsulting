import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useProcedures } from "../../../hooks/useProcedures";
import { useAuth } from "../../../hooks/useAuth";
import Loader from "../../../components/shared/admin/Loader";
import ConfirmationModal from "../../../components/shared/admin/ConfirMationModal";
import type { ProcedureStatus } from "../../../types/procedures.types";
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
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import type { JSX } from "react/jsx-runtime";

const Procedures = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  // 🔥 UNIQUEMENT le hook useProcedures - toute la logique est dedans
  const {
    procedures,
    pagination,
    loading: { list: loading, delete: loadingDelete, statistics: loadingStats },
    statistics,
    error,
    query,
    remove,
    setQuery,
    resetFilters,
    refresh,
    setPage,
    setLimit,
  } = useProcedures({
    autoLoad: true,
    shouldLoadStatistics: isAdmin,
    refreshInterval: undefined,
  });

  // Utiliser directement les données du hook (déjà filtrées et paginées par le backend)
  const displayProcedures = procedures || [];

  // Obtenir les destinations uniques pour le filtre - utilise les statistiques du backend
  const destinations = useMemo(() => {
    // Utilise les statistiques du backend si disponibles
    if (statistics?.topDestinations) {
      return statistics.topDestinations.map((d) => d.destination).sort();
    }
    // Fallback sur les procédures chargées
    const dests = procedures
      .map((p) => p.effectiveDestination)
      .filter(Boolean);
    return [...new Set(dests)].sort();
  }, [statistics, procedures]);

  // Fonctions pour les badges - basées sur les enums des types
  const getStatusBadge = (status: ProcedureStatus) => {
    const styles: Record<ProcedureStatus, string> = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const icons: Record<ProcedureStatus, JSX.Element> = {
      PENDING: <AlertCircle className="w-4 h-4" />,
      IN_PROGRESS: <Clock className="w-4 h-4" />,
      COMPLETED: <CheckCircle className="w-4 h-4" />,
      REJECTED: <XCircle className="w-4 h-4" />,
      CANCELLED: <XCircle className="w-4 h-4" />,
    };

    const labels: Record<ProcedureStatus, string> = {
      PENDING: "En attente",
      IN_PROGRESS: "En cours",
      COMPLETED: "Terminé",
      REJECTED: "Rejeté",
      CANCELLED: "Annulé",
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

  // Obtenir le nombre de procédures par statut (directement depuis les statistiques du backend)
  const getStatusCount = (status: ProcedureStatus) => {
    return statistics?.byStatus?.[status] || 0;
  };

  // Handlers pour les filtres - délègue tout au hook
  const handleSearch = (term: string) => {
    setQuery({ search: term || undefined, page: 1 });
  };

  const handleStatusFilter = (status: string) => {
    setQuery({
      status: status === "tous" ? undefined : (status as ProcedureStatus),
      page: 1,
    });
  };

  const handleDestinationFilter = (destination: string) => {
    setQuery({
      destination: destination === "tous" ? undefined : destination,
      page: 1,
    });
  };

  const handleResetFilters = () => {
    resetFilters();
  };

  const handleRefresh = async () => {
    await refresh();
  };

  // Handlers pour la pagination - délègue au hook
  const handlePageChange = (pageNum: number) => {
    setPage(pageNum);
  };

  const handleLimitChange = (limit: number) => {
    setLimit(limit);
  };

  // Handlers pour les actions de navigation
  const handleViewDetails = (id: string) => {
    navigate(`/gestionnaire/procedures/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/gestionnaire/procedures/${id}/edit`);
  };

  // Handlers pour la suppression - utilise le hook
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
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Procédures
            </h1>
            <p className="text-gray-600">
              Gérez toutes les procédures d'immigration
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading || loadingStats}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading || loadingStats ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
            {(query.search || query.status || query.destination) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Effacer
              </button>
            )}
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Statistiques - depuis le hook */}
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

        {/* Filtres - utilisent les fonctions du hook */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, destination..."
                  value={query.search || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtre statut */}
            <div className="w-full lg:w-48">
              <select
                value={query.status || "tous"}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="tous">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="REJECTED">Rejeté</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            {/* Filtre destination */}
            <div className="w-full lg:w-48">
              <select
                value={query.destination || "tous"}
                onChange={(e) => handleDestinationFilter(e.target.value)}
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

        {/* Tableau - utilise les procédures du hook */}
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
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-red-500">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <p className="text-lg font-medium mb-2">
                          Erreur de chargement
                        </p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                          onClick={handleRefresh}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          Réessayer
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : displayProcedures.length === 0 ? (
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
                  displayProcedures.map((procedure) => (
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
                          {procedure.effectiveDestination}
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
                        <div className="text-sm text-gray-500">
                          {procedure.daysSinceCreation !== undefined
                            ? `Il y a ${procedure.daysSinceCreation} jour${procedure.daysSinceCreation > 1 ? "s" : ""}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${procedure.progress || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {procedure.progress || 0}%
                          </span>
                        </div>
                        {procedure.activeStep && (
                          <div className="text-xs text-gray-500 mt-1">
                            Étape active: {procedure.activeStep}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(procedure.id)}
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(procedure.id)}
                            className="p-1 text-gray-400 hover:text-sky-600 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            onClick={() => handleDelete(procedure.id)}
                            disabled={loadingDelete}
                            title="Supprimer"
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

        {/* Pagination - utilise la pagination du hook */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Affichage de {(pagination.page - 1) * pagination.limit + 1} à{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  sur {pagination.total} résultats
                </span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value={10}>10 par page</option>
                  <option value={25}>25 par page</option>
                  <option value={50}>50 par page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevious}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 border rounded-md text-sm ${
                            pageNum === pagination.page
                              ? "bg-sky-600 text-white border-sky-600"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
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