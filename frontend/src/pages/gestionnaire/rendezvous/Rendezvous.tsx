import { useState, useEffect, useCallback, useRef, type JSX } from "react";
import { Helmet } from "react-helmet-async";
import { useRendezvous } from "../../../hooks/useRendezvous";
import { useAuth } from "../../../hooks/useAuth";
import { rendezvousService } from "../../../services/rendezvous.service";
import { formatTimeSlot } from "../../../types/rendezvous.types";
import {
	RendezvousStatus,
	AdminOpinion,
	CancelledBy,
	type Rendezvous,
	type CancelRendezvousData,
	type CompleteRendezvousData,
	type UpdateRendezvousData,
	type RendezvousQueryParams,
	type RendezvousFilters,
	TimeSlot,
	DESTINATION_OPTIONS,
} from "../../../types/rendezvous.types";
import {
	Calendar,
	Search,
	Trash2,
	MapPin,
	Phone,
	Mail,
	CheckCircle,
	XCircle,
	AlertCircle,
	ChevronDown,
	Filter,
	Download,
	RefreshCw,
	Clock,
	GraduationCap,
	Eye,
	X,
	ChevronLeft,
	ChevronRight,
	Ban,
	ThumbsUp,
	ThumbsDown,
	Edit2,
	TrendingUp,
	TrendingDown,
	BarChart2,
	CalendarDays,
	Star,
	ArrowUpRight,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────
// Types locaux
// ────────────────────────────────────────────────────────────────────────────

type ModalType = "detail" | "complete" | "cancel" | "update" | null;

interface ModalState {
	type: ModalType;
	rdv: Rendezvous | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Constantes de style
// ────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
	[RendezvousStatus.CONFIRMED]: {
		bg: "bg-emerald-50",
		text: "text-emerald-700",
		border: "border-emerald-200",
		dot: "bg-emerald-500",
		Icon: CheckCircle,
		label: "Confirmé",
	},
	[RendezvousStatus.PENDING]: {
		bg: "bg-amber-50",
		text: "text-amber-700",
		border: "border-amber-200",
		dot: "bg-amber-400",
		Icon: AlertCircle,
		label: "En attente",
	},
	[RendezvousStatus.CANCELLED]: {
		bg: "bg-red-50",
		text: "text-red-700",
		border: "border-red-200",
		dot: "bg-red-400",
		Icon: XCircle,
		label: "Annulé",
	},
	[RendezvousStatus.COMPLETED]: {
		bg: "bg-sky-50",
		text: "text-sky-700",
		border: "border-sky-200",
		dot: "bg-sky-500",
		Icon: CheckCircle,
		label: "Terminé",
	},
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Composant
// ────────────────────────────────────────────────────────────────────────────

const RendezvousPage = () => {
	const { isAdmin } = useAuth();

	const {
		// État
		rendezvous,
		statistics,
		pagination,
		loading,
		error,
		filters,

		// Actions admin — liste & navigation
		loadRendezvous,
		loadRendezvousById,
		loadStatistics,

		// Actions admin — mutations
		updateRendezvous,
		completeRendezvous,
		cancelRendezvous,
		deleteRendezvous,

		// Actions admin — vues spéciales
		getRendezvousByDate,
		getUpcomingRendezvous,

		// Filtres & utilitaires
		setFilters,
		setQueryParams,
	} = useRendezvous({ autoLoad: true });

	// ── État local ─────────────────────────────────────────────────────────────

	const [searchTerm, setSearchTerm] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [modal, setModal] = useState<ModalState>({ type: null, rdv: null });
	const [activeTab, setActiveTab] = useState<"list" | "today" | "upcoming">("list");
	const [todayList, setTodayList] = useState<Rendezvous[]>([]);
	const [upcomingList, setUpcomingList] = useState<Rendezvous[]>([]);
	const [loadingPanel, setLoadingPanel] = useState(false);

	// Formulaires modaux
	const [cancelReason, setCancelReason] = useState("");
	const [completeOpinion, setCompleteOpinion] = useState<AdminOpinion>(AdminOpinion.FAVORABLE);
	const [completeComment, setCompleteComment] = useState("");
	const [editForm, setEditForm] = useState<UpdateRendezvousData>({});

	const searchTimer = useRef<ReturnType<typeof setTimeout>>(setTimeout(() => {}, 0));

	// ── Debounce recherche → setFilters ──────────────────────────────────────

	useEffect(() => {
		clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => {
			setFilters({ ...filters, searchTerm: searchTerm.trim() || undefined });
		}, 350);
		return () => clearTimeout(searchTimer.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchTerm]);

	// ── Panels ────────────────────────────────────────────────────────────────

	/**
	 * GET /rendezvous/by-date/:date  (admin)
	 */
	const loadTodayPanel = useCallback(async () => {
		setLoadingPanel(true);
		try {
			const today = new Date().toISOString().split("T")[0];
			setTodayList(await getRendezvousByDate(today));
		} finally {
			setLoadingPanel(false);
		}
	}, [getRendezvousByDate]);

	/**
	 * GET /admin/rendezvous/all (status=CONFIRMED, startDate=today, sortBy=date, sortOrder=asc)
	 */
	const loadUpcomingPanel = useCallback(
		async (limit = 10) => {
			setLoadingPanel(true);
			try {
				setUpcomingList(await getUpcomingRendezvous(limit));
			} finally {
				setLoadingPanel(false);
			}
		},
		[getUpcomingRendezvous],
	);

	// ── Navigation onglets ────────────────────────────────────────────────────

	const switchTab = useCallback(
		(tab: "list" | "today" | "upcoming") => {
			setActiveTab(tab);
			if (tab === "today") loadTodayPanel();
			if (tab === "upcoming") loadUpcomingPanel();
		},
		[loadTodayPanel, loadUpcomingPanel],
	);

	// ── Pagination — GET /admin/rendezvous/all ────────────────────────────────

	const goToPage = useCallback(
		(page: number) => {
			const params: RendezvousQueryParams = { page };
			setQueryParams(params);
		},
		[setQueryParams],
	);

	// ── Filtre rapide par date → getRendezvousByDate ──────────────────────────

	const handleDateQuickFilter = useCallback(
		async (date: string) => {
			if (!date) {
				setFilters({ ...filters, dateRange: undefined });
				return;
			}
			setActiveTab("today");
			setLoadingPanel(true);
			try {
				setTodayList(await getRendezvousByDate(date));
			} finally {
				setLoadingPanel(false);
			}
		},
		[getRendezvousByDate, setFilters, filters],
	);

	// ── Ouverture modal — GET /rendezvous/:id ─────────────────────────────────

	const openModal = useCallback(
		async (type: ModalType, rdv: Rendezvous) => {
			// loadRendezvousById met à jour selectedRendezvous dans le hook
			// mais ne retourne rien — on utilise directement le rdv passé en arg
			// puis on recharge pour avoir les données fraîches (relations user/procedure)
			setModal({ type, rdv });
			await loadRendezvousById(rdv.id);

			if (type === "update") {
				setEditForm({
					firstName: rdv.firstName,
					lastName: rdv.lastName,
					telephone: rdv.telephone,
					destination: rdv.destination,
					niveauEtude: rdv.niveauEtude,
					filiere: rdv.filiere,
					date: rdv.date,
					time: rdv.time as TimeSlot,
				});
			}
			setCancelReason("");
			setCompleteOpinion(AdminOpinion.FAVORABLE);
			setCompleteComment("");
		},
		[loadRendezvousById],
	);

	const closeModal = () => setModal({ type: null, rdv: null });

	// ── Mutations ─────────────────────────────────────────────────────────────

	/**
	 * PATCH /admin/rendezvous/:id/complete
	 */
	const handleComplete = async () => {
		if (!modal.rdv) return;
		const data: CompleteRendezvousData = {
			avisAdmin: completeOpinion,
			comments: completeComment.trim() || undefined,
		};
		const result = await completeRendezvous(modal.rdv.id, data);
		if (result) {
			closeModal();
			await loadStatistics();
		}
	};

	/**
	 * PATCH /rendezvous/:id/cancel
	 * cancelledBy = ADMIN (l'admin annule depuis le backoffice)
	 */
	const handleCancel = async () => {
		if (!modal.rdv || !cancelReason.trim()) return;
		const data: CancelRendezvousData = {
			reason: cancelReason.trim(),
			cancelledBy: CancelledBy.ADMIN,
		};
		const result = await cancelRendezvous(modal.rdv.id, data);
		if (result) {
			closeModal();
			await loadStatistics();
		}
	};

	/**
	 * PATCH /admin/rendezvous/:id/patch
	 */
	const handleUpdate = async () => {
		if (!modal.rdv) return;
		const result = await updateRendezvous(modal.rdv.id, editForm);
		if (result) closeModal();
	};

	/**
	 * DELETE /admin/rendezvous/:id/delete  (soft-delete → CANCELLED)
	 */
	const handleDelete = async (id: string) => {
		if (!window.confirm("Supprimer ce rendez-vous définitivement ?")) return;
		await deleteRendezvous(id);
		await loadStatistics();
	};

	// ── Export CSV — rendezvousService.exportRendezvousToCSV ─────────────────

	const handleExport = async () => {
		const csv = await rendezvousService.exportToCSV(filters as RendezvousFilters);
		if (!csv) return;
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `rendezvous-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// ── Reset filtres ─────────────────────────────────────────────────────────

	const handleResetFilters = () => {
		setSearchTerm("");
		setFilters({});
	};

	// ── Rafraîchissement complet ──────────────────────────────────────────────

	const handleRefresh = async () => {
		await Promise.all([
			loadRendezvous(), // GET /admin/rendezvous/all
			loadStatistics(), // GET /admin/rendezvous/statistics
		]);
	};

	// ────────────────────────────────────────────────────────────────────────
	// Helpers UI
	// ────────────────────────────────────────────────────────────────────────

	const statusBadge = (status: RendezvousStatus) => {
		const cfg = STATUS_CFG[status] ?? STATUS_CFG[RendezvousStatus.PENDING];
		const { Icon } = cfg;
		return (
			<span
				className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
			>
				<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
				<Icon className="w-3 h-3" />
				{cfg.label}
			</span>
		);
	};

	const initials = (name: string) =>
		name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

	const activeFiltersCount = [
		filters.status,
		filters.destinations,
		filters.dateRange?.start || filters.dateRange?.end,
		filters.searchTerm,
	].filter(Boolean).length;

	// ────────────────────────────────────────────────────────────────────────
	// Erreur
	// ────────────────────────────────────────────────────────────────────────

	if (error) {
		return (
			<div className="p-6 max-w-7xl mx-auto">
				<div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
					<XCircle className="w-12 h-12 text-red-400" />
					<p className="text-red-800 font-semibold">{error}</p>
					<button
						onClick={handleRefresh}
						className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
					>
						Réessayer
					</button>
				</div>
			</div>
		);
	}

	// ────────────────────────────────────────────────────────────────────────
	// Rendu principal
	// ────────────────────────────────────────────────────────────────────────

	return (
		<>
			<Helmet>
				<title>Gestion Des Rendez-vous - Paname Consulting</title>
				<meta name="robots" content="noindex, nofollow" />
			</Helmet>

			<div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
				{/* ════════════ HEADER ════════════ */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Rendez-vous</h1>
						<p className="text-gray-500 text-sm mt-0.5">Gestion des consultations</p>
					</div>
					<div className="flex gap-2 flex-wrap">
						<button
							onClick={handleExport}
							className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors"
						>
							<Download className="w-4 h-4" />
							<span className="hidden sm:inline">Exporter CSV</span>
						</button>
						<button
							onClick={handleRefresh}
							disabled={loading.list || loading.statistics}
							className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
						>
							<RefreshCw
								className={`w-4 h-4 ${loading.list || loading.statistics ? "animate-spin" : ""}`}
							/>
							<span className="hidden sm:inline">Actualiser</span>
						</button>
					</div>
				</div>

				{/* ════════════ STATISTIQUES (admin) ════════════ */}
				{isAdmin && statistics && (
					<>
						<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
							{[
								{
									Icon: BarChart2,
									color: "text-blue-500",
									bg: "bg-blue-50",
									value: statistics?.total ?? 0,
									label: "Total",
									sub: null,
								},
								{
									Icon: CheckCircle,
									color: "text-emerald-600",
									bg: "bg-emerald-50",
									value: statistics?.byStatus?.confirmed ?? 0,
									label: "Confirmés",
									sub: null,
								},
								{
									Icon: AlertCircle,
									color: "text-amber-500",
									bg: "bg-amber-50",
									value: statistics?.byStatus?.pending ?? 0,
									label: "En attente",
									sub: null,
								},
								{
									Icon: XCircle,
									color: "text-red-500",
									bg: "bg-red-50",
									value: statistics?.byStatus?.cancelled ?? 0,
									label: "Annulés",
									sub: null,
								},
								{
									Icon: CheckCircle,
									color: "text-blue-500",
									bg: "bg-blue-50",
									value: statistics?.byStatus?.completed ?? 0,
									label: "Complétés",
									sub: null,
								},
							].map(({ Icon, color, bg, value, label, sub }) => (
								<div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
									<div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
										<Icon className={`w-4 h-4 ${color}`} />
									</div>
									<p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
									<p className="text-xs text-gray-500 mt-0.5">{label}</p>
									{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
								</div>
							))}
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{/* Taux */}
							<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
								<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
									<TrendingUp className="w-4 h-4 text-emerald-500" /> Taux de complétion
								</h3>
								{[
									{
										label: "Terminés",
										pct: statistics.completionRate,
										color: "bg-emerald-500",
										textColor: "text-emerald-600",
									},
									{
										label: "Annulations",
										pct: statistics.cancellationRate,
										color: "bg-red-400",
										textColor: "text-red-500",
									},
								].map(({ label, pct, color, textColor }) => (
									<div key={label}>
										<div className="flex justify-between text-xs text-gray-500 mb-1">
											<span>{label}</span>
											<span className={`font-semibold ${textColor}`}>
												{pct?.toFixed(1) ?? 0}%
											</span>
										</div>
										<div className="w-full bg-gray-100 rounded-full h-2">
											<div
												className={`${color} h-2 rounded-full transition-all duration-500`}
												style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
											/>
										</div>
									</div>
								))}
								<div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
									{[
										{
											label: "Cette semaine",
											value: statistics.upcoming.thisWeek,
										},
										{ label: "Ce mois", value: statistics.upcoming.thisMonth },
									].map(({ label, value }) => (
										<div key={label} className="bg-gray-50 rounded-lg p-2">
											<p className="text-lg font-bold text-gray-800">{value}</p>
											<p className="text-xs text-gray-400">{label}</p>
										</div>
									))}
								</div>
							</div>

							{/* Top destinations */}
							<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
								<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
									<Star className="w-4 h-4 text-amber-500" /> Top destinations
								</h3>
								{(statistics?.topDestinations ?? []).length === 0 ? (
									<p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
								) : (
									<div className="space-y-2">
										{(statistics?.topDestinations ?? []).slice(0, 5).map((d, i) => {
											const max = (statistics?.topDestinations ?? [])[0]?.count ?? 1;
											const pct = Math.round((d.count / max) * 100);
											return (
												<div key={d.destination} className="flex items-center gap-2">
													<span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
													<div className="flex-1">
														<div className="flex justify-between text-xs mb-0.5">
															<span className="font-medium text-gray-700 truncate">
																{d.destination}
															</span>
															<span className="text-gray-500 ml-2 shrink-0">
																{d.count}
															</span>
														</div>
														<div className="w-full bg-gray-100 rounded-full h-1.5">
															<div
																className="bg-sky-500 h-1.5 rounded-full"
																style={{ width: `${pct}%` }}
															/>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Prévisions */}
							<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
								<h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
									<CalendarDays className="w-4 h-4 text-indigo-500" /> Prévisions
								</h3>
								<div className="space-y-3">
									{[
										{
											label: "Aujourd'hui",
											value: statistics.upcoming.today,
											color: "text-sky-600",
											icon: <ArrowUpRight className="w-4 h-4" />,
										},
										{
											label: "Demain",
											value: statistics.upcoming.tomorrow,
											color: "text-indigo-600",
											icon: <ArrowUpRight className="w-4 h-4" />,
										},
										{
											label: "Cette semaine",
											value: statistics.upcoming.thisWeek,
											color: "text-violet-600",
											icon: <TrendingUp className="w-4 h-4" />,
										},
										{
											label: "Ce mois",
											value: statistics.upcoming.thisMonth,
											color: "text-purple-600",
											icon: <TrendingDown className="w-4 h-4" />,
										},
									].map(({ label, value, color, icon }) => (
										<div key={label} className="flex items-center justify-between">
											<div className={`flex items-center gap-2 text-sm text-gray-600`}>
												<span className={color}>{icon}</span>
												{label}
											</div>
											<span className={`text-lg font-bold ${color}`}>{value}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</>
				)}

				{/* ════════════ ONGLETS ════════════ */}
				<div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
					{(
						[
							{ key: "list", label: "Tous", count: pagination.total },
							{ key: "today", label: "Aujourd'hui", count: todayList.length },
							{ key: "upcoming", label: "À venir", count: upcomingList.length },
						] as const
					).map(({ key, label, count }) => (
						<button
							key={key}
							onClick={() => switchTab(key)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
								activeTab === key
									? "bg-white shadow-sm text-gray-900"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							{label}
							{count > 0 && (
								<span
									className={`text-xs px-1.5 py-0.5 rounded-full ${
										activeTab === key ? "bg-sky-100 text-sky-700" : "bg-gray-200 text-gray-500"
									}`}
								>
									{count}
								</span>
							)}
						</button>
					))}
				</div>

				{/* ════════════ BARRE RECHERCHE + FILTRES (onglet list) ════════════ */}
				{activeTab === "list" && (
					<div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
						<div className="flex flex-col sm:flex-row gap-3">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Rechercher (nom, email, destination…)"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
								/>
							</div>

							{/* Filtre rapide par date → GET /rendezvous/by-date/:date */}
							<input
								type="date"
								onChange={(e) => handleDateQuickFilter(e.target.value)}
								title="Filtrer par date exacte"
								className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
							/>

							<button
								onClick={() => setShowFilters(!showFilters)}
								className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
									activeFiltersCount > 0
										? "border-sky-400 bg-sky-50 text-sky-700"
										: "border-gray-300 hover:bg-gray-50 text-gray-700"
								}`}
							>
								<Filter className="w-4 h-4" />
								Filtres
								{activeFiltersCount > 0 && (
									<span className="bg-sky-600 text-white text-xs px-1.5 py-0.5 rounded-full">
										{activeFiltersCount}
									</span>
								)}
							</button>

							{activeFiltersCount > 0 && (
								<button
									onClick={handleResetFilters}
									className="flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
								>
									<X className="w-4 h-4" /> Effacer
								</button>
							)}
						</div>

						{/* Filtres avancés → setFilters → GET /admin/rendezvous/all */}
						{showFilters && (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
								{/* Statut */}
								<div className="relative">
									<select
										value={
											(filters.status as RendezvousStatus[] | RendezvousStatus | undefined)
												? Array.isArray(filters.status)
													? (filters.status[0] ?? "")
													: filters.status
												: ""
										}
										onChange={(e) =>
											setFilters({
												...filters,
												status: e.target.value
													? (e.target.value as RendezvousStatus)
													: undefined,
											})
										}
										className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-sky-500"
									>
										<option value="">Tous les statuts</option>
										{Object.entries(STATUS_CFG).map(([val, cfg]) => (
											<option key={val} value={val}>
												{cfg.label}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
								</div>

								{/* Destination */}
								<div className="relative">
									<select
										value={filters.destinations?.[0] ?? ""}
										onChange={(e) =>
											setFilters({
												...filters,
												destinations: e.target.value ? [e.target.value] : undefined,
											})
										}
										className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-sky-500"
									>
										<option value="">Toutes destinations</option>
										{DESTINATION_OPTIONS.map((dest) => (
											<option key={dest} value={dest}>
												{dest}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
								</div>

								{/* Date début */}
								<input
									type="date"
									value={filters.dateRange?.start ?? ""}
									onChange={(e) =>
										setFilters({
											...filters,
											dateRange: {
												start: e.target.value,
												end: filters.dateRange?.end ?? "",
											},
										})
									}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
								/>

								{/* Date fin */}
								<input
									type="date"
									value={filters.dateRange?.end ?? ""}
									onChange={(e) =>
										setFilters({
											...filters,
											dateRange: {
												start: filters.dateRange?.start ?? "",
												end: e.target.value,
											},
										})
									}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
								/>
							</div>
						)}
					</div>
				)}

				{/* ════════════ PANEL AUJOURD'HUI — GET /rendezvous/by-date/:date ════════════ */}
				{activeTab === "today" && (
					<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
						<div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
							<h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
								<CalendarDays className="w-4 h-4 text-sky-500" /> Rendez-vous du jour
							</h2>
							<button
								onClick={loadTodayPanel}
								disabled={loadingPanel}
								className="text-xs text-sky-600 hover:underline flex items-center gap-1"
							>
								<RefreshCw className={`w-3 h-3 ${loadingPanel ? "animate-spin" : ""}`} />
								Actualiser
							</button>
						</div>
						{loadingPanel ? (
							<div className="flex justify-center py-10">
								<RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
							</div>
						) : todayList.length === 0 ? (
							<div className="text-center py-10 text-gray-400 text-sm">Aucun rendez-vous aujourd'hui</div>
						) : (
							<div className="divide-y divide-gray-50">
								{todayList.map((rdv) => (
									<PanelRow
										key={rdv.id}
										rdv={rdv}
										statusBadge={statusBadge}
										initials={initials}
										onView={() => openModal("detail", rdv)}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* ════════════ PANEL À VENIR — GET /admin/rendezvous/all (CONFIRMED + future) ════════════ */}
				{activeTab === "upcoming" && (
					<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
						<div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
							<h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-indigo-500" /> Prochains rendez-vous confirmés
							</h2>
							<button
								onClick={() => loadUpcomingPanel(20)}
								disabled={loadingPanel}
								className="text-xs text-indigo-600 hover:underline"
							>
								Voir les 20 prochains
							</button>
						</div>
						{loadingPanel ? (
							<div className="flex justify-center py-10">
								<RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
							</div>
						) : upcomingList.length === 0 ? (
							<div className="text-center py-10 text-gray-400 text-sm">Aucun rendez-vous à venir</div>
						) : (
							<div className="divide-y divide-gray-50">
								{upcomingList.map((rdv) => (
									<PanelRow
										key={rdv.id}
										rdv={rdv}
										statusBadge={statusBadge}
										initials={initials}
										onView={() => openModal("detail", rdv)}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* ════════════ LISTE PRINCIPALE — GET /admin/rendezvous/all ════════════ */}
				{activeTab === "list" && (
					<>
						{loading.list ? (
							<div className="flex justify-center py-16">
								<RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
							</div>
						) : rendezvous.length === 0 ? (
							<div className="text-center py-16 bg-white rounded-xl border border-gray-200">
								<Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
								<p className="text-gray-500 font-medium">Aucun rendez-vous</p>
								<p className="text-gray-400 text-sm mt-1">
									{activeFiltersCount > 0 ? "Essayez d'autres critères" : "Aucune donnée disponible"}
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{rendezvous.map((rdv) => (
									<div
										key={rdv.id}
										className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
									>
										<div className="p-4 sm:p-5">
											<div className="flex items-start gap-3">
												<div className="w-10 h-10 bg-linear-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
													{initials(rdv.fullName)}
												</div>

												<div className="flex-1 min-w-0">
													<div className="flex flex-wrap items-start justify-between gap-2 mb-2">
														<div>
															<p className="font-semibold text-gray-900">
																{rdv.fullName}
															</p>
															<div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
																<span className="flex items-center gap-1">
																	<Mail className="w-3 h-3" />
																	{rdv.email}
																</span>
																<span className="flex items-center gap-1">
																	<Phone className="w-3 h-3" />
																	{rdv.telephone}
																</span>
															</div>
														</div>
														<div className="flex flex-wrap gap-2">
															{statusBadge(rdv.status)}
															{rdv.avisAdmin && (
																<span
																	className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
																		rdv.avisAdmin === AdminOpinion.FAVORABLE
																			? "bg-emerald-50 text-emerald-700 border-emerald-200"
																			: "bg-red-50 text-red-700 border-red-200"
																	}`}
																>
																	{rdv.avisAdmin === AdminOpinion.FAVORABLE ? (
																		<ThumbsUp className="w-3 h-3" />
																	) : (
																		<ThumbsDown className="w-3 h-3" />
																	)}
																	{rdv.avisAdmin}
																</span>
															)}
														</div>
													</div>

													<div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
														<span className="flex items-center gap-1">
															<MapPin className="w-3.5 h-3.5 text-gray-400" />
															{rdv.effectiveDestination}
														</span>
														<span className="flex items-center gap-1">
															<GraduationCap className="w-3.5 h-3.5 text-gray-400" />
															{rdv.effectiveNiveauEtude} · {rdv.effectiveFiliere}
														</span>
														<span className="flex items-center gap-1">
															<Calendar className="w-3.5 h-3.5 text-gray-400" />
															{rdv.date}
														</span>
														<span className="flex items-center gap-1">
															<Clock className="w-3.5 h-3.5 text-gray-400" />
															{formatTimeSlot(rdv.time)}
														</span>
													</div>

													{rdv.cancellationReason && (
														<p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mb-3">
															Raison d'annulation : {rdv.cancellationReason}
														</p>
													)}

													{/* Actions */}
													<div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
														{/* Détail — GET /rendezvous/:id */}
														<button
															onClick={() => openModal("detail", rdv)}
															disabled={loading.details}
															className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
														>
															{loading.details ? (
																<RefreshCw className="w-3.5 h-3.5 animate-spin" />
															) : (
																<Eye className="w-3.5 h-3.5" />
															)}
															Détails
														</button>

														{/* Modifier — PATCH /admin/rendezvous/:id/patch */}
														{rdv.canModify && (
															<button
																onClick={() => openModal("update", rdv)}
																disabled={loading.update}
																className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-sky-300 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
															>
																{loading.update ? (
																	<RefreshCw className="w-3.5 h-3.5 animate-spin" />
																) : (
																	<Edit2 className="w-3.5 h-3.5" />
																)}
																Modifier
															</button>
														)}

														{/* Terminer — PATCH /admin/rendezvous/:id/complete */}
														{rdv.status === RendezvousStatus.CONFIRMED && (
															<button
																onClick={() => openModal("complete", rdv)}
																disabled={loading.complete}
																className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
															>
																{loading.complete ? (
																	<RefreshCw className="w-3.5 h-3.5 animate-spin" />
																) : (
																	<CheckCircle className="w-3.5 h-3.5" />
																)}
																Terminer
															</button>
														)}

														{/* Annuler — PATCH /rendezvous/:id/cancel */}
														{rdv.canCancel && (
															<button
																onClick={() => openModal("cancel", rdv)}
																disabled={loading.cancel}
																className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
															>
																{loading.cancel ? (
																	<RefreshCw className="w-3.5 h-3.5 animate-spin" />
																) : (
																	<Ban className="w-3.5 h-3.5" />
																)}
																Annuler
															</button>
														)}

														{/* Supprimer — DELETE /admin/rendezvous/:id/delete */}
														<button
															onClick={() => handleDelete(rdv.id)}
															disabled={loading.delete}
															className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto disabled:opacity-50"
														>
															{loading.delete ? (
																<RefreshCw className="w-3.5 h-3.5 animate-spin" />
															) : (
																<Trash2 className="w-3.5 h-3.5" />
															)}
															Supprimer
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{/* PAGINATION */}
						{pagination.totalPages > 1 && (
							<div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm">
								<p className="text-sm text-gray-500">
									Page <span className="font-semibold text-gray-900">{pagination.page}</span> /{" "}
									{pagination.totalPages}
									<span className="ml-2 text-gray-400">· {pagination.total} rendez-vous</span>
								</p>
								<div className="flex items-center gap-1">
									<button
										onClick={() => goToPage(pagination.page - 1)}
										disabled={!pagination.hasPrevious || loading.list}
										className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
									>
										<ChevronLeft className="w-4 h-4" />
									</button>
									{Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
										const page =
											Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
										return (
											<button
												key={page}
												onClick={() => goToPage(page)}
												disabled={loading.list}
												className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
													page === pagination.page
														? "bg-sky-600 text-white"
														: "border border-gray-300 hover:bg-gray-50 text-gray-700"
												}`}
											>
												{page}
											</button>
										);
									})}
									<button
										onClick={() => goToPage(pagination.page + 1)}
										disabled={!pagination.hasNext || loading.list}
										className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
									>
										<ChevronRight className="w-4 h-4" />
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* ════════════════════════════════════
          MODAUX
      ════════════════════════════════════ */}
			{modal.type && modal.rdv && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
					<div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
						{/* MODAL DÉTAIL */}
						{modal.type === "detail" && (
							<>
								<ModalHeader title="Détails du rendez-vous" onClose={closeModal} />
								<div className="p-6 space-y-5">
									{loading.details ? (
										<div className="flex justify-center py-8">
											<RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
										</div>
									) : (
										<>
											<div className="flex items-center gap-4">
												<div className="w-14 h-14 bg-linear-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
													{initials(modal.rdv.fullName)}
												</div>
												<div>
													<p className="font-bold text-gray-900 text-lg">
														{modal.rdv.fullName}
													</p>
													<div className="mt-1.5 flex flex-wrap gap-2">
														{statusBadge(modal.rdv.status)}
														{modal.rdv.isToday && (
															<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
																Aujourd'hui
															</span>
														)}
													</div>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-3 text-sm">
												{[
													{
														Icon: Mail,
														label: "Email",
														value: modal.rdv.email,
													},
													{
														Icon: Phone,
														label: "Téléphone",
														value: modal.rdv.telephone,
													},
													{
														Icon: MapPin,
														label: "Destination",
														value: modal.rdv.effectiveDestination,
													},
													{
														Icon: GraduationCap,
														label: "Niveau",
														value: modal.rdv.effectiveNiveauEtude,
													},
													{
														Icon: GraduationCap,
														label: "Filière",
														value: modal.rdv.effectiveFiliere,
													},
													{
														Icon: Calendar,
														label: "Date",
														value: modal.rdv.date,
													},
													{
														Icon: Clock,
														label: "Heure",
														value: formatTimeSlot(modal.rdv.time),
													},
												].map(({ Icon, label, value }) => (
													<div key={label} className="bg-gray-50 rounded-xl p-3">
														<div className="flex items-center gap-2 text-gray-400 mb-1">
															<Icon className="w-3.5 h-3.5" />
															<span className="text-xs">{label}</span>
														</div>
														<p className="font-semibold text-gray-900 text-sm truncate">
															{value}
														</p>
													</div>
												))}

												{modal.rdv.avisAdmin && (
													<div
														className={`rounded-xl p-3 col-span-2 border ${
															modal.rdv.avisAdmin === AdminOpinion.FAVORABLE
																? "bg-emerald-50 border-emerald-200"
																: "bg-red-50 border-red-200"
														}`}
													>
														<div className="flex items-center gap-2 text-gray-400 mb-1">
															{modal.rdv.avisAdmin === AdminOpinion.FAVORABLE ? (
																<ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
															) : (
																<ThumbsDown className="w-3.5 h-3.5 text-red-500" />
															)}
															<span className="text-xs">Avis admin</span>
														</div>
														<p className="font-semibold text-sm">{modal.rdv.avisAdmin}</p>
													</div>
												)}

												{modal.rdv.cancellationReason && (
													<div className="bg-red-50 rounded-xl p-3 col-span-2 border border-red-100">
														<p className="text-xs text-red-400 mb-1">Raison d'annulation</p>
														<p className="text-sm text-red-700">
															{modal.rdv.cancellationReason}
														</p>
													</div>
												)}

												{modal.rdv.user && (
													<div className="bg-sky-50 rounded-xl p-3 col-span-2 border border-sky-100">
														<p className="text-xs text-sky-400 mb-1">
															Compte utilisateur lié
														</p>
														<p className="text-sm font-semibold text-sky-800">
															{modal.rdv.user.fullName}
														</p>
														<p className="text-xs text-sky-600">{modal.rdv.user.email}</p>
													</div>
												)}
											</div>

											<div className="flex gap-2 pt-1">
												{modal.rdv.status === RendezvousStatus.CONFIRMED && (
													<button
														onClick={() => {
															closeModal();
															openModal("complete", modal.rdv!);
														}}
														className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
													>
														Terminer
													</button>
												)}
												{modal.rdv.canCancel && (
													<button
														onClick={() => {
															closeModal();
															openModal("cancel", modal.rdv!);
														}}
														className="flex-1 py-2.5 border border-amber-300 text-amber-700 rounded-xl text-sm hover:bg-amber-50 transition-colors"
													>
														Annuler
													</button>
												)}
												{modal.rdv.canModify && (
													<button
														onClick={() => {
															closeModal();
															openModal("update", modal.rdv!);
														}}
														className="flex-1 py-2.5 border border-sky-300 text-sky-700 rounded-xl text-sm hover:bg-sky-50 transition-colors"
													>
														Modifier
													</button>
												)}
												<button
													onClick={closeModal}
													className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
												>
													Fermer
												</button>
											</div>
										</>
									)}
								</div>
							</>
						)}

						{/* MODAL TERMINER — PATCH /admin/rendezvous/:id/complete */}
						{modal.type === "complete" && (
							<>
								<ModalHeader title="Terminer le rendez-vous" onClose={closeModal} />
								<div className="p-6 space-y-5">
									<div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
										<span className="font-semibold text-gray-900">{modal.rdv.fullName}</span>
										<span className="mx-2 text-gray-400">·</span>
										{modal.rdv.date} à {formatTimeSlot(modal.rdv.time)}
									</div>

									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-3">
											Avis administrateur *
										</label>
										<div className="grid grid-cols-2 gap-3">
											{([AdminOpinion.FAVORABLE, AdminOpinion.UNFAVORABLE] as const).map((op) => (
												<button
													key={op}
													onClick={() => setCompleteOpinion(op)}
													className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
														completeOpinion === op
															? op === AdminOpinion.FAVORABLE
																? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
																: "border-red-400 bg-red-50 text-red-700 shadow-sm"
															: "border-gray-200 text-gray-500 hover:border-gray-300"
													}`}
												>
													{op === AdminOpinion.FAVORABLE ? (
														<>
															<ThumbsUp className="w-4 h-4" /> Favorable
														</>
													) : (
														<>
															<ThumbsDown className="w-4 h-4" /> Défavorable
														</>
													)}
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Commentaire <span className="text-gray-400 font-normal">(optionnel)</span>
										</label>
										<textarea
											value={completeComment}
											onChange={(e) => setCompleteComment(e.target.value)}
											rows={3}
											placeholder="Notes sur la consultation…"
											className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 resize-none"
										/>
									</div>

									<div className="flex gap-3">
										<button
											onClick={handleComplete}
											disabled={loading.complete}
											className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
										>
											{loading.complete ? (
												<RefreshCw className="w-4 h-4 animate-spin" />
											) : (
												<CheckCircle className="w-4 h-4" />
											)}
											Confirmer
										</button>
										<button
											onClick={closeModal}
											className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
										>
											Annuler
										</button>
									</div>
								</div>
							</>
						)}

						{/* MODAL ANNULER — PATCH /rendezvous/:id/cancel (cancelledBy: ADMIN) */}
						{modal.type === "cancel" && (
							<>
								<ModalHeader title="Annuler le rendez-vous" onClose={closeModal} />
								<div className="p-6 space-y-5">
									<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
										Cette action annulera le rendez-vous de{" "}
										<span className="font-semibold">{modal.rdv.fullName}</span>. Le client sera
										notifié de l'annulation.
									</div>

									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Raison de l'annulation *
										</label>
										<textarea
											value={cancelReason}
											onChange={(e) => setCancelReason(e.target.value)}
											rows={4}
											maxLength={500}
											placeholder="Expliquez la raison de l'annulation…"
											className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 resize-none"
										/>
										<p className="text-xs text-gray-400 text-right mt-1">
											{cancelReason.length}/500
										</p>
									</div>

									<div className="flex gap-3">
										<button
											onClick={handleCancel}
											disabled={loading.cancel || !cancelReason.trim()}
											className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
										>
											{loading.cancel ? (
												<RefreshCw className="w-4 h-4 animate-spin" />
											) : (
												<Ban className="w-4 h-4" />
											)}
											Confirmer l'annulation
										</button>
										<button
											onClick={closeModal}
											className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
										>
											Retour
										</button>
									</div>
								</div>
							</>
						)}

						{/* MODAL MODIFIER — PATCH /admin/rendezvous/:id/patch */}
						{modal.type === "update" && (
							<>
								<ModalHeader title="Modifier le rendez-vous" onClose={closeModal} />
								<div className="p-6 space-y-4">
									<div className="grid grid-cols-2 gap-3">
										{(["firstName", "lastName"] as const).map((field) => (
											<div key={field}>
												<label className="block text-xs font-semibold text-gray-600 mb-1.5">
													{field === "firstName" ? "Prénom" : "Nom"}
												</label>
												<input
													type="text"
													value={editForm[field] ?? ""}
													onChange={(e) =>
														setEditForm({
															...editForm,
															[field]: e.target.value,
														})
													}
													className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
												/>
											</div>
										))}
									</div>

									<div>
										<label className="block text-xs font-semibold text-gray-600 mb-1.5">
											Téléphone
										</label>
										<input
											type="tel"
											value={editForm.telephone ?? ""}
											onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
											className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-xs font-semibold text-gray-600 mb-1.5">
												Date
											</label>
											<input
												type="date"
												value={editForm.date ?? ""}
												onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
												className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-semibold text-gray-600 mb-1.5">
												Heure
											</label>
											<input
												type="time"
												value={editForm.time ?? ""}
												onChange={(e) =>
													setEditForm({ ...editForm, time: e.target.value as TimeSlot })
												}
												className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500"
											/>
										</div>
									</div>

									<div>
										<label className="block text-xs font-semibold text-gray-600 mb-1.5">
											Destination
										</label>
										<div className="relative">
											<select
												value={editForm.destination ?? ""}
												onChange={(e) =>
													setEditForm({
														...editForm,
														destination: e.target.value,
													})
												}
												className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-sky-500"
											>
												<option value="">Sélectionner</option>
												{DESTINATION_OPTIONS.map((dest) => (
													<option key={dest} value={dest}>
														{dest}
													</option>
												))}
											</select>
											<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
										</div>
									</div>

									<div className="flex gap-3 pt-2">
										<button
											onClick={handleUpdate}
											disabled={loading.update}
											className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
										>
											{loading.update ? (
												<RefreshCw className="w-4 h-4 animate-spin" />
											) : (
												<Edit2 className="w-4 h-4" />
											)}
											Enregistrer
										</button>
										<button
											onClick={closeModal}
											className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
										>
											Annuler
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
};

// ────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────────────────

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
	<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
		<h2 className="font-bold text-lg text-gray-900">{title}</h2>
		<button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
			<X className="w-5 h-5 text-gray-500" />
		</button>
	</div>
);

const PanelRow = ({
	rdv,
	statusBadge,
	initials,
	onView,
}: {
	rdv: Rendezvous;
	statusBadge: (s: RendezvousStatus) => JSX.Element;
	initials: (n: string) => string;
	onView: () => void;
}) => (
	<div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
		<div className="w-9 h-9 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
			{initials(rdv.fullName)}
		</div>
		<div className="flex-1 min-w-0">
			<p className="font-semibold text-sm text-gray-900 truncate">{rdv.fullName}</p>
			<p className="text-xs text-gray-500 truncate">{rdv.effectiveDestination}</p>
		</div>
		<div className="flex items-center gap-3 shrink-0">
			{statusBadge(rdv.status)}
			<div className="text-right">
				<p className="text-sm font-medium text-gray-800">{rdv.date}</p>
				<p className="text-xs text-gray-400">{formatTimeSlot(rdv.time)}</p>
			</div>
			<button
				onClick={onView}
				className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
			>
				<Eye className="w-4 h-4" />
			</button>
		</div>
	</div>
);

export default RendezvousPage;
