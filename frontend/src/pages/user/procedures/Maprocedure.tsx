import React, { useState, useMemo } from "react";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Filter,
  Search,
  ChevronDown,
  Eye,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useUserProcedures } from "../../../hooks/useUserProcedures";
import { Helmet } from "react-helmet-async";
import { pageConfigs } from "../../../components/shared/user/UserHeader.config";
import type {
  ProcedureResponseDto,
  ProcedureStatus,
  StepResponseDto,
} from "../../../types/procedures.types";
import Loader from "../../../components/shared/user/Loader";

const Maprocedure = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    procedures,
    loading,
    selectedProcedure,
    selectProcedure,
    findByEmail,
    loadById,
  } = useUserProcedures();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Charger les procedures au montage et quand l'utilisateur change
  React.useEffect(() => {
    if (isAuthenticated && user) {
      findByEmail(user.email);
    }
  }, [isAuthenticated, user, findByEmail]);

  // Gérer la sélection d'une procédure
  const handleProcedureClick = async (procedure: ProcedureResponseDto) => {
    await loadById(procedure.id);
    setShowModal(true);
  };

  // Fermer le modal
  const handleCloseModal = () => {
    setShowModal(false);
    selectProcedure(null);
  };

  // Filtrer les procédures (logique combinée entre le hook et le composant)
  const filteredProcedures = useMemo(() => {
    let filtered = procedures || []; // Protection contre undefined

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (procedure) =>
          procedure.effectiveDestination
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          procedure.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          procedure.nom.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filtrer par statut
    if (statusFilter !== "tous") {
      filtered = filtered.filter(
        (procedure) => procedure.statut === statusFilter,
      );
    }

    return filtered;
  }, [procedures, searchTerm, statusFilter]);

  const getStatusColor = (status: ProcedureStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: ProcedureStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4" />;
      case "CANCELLED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: ProcedureStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return "En cours";
      case "COMPLETED":
        return "Terminée";
      case "REJECTED":
        return "Rejetée";
      case "CANCELLED":
        return "Annulée";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      <Helmet>
        <title>{pageConfigs["/mes-procedures"].pageTitle}</title>
        <meta
          name="description"
          content={pageConfigs["/mes-procedures"].description}
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Recherchercher par destination..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>Statut</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFilters && (
                  <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setStatusFilter("tous");
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          statusFilter === "tous"
                            ? "bg-sky-100 text-sky-700"
                            : ""
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("IN_PROGRESS");
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          statusFilter === "IN_PROGRESS"
                            ? "bg-sky-100 text-sky-700"
                            : ""
                        }`}
                      >
                        En cours
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("COMPLETED");
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          statusFilter === "COMPLETED"
                            ? "bg-sky-100 text-sky-700"
                            : ""
                        }`}
                      >
                        Terminées
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("REJECTED");
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          statusFilter === "REJECTED"
                            ? "bg-sky-100 text-sky-700"
                            : ""
                        }`}
                      >
                        Rejetées
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("CANCELLED");
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                          statusFilter === "CANCELLED"
                            ? "bg-sky-100 text-sky-700"
                            : ""
                        }`}
                      >
                        Annulées
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Procedures List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader loading={true} size="md" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProcedures.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune procédure trouvée
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== "tous"
                      ? `Aucune procédure ne correspond à vos critères de recherche.`
                      : `Vous n'avez pas encore de procédure.`}
                  </p>
                </div>
              ) : (
                filteredProcedures.map((procedure) => (
                  <div
                    key={procedure.id}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleProcedureClick(procedure)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Procédure pour {procedure.effectiveDestination}
                          </h3>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(procedure.statut)}`}
                          >
                            {getStatusIcon(procedure.statut)}
                            <span className="ml-1">
                              {getStatusLabel(procedure.statut)}
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Demande: {formatDate(procedure.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Progression: {procedure.progress}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>
                              Étapes: {procedure.completedSteps}/
                              {procedure.totalSteps}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>{procedure.statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="p-2 text-gray-600 hover:text-sky-600 transition-colors">
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Progression</span>
                        <span>
                          {procedure.completedSteps}/{procedure.totalSteps}{" "}
                          étapes
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${procedure.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedProcedure && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Procédure pour {selectedProcedure.effectiveDestination}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Status and Dates */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedProcedure.statut)}`}
                    >
                      {getStatusIcon(selectedProcedure.statut)}
                      <span className="ml-1">
                        {getStatusLabel(selectedProcedure.statut)}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Date de demande:</span>
                      <p className="font-medium">
                        {formatDate(selectedProcedure.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Niveau d'étude:</span>
                      <p className="font-medium">
                        {selectedProcedure.effectiveNiveauEtude}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Filière:</span>
                      <p className="font-medium">
                        {selectedProcedure.effectiveFiliere}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Progression:</span>
                      <p className="font-medium">
                        {selectedProcedure.progress}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Étapes de la procédure
                  </h3>
                  <div className="space-y-3">
                    {selectedProcedure.steps.map(
                      (step: StepResponseDto, index: number) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step.statut === "COMPLETED"
                                ? "bg-green-500 text-white"
                                : step.statut === "IN_PROGRESS"
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-300 text-gray-600"
                            }`}
                          >
                            {step.statut === "COMPLETED"
                              ? "✓"
                              : step.statut === "IN_PROGRESS"
                                ? "⟳"
                                : "○"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {step.nom}
                            </p>
                            <p className="text-sm text-gray-600">
                              Statut:{" "}
                              {step.statut.replace("_", " ").toLowerCase()}
                            </p>
                            <p className="text-sm text-gray-600">
                              Créée le: {formatDate(step.dateCreation)}
                            </p>
                            {step.dateMaj && (
                              <p className="text-sm text-gray-600">
                                Dernière mise à jour: {formatDate(step.dateMaj)}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            Étape {index + 1}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Maprocedure;
