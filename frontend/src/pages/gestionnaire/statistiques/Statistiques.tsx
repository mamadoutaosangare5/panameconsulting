import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  FileText,
  Calendar,
  Globe,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Types
interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  trend: "up" | "down" | "neutral";
}

// Composant StatCard optimisé
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend,
}) => {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-rose-600"
        : "text-gray-600";

  return (
    <>
      <Helmet>
        <title>Panneau Des Statistiques - Paname Consulting</title>
        <meta
          name="description"
          content="Consultez les statistiques de Paname Consulting"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-sky-100"
      >
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-br ${color}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span
            className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${trendColor}`}
          >
            {change > 0 ? "+" : ""}
            {change}%
            {trend === "up" && (
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </span>
        </div>
        <h3 className="text-sm sm:text-base font-medium text-gray-600 mb-1">
          {title}
        </h3>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      </motion.div>
    </>
  );
};

// Données
const userStats = [
  { name: "Lun", utilisateurs: 45, rendezvous: 12, procedures: 8 },
  { name: "Mar", utilisateurs: 52, rendezvous: 15, procedures: 10 },
  { name: "Mer", utilisateurs: 48, rendezvous: 18, procedures: 12 },
  { name: "Jeu", utilisateurs: 61, rendezvous: 22, procedures: 15 },
  { name: "Ven", utilisateurs: 55, rendezvous: 25, procedures: 18 },
  { name: "Sam", utilisateurs: 38, rendezvous: 10, procedures: 5 },
  { name: "Dim", utilisateurs: 25, rendezvous: 5, procedures: 3 },
];

const destinationStats = [
  { name: "France", valeur: 45 },
  { name: "Canada", valeur: 32 },
  { name: "USA", valeur: 28 },
  { name: "UK", valeur: 25 },
  { name: "Allemagne", valeur: 18 },
];

const procedureTypes = [
  { name: "Visa Étudiant", value: 85 },
  { name: "Visa Travail", value: 42 },
  { name: "Résidence", value: 38 },
  { name: "Citoyenneté", value: 12 },
  { name: "Regroupement", value: 25 },
];

const contactStats = [
  { name: "Jan", messages: 65, repondu: 58 },
  { name: "Fév", messages: 78, repondu: 70 },
  { name: "Mar", messages: 92, repondu: 85 },
  { name: "Avr", messages: 88, repondu: 82 },
  { name: "Mai", messages: 102, repondu: 95 },
  { name: "Jun", messages: 115, repondu: 108 },
];

const rendezvousStats = [
  { name: "Matin", value: 35 },
  { name: "Après-midi", value: 45 },
  { name: "Soir", value: 20 },
];

const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

const Statistiques = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("semaine");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Données des cartes statistiques
  const statCards = [
    {
      title: "Utilisateurs",
      value: "1,234",
      change: 12,
      icon: Users,
      color: "from-sky-400 to-sky-600",
      trend: "up" as const,
    },
    {
      title: "Procédures",
      value: "456",
      change: 8,
      icon: FileText,
      color: "from-emerald-400 to-emerald-600",
      trend: "up" as const,
    },
    {
      title: "Rendez-vous",
      value: "89",
      change: -5,
      icon: Calendar,
      color: "from-amber-400 to-amber-600",
      trend: "down" as const,
    },
    {
      title: "Destinations",
      value: "32",
      change: 0,
      icon: Globe,
      color: "from-purple-400 to-purple-600",
      trend: "neutral" as const,
    },
    {
      title: "Messages",
      value: "245",
      change: 15,
      icon: MessageSquare,
      color: "from-rose-400 to-rose-600",
      trend: "up" as const,
    },
    {
      title: "Taux de conversion",
      value: "68%",
      change: 4,
      icon: TrendingUp,
      color: "from-indigo-400 to-indigo-600",
      trend: "up" as const,
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50 p-3 sm:p-4 md:p-6"
    >
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-sky-600 to-sky-800 bg-clip-text text-transparent">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Aperçu global de vos activités
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-white border border-sky-200 rounded-lg hover:border-sky-600 focus:ring-none focus:outline-none focus:border-sky-500 focus:border-transparent"
          >
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-sky-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
          >
            <Download className="w-4 h-4 text-sky-600" />
          </motion.button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Graphiques avec Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graphique utilisateurs et rendez-vous */}
        <div
          key="usersChart"
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100 overflow-hidden"
        >
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
            Activité hebdomadaire
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
            <LineChart data={userStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  outline: "none",
                }}
                wrapperStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="utilisateurs"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="rendezvous"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="procedures"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique destinations */}
        <div
          key="destinationsChart"
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100 overflow-hidden"
        >
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
            Destinations populaires
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
            <PieChart>
              <Pie
                data={destinationStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${Math.round((percent || 0) * 100)}%`
                }
                outerRadius={isMobile ? 60 : 80}
                dataKey="valeur"
              >
                {destinationStats.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique types de procédures */}
        <div
          key="proceduresChart"
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100 overflow-hidden"
        >
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
            Types de procédures
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <BarChart data={procedureTypes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique contacts */}
        <div
          key="contactsChart"
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100 overflow-hidden"
        >
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
            Messages reçus vs traités
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <AreaChart data={contactStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="messages"
                stackId="1"
                stroke="#f43f5e"
                fill="#f43f5e"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="repondu"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique répartition rendez-vous */}
        <div
          key="rendezvousChart"
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100 overflow-hidden"
        >
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">
            Rendez-vous par période
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <PieChart>
              <Pie
                data={rendezvousStats}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 30 : 40}
                outerRadius={isMobile ? 50 : 70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${Math.round((percent || 0) * 100)}%`
                }
              >
                {rendezvousStats.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section des alertes et notifications */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="mt-4 sm:mt-6 bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-sky-100"
      >
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          Alertes récentes
        </h3>
        <div className="space-y-2">
          {[
            {
              icon: Clock,
              text: "5 rendez-vous en attente de confirmation",
              color: "text-amber-600",
            },
            {
              icon: CheckCircle,
              text: "12 nouvelles procédures cette semaine",
              color: "text-emerald-600",
            },
            {
              icon: XCircle,
              text: "3 messages non répondus depuis 24h",
              color: "text-rose-600",
            },
          ].map((alert, index) => {
            const Icon = alert.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg"
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${alert.color}`} />
                <span className="text-xs sm:text-sm text-gray-700">
                  {alert.text}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Statistiques;
