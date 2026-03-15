import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  Globe,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Hooks et Services
// ─────────────────────────────────────────────────────────────────────────────

import { useRendezvous } from "../../../hooks/useRendezvous";
import { useUser } from "../../../hooks/useUser";
import { useProcedures } from "../../../hooks/useProcedures";
import { useMessages } from "../../../hooks/useMessages";
import { useDestinations } from "../../../hooks/useDestinations";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "rendezvous"
  | "procedures"
  | "messages"
  | "destinations";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  gradient: string;
  trend: "up" | "down" | "neutral";
  sub?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Données dynamiques (hooks)
// ─────────────────────────────────────────────────────────────────────────────

// Données d'activité hebdomadaire (construites à partir des statistiques)
const getWeeklyActivity = (rendezvousStats: any, procedureStats: any, messageStats: any) => [
	{ name: "Lun", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Mar", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Mer", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Jeu", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Ven", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Sam", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
	{ name: "Dim", rendezvous: rendezvousStats?.upcoming?.today || 0, procedures: procedureStats?.newProcedures?.today || 0, messages: messageStats?.today || 0 },
];

// Données de destinations (construites à partir du hook)
const getDestinationData = (destinations: any[]) => destinations?.map(dest => ({
	name: dest.country,
	value: dest.totalProcedures || 0
})) || [];

const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, gradient, trend, sub }) => {
	const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-gray-500";
	const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : TrendingUp;

	return (
		<div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 hover:shadow-md transition-shadow">
			<div className="flex items-start justify-between mb-3">
				<div
					className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
				>
					<Icon className="w-5 h-5 text-white" />
				</div>
				<span className={`text-xs font-semibold flex items-center gap-0.5 ${trendColor}`}>
					{change !== 0 && (change > 0 ? "+" : "")}{change !== 0 ? `${change}%` : "—"}
					<TrendIcon className="w-3 h-3" />
				</span>
			</div>
			<p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
			<p className="text-xs font-medium text-gray-500">{title}</p>
			{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
		</div>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const Gestionnaire: React.FC = () => {
	const [activeSection, setActiveSection] = useState<Section>("overview");
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Hooks de statistiques existants - Seulement les méthodes de statistiques
	const { 
		statistics: rendezvousStats, 
		loadStatistics: loadRendezvousStats
	} = useRendezvous({ autoLoad: true });

	const { 
		statistics: userStats, 
		fetchStatistics: fetchUserStats 
	} = useUser();

	const { 
		statistics: procedureStats, 
		loadStatistics: loadProcedureStats
	} = useProcedures({ shouldLoadStatistics: true });

	const { 
		stats: messageStats, 
		refresh: refreshMessages
	} = useMessages();

	const { 
		destinations, 
		loadDestinations 
	} = useDestinations();

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([
				loadRendezvousStats(),
				fetchUserStats(),
				loadProcedureStats(),
				refreshMessages(),
				loadDestinations(),
			]);
			toast.success("Statistiques actualisées avec succès");
		} catch (error) {
			console.error("Erreur lors du rafraîchissement des statistiques:", error);
			toast.error("Impossible de charger les statistiques");
		} finally {
			setIsRefreshing(false);
		}
	}, [loadRendezvousStats, fetchUserStats, loadProcedureStats, refreshMessages, loadDestinations]);

	// Données dynamiques construites à partir des hooks de statistiques
	const weeklyActivity = getWeeklyActivity(rendezvousStats, procedureStats, messageStats);
	const destinationData = getDestinationData(destinations);

	const tabs: {
		key: Section;
		label: string;
		icon: React.ElementType;
		count?: number;
	}[] = [
		{ key: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
		{
			key: "rendezvous",
			label: "Rendez-vous",
			icon: Calendar,
			count: rendezvousStats?.byStatus?.pending || 0,
		},
		{
			key: "procedures",
			label: "Procédures",
			icon: FileText,
			count: procedureStats?.byStatus?.IN_PROGRESS || 0,
		},
		{
			key: "messages",
			label: "Messages",
			icon: MessageSquare,
			count: messageStats?.unread || 0,
		},
		{ key: "destinations", label: "Destinations", icon: Globe, count: destinations.length },
	];

	const statCards = [
		{
			title: "Rendez-vous",
			value: rendezvousStats?.total || 0,
			change: Math.round(rendezvousStats?.completionRate || 0),
			icon: Calendar,
			gradient: "from-sky-400 to-sky-600",
			trend: "up" as const,
			sub: `${rendezvousStats?.byStatus?.confirmed || 0} confirmés`,
		},
		{
			title: "Procédures",
			value: procedureStats?.total || 0,
			change: Math.round(procedureStats?.completionRate || 0),
			icon: FileText,
			gradient: "from-emerald-400 to-emerald-600",
			trend: "up" as const,
			sub: `${procedureStats?.byStatus?.IN_PROGRESS || 0} en cours`,
		},
		{
			title: "Messages",
			value: messageStats?.total || 0,
			change: Math.round(messageStats?.responseRate || 0),
			icon: MessageSquare,
			gradient: "from-amber-400 to-amber-600",
			trend: "up" as const,
			sub: `${messageStats?.unread || 0} non lus`,
		},
		{
			title: "Utilisateurs",
			value: userStats?.totalUsers || 0,
			change: userStats?.recentlyCreated || 0,
			icon: Users,
			gradient: "from-indigo-400 to-indigo-600",
			trend: "up" as const,
			sub: `${userStats?.activeUsers || 0} actifs`,
		},
		{
			title: "Taux complétion",
			value: `${Math.round(procedureStats?.completionRate || 0)}%`,
			change: Math.round(procedureStats?.completionRate || 0),
			icon: TrendingUp,
			gradient: "from-violet-400 to-violet-600",
			trend: "up" as const,
		},
		{
			title: "Annulations",
			value: `${Math.round(rendezvousStats?.cancellationRate || 0)}%`,
			change: -Math.round(rendezvousStats?.cancellationRate || 0),
			icon: TrendingDown,
			gradient: "from-rose-400 to-rose-600",
			trend: "down" as const,
		},
	];

	// ── Sections ────────────────────────────────────────────────────────────────
	
	const OverviewSection = () => (
		<div className="space-y-6">
			<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
				{statCards.map((card) => (
					<StatCard key={card.title} {...card} />
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Activité hebdomadaire */}
				<div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-800 mb-4">Activité hebdomadaire</h3>
					<ResponsiveContainer width="100%" height={220}>
						<AreaChart data={weeklyActivity}>
							<defs>
								<linearGradient id="gRdv"  x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%"  stopColor="#0284c7" stopOpacity={0.2} />
									<stop offset="95%" stopColor="#0284c7" stopOpacity={0}   />
								</linearGradient>
								<linearGradient id="gProc" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
									<stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
								</linearGradient>
								<linearGradient id="gMsg"  x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
									<stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
							<XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
							<YAxis stroke="#94a3b8" fontSize={11} />
							<Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e0f2fe", fontSize: 12 }} />
							<Legend wrapperStyle={{ fontSize: 11 }} />
							<Area type="monotone" dataKey="rendezvous" stroke="#0284c7" strokeWidth={2} fill="url(#gRdv)"  name="Rendez-vous" />
							<Area type="monotone" dataKey="procedures" stroke="#10b981" strokeWidth={2} fill="url(#gProc)" name="Procédures"  />
							<Area type="monotone" dataKey="messages"   stroke="#f59e0b" strokeWidth={2} fill="url(#gMsg)"  name="Messages"    />
						</AreaChart>
					</ResponsiveContainer>
				</div>

				{/* Destinations */}
				<div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
					<h3 className="text-sm font-semibold text-gray-800 mb-4">Destinations populaires</h3>
					<ResponsiveContainer width="100%" height={220}>
						<PieChart>
							<Pie
								data={destinationData}
								cx="50%"
								cy="50%"
								outerRadius={80}
								dataKey="value"
								label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
								labelLine={false}
								fontSize={11}
							>
								{destinationData.map((_, i) => (
									<Cell key={i} fill={COLORS[i % COLORS.length]} />
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Alertes */}
			<div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
				<h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
					<AlertCircle className="w-4 h-4 text-amber-500" />
					Alertes récentes
				</h3>
				<div className="space-y-2">
					{[
						{
							icon: Clock,
							text: `${rendezvousStats?.byStatus?.pending || 0} rendez-vous en attente de confirmation`,
							color: "text-amber-600",
							bg: "bg-amber-50",
						},
						{
							icon: CheckCircle,
							text: `${procedureStats?.byStatus?.IN_PROGRESS || 0} procédures actives cette semaine`,
							color: "text-emerald-600",
							bg: "bg-emerald-50",
						},
						{
							icon: XCircle,
							text: `${messageStats?.unread || 0} messages non lus depuis 24h`,
							color: "text-rose-600",
							bg: "bg-rose-50",
						},
					].map(({ icon: Icon, text, color, bg }, i) => (
						<div key={i} className={`flex items-center gap-3 p-3 ${bg} rounded-xl`}>
							<Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
							<span className="text-sm text-gray-700">{text}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);

	const RendezvousSection = () => <div>Section Rendez-vous - En cours de développement</div>;
	const ProceduresSection = () => <div>Section Procédures - En cours de développement</div>;
	const MessagesSection = () => <div>Section Messages - En cours de développement</div>;
	const DestinationsSection = () => <div>Section Destinations - En cours de développement</div>;

	// ── Rendu ────────────────────────────────────────────────────────────────────────

	return (
		<>
			<Helmet>
				<title>Statistiques - Paname Consulting</title>
				<meta name="robots" content="noindex, nofollow" />
			</Helmet>

			<div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-50">
				{/* Header */}
				<header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 sm:px-6 py-4">
					<div className="max-w-7xl mx-auto flex items-center justify-between">
						<div>
							<h1 className="text-lg sm:text-xl font-bold text-gray-900">Statistiques</h1>
							<p className="text-xs text-gray-500">Paname Consulting · Admin</p>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={handleRefresh}
								className="p-2 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 transition-colors"
							>
								<RefreshCw className={`w-4 h-4 text-sky-600 ${isRefreshing ? "animate-spin" : ""}`} />
							</button>
							<button className="p-2 bg-white border border-sky-200 rounded-xl hover:bg-sky-50 transition-colors">
								<Download className="w-4 h-4 text-sky-600" />
							</button>
						</div>
					</div>
				</header>

				{/* Tabs */}
				<div className="sticky top-[65px] z-10 bg-white/90 backdrop-blur-md border-b border-sky-100">
					<div className="max-w-7xl mx-auto px-4 sm:px-6">
						<div className="flex overflow-x-auto scrollbar-hide gap-1 py-2">
							{tabs.map(({ key, label, icon: Icon, count }) => (
								<button
									key={key}
									onClick={() => setActiveSection(key)}
									className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
										activeSection === key
											? "bg-sky-500 text-white shadow-sm"
											: "text-gray-500 hover:bg-sky-50 hover:text-sky-600"
									}`}
								>
									<Icon className="w-4 h-4" />
									{label}
									{count !== undefined && count > 0 && (
										<span
											className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
												activeSection === key
													? "bg-white/20 text-white"
													: "bg-sky-100 text-sky-600"
											}`}
										>
											{count}
										</span>
									)}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Contenu */}
				<main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
					{activeSection === "overview" && <OverviewSection />}
					{activeSection === "rendezvous" && <RendezvousSection />}
					{activeSection === "procedures" && <ProceduresSection />}
					{activeSection === "messages" && <MessagesSection />}
					{activeSection === "destinations" && <DestinationsSection />}
				</main>
			</div>
		</>
	);
};

export default Gestionnaire;
