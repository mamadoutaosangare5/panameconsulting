import React, { useState, useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts";
import AOS from "aos";
import "aos/dist/aos.css";

interface Destination {
  id: number;
  name: string;
  status: "En cours" | "Achevée" | "Annulée";
  procedure: string;
  lastUpdate: string;
  country: string;
}

const Admindashboard: React.FC = () => {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
    document.title = "Tableau de Bord Admin";
  }, []);

  const initialData: Destination[] = [
    {
      id: 1,
      name: "Laurent Dupont",
      status: "En cours",
      procedure: "Visa étudiant",
      lastUpdate: "2025-03-12",
      country: "Angleterre",
    },
    {
      id: 2,
      name: "Sophie Martin",
      status: "Achevée",
      procedure: "Visa étudiant",
      lastUpdate: "2025-03-11",
      country: "France",
    },
    {
      id: 3,
      name: "Jean Castex",
      status: "Annulée",
      procedure: "Stage",
      lastUpdate: "2025-03-10",
      country: "Canada",
    },
  ];

  const [destinations, setDestinations] = useState<Destination[]>(initialData);
  const [countries, setCountries] = useState([
    "Angleterre",
    "France",
    "Turquie",
    "Maroc",
    "Canada",
  ]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);
  const [newDestination, setNewDestination] = useState({
    name: "",
    procedure: "",
    status: "En cours" as const,
    country: "",
  });
  const [newCountry, setNewCountry] = useState("");
  const [notification, setNotification] = useState("");

  // Gestion du graphique
  const chartRef = useRef<HTMLDivElement>(null);
  const chartOptions = useCallback(
    () => ({
      title: { text: "Répartition par Ville", left: "center" },
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: "60%",
          data: [
            { value: 35, name: "Paris" },
            { value: 25, name: "Casablanca" },
            { value: 20, name: "Alger" },
          ],
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" },
          },
        },
      ],
    }),
    [],
  );

  useEffect(() => {
    const chart = chartRef.current && echarts.init(chartRef.current);
    chart?.setOption(chartOptions());
    return () => chart?.dispose();
  }, [chartOptions]);

  // Gestion des pays
  const handleAddCountry = () => {
    if (!newCountry) return;
    if (countries.includes(newCountry)) {
      showNotify("Ce pays existe déjà !");
      return;
    }
    setCountries([...countries, newCountry]);
    setNewCountry("");
    showNotify("Pays ajouté avec succès !");
  };

  const handleRemoveCountry = (country: string) => {
    setCountries(countries.filter((c) => c !== country));
    showNotify("Pays supprimé !");
  };

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Gestion des utilisateurs (Ajout / Modification)
  const handleFormSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];

    if (isEdit && editingDestination) {
      setDestinations(
        destinations.map((d) =>
          d.id === editingDestination.id
            ? { ...editingDestination, lastUpdate: today }
            : d,
        ),
      );
      setShowEditModal(false);
      showNotify("Utilisateur mis à jour !");
    } else {
      const destination: Destination = {
        ...newDestination,
        id: Math.max(...destinations.map((d) => d.id), 0) + 1,
        lastUpdate: today,
      };
      setDestinations([...destinations, destination]);
      setShowModal(false);
      setNewDestination({
        name: "",
        procedure: "",
        status: "En cours",
        country: countries[0] || "",
      });
      showNotify("Utilisateur ajouté !");
    }
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm("Supprimer cet utilisateur ?")) {
      setDestinations(destinations.filter((d) => d.id !== id));
      showNotify("Utilisateur supprimé !");
    }
  };

  const filteredDestinations = useCallback(
    () =>
      destinations.filter(
        (d) =>
          (d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.procedure.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedStatus === "all" || d.status === selectedStatus) &&
          (selectedCountry === "all" || d.country === selectedCountry),
      ),
    [destinations, searchTerm, selectedStatus, selectedCountry],
  );

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Sidebar */}
      <div
        className="w-64 bg-gradient-to-b from-sky-600 to-sky-700 shadow-lg fixed h-full z-10"
        data-aos="fade-right"
      >
        <div className="bg-white p-6 border-b border-sky-100">
          <h2 className="text-2xl font-bold text-sky-600 flex items-center">
            <i className="fas fa-user-shield mr-3"></i>
            Admin
          </h2>
          <button
            onClick={() => setShowCountryModal(true)}
            className="mt-6 w-full bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm"
          >
            <i className="fas fa-globe-africa mr-2"></i>
            Gérer les pays
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="ml-64 flex-1 p-8">
        {/* En-tête */}
        <div
          className="mb-8 flex justify-between items-center"
          data-aos="fade-down"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Tableau de Bord
            </h1>
            <p className="text-gray-500">Gérez vos dossiers et utilisateurs</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-sky-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-sky-600 transition-transform hover:scale-105"
          >
            <i className="fas fa-plus mr-2"></i>
            Nouvel utilisateur
          </button>
        </div>

        {/* Statistiques - Pas d'effet fade-up pour éviter le scroll jump */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Total",
              count: destinations.length,
              color: "sky",
              icon: "users",
            },
            {
              label: "En cours",
              count: destinations.filter((d) => d.status === "En cours").length,
              color: "amber",
              icon: "spinner",
            },
            {
              label: "Achevée",
              count: destinations.filter((d) => d.status === "Achevée").length,
              color: "emerald",
              icon: "check-circle",
            },
            {
              label: "Annulée",
              count: destinations.filter((d) => d.status === "Annulée").length,
              color: "slate",
              icon: "times-circle",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-white border-l-4 border-${stat.color}-500 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {stat.count}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 bg-${stat.color}-50 rounded-full flex items-center justify-center text-${stat.color}-500 text-xl`}
                >
                  <i className={`fas fa-${stat.icon}`}></i>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Graphique */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div ref={chartRef} style={{ height: "350px" }}></div>
        </div>

        {/* Filtres */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px] relative">
              <input
                type="text"
                placeholder="Rechercher un nom ou une procédure..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
            </div>
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-sky-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="En cours">En cours</option>
              <option value="Achevée">Achevée</option>
              <option value="Annulée">Annulée</option>
            </select>
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-sky-500"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              <option value="all">Tous les pays</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Utilisateur",
                  "Procédure",
                  "Statut",
                  "Mise à jour",
                  "Pays",
                  "Actions",
                ].map((th, i) => (
                  <th
                    key={th}
                    className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 5 ? "text-right" : ""}`}
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredDestinations().map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {d.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {d.procedure}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    {d.lastUpdate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    <span className="flex items-center">
                      <i className="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                      {d.country}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => {
                        setEditingDestination(d);
                        setShowEditModal(true);
                      }}
                      className="text-sky-600 hover:text-sky-900 bg-sky-50 p-2 rounded-md transition-colors"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteUser(d.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-md transition-colors"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modals Ajout/Modif */}
        {(showModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8"
              data-aos="zoom-in"
              data-aos-duration="300"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {showEditModal ? "Modifier le profil" : "Nouvel Utilisateur"}
              </h3>
              <form onSubmit={(e) => handleFormSubmit(e, showEditModal)}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nom Complet
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                      value={
                        showEditModal
                          ? editingDestination?.name
                          : newDestination.name
                      }
                      onChange={(e) =>
                        showEditModal
                          ? setEditingDestination({
                              ...editingDestination!,
                              name: e.target.value,
                            })
                          : setNewDestination({
                              ...newDestination,
                              name: e.target.value,
                            })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Type de Procédure
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                      value={
                        showEditModal
                          ? editingDestination?.procedure
                          : newDestination.procedure
                      }
                      onChange={(e) =>
                        showEditModal
                          ? setEditingDestination({
                              ...editingDestination!,
                              procedure: e.target.value,
                            })
                          : setNewDestination({
                              ...newDestination,
                              procedure: e.target.value,
                            })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                        value={
                          showEditModal
                            ? editingDestination?.status
                            : newDestination.status
                        }
                        onChange={(e) =>
                          showEditModal
                            ? setEditingDestination({
                                ...editingDestination!,
                                status: e.target.value as never,
                              })
                            : setNewDestination({
                                ...newDestination,
                                status: e.target.value as never,
                              })
                        }
                      >
                        <option value="En cours">En cours</option>
                        <option value="Achevée">Achevée</option>
                        <option value="Annulée">Annulée</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Pays
                      </label>
                      <select
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                        value={
                          showEditModal
                            ? editingDestination?.country
                            : newDestination.country
                        }
                        onChange={(e) =>
                          showEditModal
                            ? setEditingDestination({
                                ...editingDestination!,
                                country: e.target.value,
                              })
                            : setNewDestination({
                                ...newDestination,
                                country: e.target.value,
                              })
                        }
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-8 space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setShowEditModal(false);
                    }}
                    className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 shadow-md font-medium transition-all"
                  >
                    {showEditModal ? "Sauvegarder" : "Créer le dossier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Pays */}
        {showCountryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Gestion des destinations
              </h3>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="Nom du pays"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                />
                <button
                  onClick={handleAddCountry}
                  className="bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Ajouter
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto mb-6 pr-2">
                <div className="grid gap-2">
                  {countries.map((country) => (
                    <div
                      key={country}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                    >
                      <span className="font-medium text-gray-700">
                        {country}
                      </span>
                      <button
                        onClick={() => handleRemoveCountry(country)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowCountryModal(false)}
                className="w-full py-2.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl z-[100] animate-bounce-short flex items-center">
            <i className="fas fa-info-circle mr-3 text-sky-400"></i>
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: "En cours" | "Achevée" | "Annulée" }> = ({
  status,
}) => {
  const styles = {
    "En cours": "bg-amber-100 text-amber-700 border-amber-200",
    Achevée: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Annulée: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export default Admindashboard;
