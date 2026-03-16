import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { useAuth } from "../../../hooks/useAuth";
import {
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Globe,
  Target,
  Award,
  Clock,
  CheckCircle,
  GraduationCap,
  Book,
  Dock,
} from "lucide-react";
import { useRendezvous } from "../../../hooks/useRendezvous";
import {
  type CreateRendezvousData,
  type AvailableDate,
  type TimeSlot,
  DESTINATION_OPTIONS,
  NIVEAU_ETUDE_OPTIONS,
  FILIERE_OPTIONS,
} from "../../../types/rendezvous.types";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  niveauEtudeAutre?: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
}

const RendezVous = () => {
  // ✅ TOUS les hooks doivent être appelés au début, dans le même ordre
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();

  // ✅ Utiliser useMemo pour isAuthChecked aussi
  const isAuthChecked = useMemo(() => isAuthenticated, [isAuthenticated]);
  const [currentStep, setCurrentStep] = useState(1);
  
  // ✅ Garder un état séparé pour les modifications du formulaire
  const [formData, setFormData] = useState<FormData>(() => ({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    destination: "",
    destinationAutre: "",
    niveauEtude: "",
    niveauEtudeAutre: "",
    filiere: "",
    filiereAutre: "",
    date: "",
    time: "",
  }));
  
  // ✅ Utiliser useMemo pour calculer les données initiales basées sur user
  const initialFormData = useMemo<FormData>(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    telephone: user?.telephone || "",
    destination: "",
    destinationAutre: "",
    niveauEtude: "",
    niveauEtudeAutre: "",
    filiere: "",
    filiereAutre: "",
    date: "",
    time: "",
  }), [user?.firstName, user?.lastName, user?.email, user?.telephone]);
  
  // ✅ Réinitialiser le formulaire quand les données utilisateur changent
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [showOtherDestination, setShowOtherDestination] = useState(false);
  const [showOtherNiveau, setShowOtherNiveau] = useState(false);
  const [showOtherFiliere, setShowOtherFiliere] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook useRendezvous
  const {
    createRendezvous,
    checkAvailability,
    getAvailableSlotsList,
    getAvailableDates,
    loading,
  } = useRendezvous({
    autoLoad: false,
  });

  // ✅ TOUS les useEffect doivent être appelés après les états
  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isAuthChecked) {
      navigate("/connexion");
    }
  }, [isLoading, isAuthenticated, isAuthChecked, navigate]);

  // ✅ Calculs et callbacks
  const fetchAvailableDates = useCallback(async (): Promise<void> => {
    try {
      const dates: AvailableDate[] = await getAvailableDates();
      const dateStrings = dates
        .filter((d) => d.hasSlots)
        .map((d) => d.date);
      setAvailableDates(dateStrings);
    } catch (err) {
      console.error("Erreur lors du chargement des dates:", err);
    }
  }, [getAvailableDates]);

  const fetchAvailableSlots = useCallback(
    async (date: string): Promise<void> => {
      try {
        const slots: TimeSlot[] = await getAvailableSlotsList(date);
        // ✅ TimeSlot[] est déjà un tableau de strings, pas besoin de .time
        setAvailableSlots(slots);
      } catch (err) {
        console.error("Erreur lors du chargement des créneaux:", err);
      }
    },
    [getAvailableSlotsList],
  );

  // Gestion des changements de formulaire
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Gestion destination "Autre"
    if (name === "destination") {
      setShowOtherDestination(value === "Autre");
      if (value !== "Autre") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          destinationAutre: "", // ✅ Nettoie le champ "Autre"
        }));
        return;
      }
    }

    // Gestion niveau d'étude "Autre"
    if (name === "niveauEtude") {
      setShowOtherNiveau(value === "Autre");
      if (value !== "Autre") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          niveauEtudeAutre: "", // ✅ Nettoie le champ "Autre"
        }));
        return;
      }
    }

    // Gestion filière "Autre"
    if (name === "filiere") {
      setShowOtherFiliere(value === "Autre");
      if (value !== "Autre") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          filiereAutre: "", // ✅ Nettoie le champ "Autre"
        }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Effacer l'erreur lorsque l'utilisateur modifie un champ
    if (error) {
      setError(null);
    }
  };

  // Validation téléphone
  const validatePhone = (phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!phoneRegex.test(cleanedPhone)) return false;
    if (cleanedPhone.startsWith("+0")) return false;

    return true;
  };

  // Vérifier si une date est passée
  const isDatePassed = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  // Vérifier si un horaire est passé
  const isTimePassed = (timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);

    if (selectedDate.toDateString() !== today.toDateString()) return false;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    return selectedTime < today;
  };

  // Validation de chaque étape
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName?.trim() &&
          formData.lastName?.trim() &&
          formData.email?.trim() &&
          formData.telephone?.trim() &&
          validatePhone(formData.telephone)
        );

      case 2:
        // Validation destination
        if (!formData.destination) return false;
        if (
          formData.destination === "Autre" &&
          !formData.destinationAutre?.trim()
        )
          return false;

        // ✅ Validation niveau d'étude
        if (!formData.niveauEtude) return false;
        if (
          formData.niveauEtude === "Autre" &&
          !formData.niveauEtudeAutre?.trim()
        )
          return false;

        // Validation filière
        if (!formData.filiere) return false;
        if (formData.filiere === "Autre" && !formData.filiereAutre?.trim())
          return false;

        return true;

      case 3:
        return !!(formData.date && formData.time);

      default:
        return false;
    }
  };

  // Navigation entre les étapes
  const nextStep = (): void => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      setTimeout(() => AOS.refreshHard(), 50);
    } else {
      if (currentStep === 1) {
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
          setError("Veuillez remplir votre nom et prénom");
          return;
        } else if (!formData.email?.trim()) {
          setError("Veuillez remplir votre adresse email");
          return;
        } else if (
          !formData.telephone?.trim() ||
          !validatePhone(formData.telephone)
        ) {
          setError("Veuillez remplir un numéro de téléphone valide");
          return;
        }
      } else if (currentStep === 2) {
        // Messages d'erreur pour l'étape 2
        if (!formData.destination) {
          setError("Veuillez sélectionner une destination");
          return;
        } else if (
          formData.destination === "Autre" &&
          !formData.destinationAutre?.trim()
        ) {
          setError("Veuillez spécifier votre destination");
          return;
        } else if (!formData.niveauEtude) {
          setError("Veuillez sélectionner votre niveau d'étude");
          return;
        } else if (
          formData.niveauEtude === "Autre" &&
          !formData.niveauEtudeAutre?.trim()
        ) {
          setError("Veuillez spécifier votre niveau d'étude");
          return;
        } else if (!formData.filiere) {
          setError("Veuillez sélectionner une filière");
          return;
        } else if (
          formData.filiere === "Autre" &&
          !formData.filiereAutre?.trim()
        ) {
          setError("Veuillez spécifier votre filière");
          return;
        }
      }
    }
  };

  const prevStep = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 50);
  };

  // Effets pour le chargement initial
  useEffect(() => {
    const loadData = async () => {
      await fetchAvailableDates();
    };
    loadData();
  }, [fetchAvailableDates]);

  useEffect(() => {
    if (formData.date) {
      const loadSlots = async () => {
        await fetchAvailableSlots(formData.date);
      };
      loadSlots();
    }
  }, [formData.date, fetchAvailableSlots]);

  // Utilisation directe des valeurs string (plus de mapping d'enum nécessaire)
  // Les valeurs sont envoyées directement au backend qui accepte maintenant des strings

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // VALIDATION FINALE COMPLÈTE
    if (!formData.firstName?.trim()) {
      return;
    }

    if (!formData.lastName?.trim()) {
      return;
      return;
    }

    if (!formData.email?.trim()) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return;
    }

    if (!formData.telephone?.trim()) {
      return;
    }

    if (!validatePhone(formData.telephone)) {
      return;
    }

    // ✅ Validation destination
    if (!formData.destination?.trim()) {
      return;
    }

    if (formData.destination === "Autre") {
      if (!formData.destinationAutre?.trim()) {
        return;
      }
    }

    // ✅ Validation niveau d'étude
    if (!formData.niveauEtude?.trim()) {
      return;
    }

    if (formData.niveauEtude === "Autre") {
      if (!formData.niveauEtudeAutre?.trim()) {
        return;
      }
    }

    // ✅ Validation filière
    if (!formData.filiere?.trim()) {
      return;
    }

    if (formData.filiere === "Autre") {
      if (!formData.filiereAutre?.trim()) {
        return;
      }
    }

    if (!formData.date?.trim()) {
      return;
    }

    if (!formData.time?.trim()) {
      return;
    }

    if (isDatePassed(formData.date)) {
      return;
    }

    if (
      formData.date === new Date().toISOString().split("T")[0] &&
      formData.time
    ) {
      if (isTimePassed(formData.time, formData.date)) {
        return;
      }
    }

    // Vérification rapide de disponibilité avant soumission
    const availabilityCheck = await checkAvailability(
      formData.date,
      formData.time as TimeSlot,
    );
    if (availabilityCheck && !availabilityCheck.available) {
      fetchAvailableSlots(formData.date);
      setFormData((prev) => ({ ...prev, time: "" }));
      return;
    }

    // Structure conforme à CreateRendezvousData (valeurs string directes)
    const submitData: CreateRendezvousData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      telephone: formData.telephone.trim(),
      destination: formData.destination.trim(),
      destinationAutre: formData.destinationAutre?.trim() || undefined,
      niveauEtude: formData.niveauEtude.trim(),
      niveauEtudeAutre: formData.niveauEtudeAutre?.trim() || undefined,
      filiere: formData.filiere.trim(),
      filiereAutre: formData.filiereAutre?.trim() || undefined,
      date: formData.date,
      time: formData.time as TimeSlot,
    };

    // ✅ Gestion destination "Autre"
    if (formData.destination === "Autre" && formData.destinationAutre) {
      submitData.destinationAutre = formData.destinationAutre.trim();
    }

    // ✅ Gestion niveau d'étude "Autre"
    if (formData.niveauEtude === "Autre" && formData.niveauEtudeAutre) {
      submitData.niveauEtudeAutre = formData.niveauEtudeAutre.trim();
    }

    // ✅ Gestion filière "Autre"
    if (formData.filiere === "Autre" && formData.filiereAutre) {
      submitData.filiereAutre = formData.filiereAutre.trim();
    }

    try {
      const result = await createRendezvous(submitData);

      if (result) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/user/mes-rendezvous");
        }, 2000);
      }
    } catch (error: unknown) {
      console.error("Erreur création rendez-vous:", error);
    }
  };

  // Rendu étape 1: Informations personnelles
  const renderStep1 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <User className="text-sky-500 h-4 w-4" />
          Informations personnelles
        </span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <Dock className="text-sky-500 h-3 w-3" />
              Prénom *
            </span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            placeholder="Votre prénom"
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <Book className="text-sky-500 h-3 w-3" />
              Nom *
            </span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            placeholder="Votre nom"
            required
            minLength={2}
            maxLength={50}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <Mail className="text-sky-500 h-3 w-3" />
              Email *
            </span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            placeholder="exemple@email.com"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label
            htmlFor="telephone"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <Phone className="text-sky-500 h-3 w-3" />
              Téléphone *
            </span>
          </label>
          <input
            type="tel"
            id="telephone"
            name="telephone"
            value={formData.telephone}
            onChange={handleInputChange}
            className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
              formData.telephone && !validatePhone(formData.telephone)
                ? "border-red-300 focus:border-red-500"
                : "border-gray-300 focus:border-sky-500"
            }`}
            placeholder="+22812345678"
            required
            maxLength={20}
          />
          {formData.telephone && !validatePhone(formData.telephone) && (
            <p className="mt-1 text-xs text-red-600">
              Format: +22812345678 (8-15 chiffres, ne doit pas commencer par 0)
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Rendu étape 2: Projet d'études (avec gestion complète des champs "Autre")
  const renderStep2 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <GraduationCap className="text-sky-500 h-4 w-4" />
          Projet d'études
        </span>
      </h2>

      {/* Destination */}
      <div>
        <label
          htmlFor="destination"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          <span className="flex items-center gap-1">
            <Globe className="text-sky-500 h-3 w-3" />
            Destination *
          </span>
        </label>
        <select
          id="destination"
          name="destination"
          value={formData.destination}
          onChange={handleInputChange}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
          required
        >
          <option value="">Sélectionnez une destination</option>
          {DESTINATION_OPTIONS.map((dest) => (
            <option key={dest} value={dest}>
              {dest}
            </option>
          ))}
        </select>

        {/* Champ conditionnel pour destination "Autre" */}
        {showOtherDestination && (
          <div className="mt-3">
            <label
              htmlFor="destinationAutre"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              <span className="flex items-center gap-1">
                <Target className="text-sky-500 h-3 w-3" />
                Précisez votre destination *
              </span>
            </label>
            <input
              type="text"
              id="destinationAutre"
              name="destinationAutre"
              value={formData.destinationAutre || ""}
              onChange={handleInputChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
              placeholder="Ex: Suisse, Allemagne, Japon..."
              maxLength={100}
              required={formData.destination === "Autre"}
            />
            <p className="mt-1 text-xs text-gray-500">
              Obligatoire quand "Autre" est sélectionné
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Niveau d'étude avec gestion "Autre" */}
        <div>
          <label
            htmlFor="niveauEtude"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <Award className="text-sky-500 h-3 w-3" />
              Niveau d'étude *
            </span>
          </label>
          <select
            id="niveauEtude"
            name="niveauEtude"
            value={formData.niveauEtude}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            required
          >
            <option value="">Sélectionnez votre niveau</option>
            {NIVEAU_ETUDE_OPTIONS.map((niv: string) => (
              <option key={niv} value={niv}>
                {niv}
              </option>
            ))}
          </select>

          {/* ✅ Champ conditionnel pour niveau "Autre" */}
          {showOtherNiveau && (
            <div className="mt-3">
              <label
                htmlFor="niveauEtudeAutre"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                <span className="flex items-center gap-1">
                  <Target className="text-sky-500 h-3 w-3" />
                  Précisez votre niveau *
                </span>
              </label>
              <input
                type="text"
                id="niveauEtudeAutre"
                name="niveauEtudeAutre"
                value={formData.niveauEtudeAutre || ""}
                onChange={handleInputChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
                placeholder="Ex: BTS, DUT, Formation professionnelle..."
                maxLength={100}
                required={formData.niveauEtude === "Autre"}
              />
              <p className="mt-1 text-xs text-gray-500">
                Obligatoire quand "Autre" est sélectionné
              </p>
            </div>
          )}
        </div>

        {/* Filière avec gestion "Autre" */}
        <div>
          <label
            htmlFor="filiere"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            <span className="flex items-center gap-1">
              <BookOpen className="text-sky-500 h-3 w-3" />
              Filière *
            </span>
          </label>
          <select
            id="filiere"
            name="filiere"
            value={formData.filiere}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            required
          >
            <option value="">Sélectionnez votre filière</option>
            {FILIERE_OPTIONS.map((fil: string) => (
              <option key={fil} value={fil}>
                {fil}
              </option>
            ))}
          </select>

          {/* Champ conditionnel pour filière "Autre" */}
          {showOtherFiliere && (
            <div className="mt-3">
              <label
                htmlFor="filiereAutre"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                <span className="flex items-center gap-1">
                  <Target className="text-sky-500 h-3 w-3" />
                  Précisez votre filière *
                </span>
              </label>
              <input
                type="text"
                id="filiereAutre"
                name="filiereAutre"
                value={formData.filiereAutre || ""}
                onChange={handleInputChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
                placeholder="Ex: Architecture, Psychologie..."
                maxLength={100}
                required={formData.filiere === "Autre"}
              />
              <p className="mt-1 text-xs text-gray-500">
                Obligatoire quand "Autre" est sélectionné
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Rendu étape 3: Choix du créneau
  const renderStep3 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <Calendar className="text-sky-500 h-4 w-4" />
          Choix du créneau
        </span>
      </h2>

      <div>
        <label
          htmlFor="date"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          <span className="flex items-center gap-1">
            <Calendar className="text-sky-500 h-3 w-3" />
            Date *
          </span>
        </label>
        {availableDates.length > 0 ? (
          <select
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            required
          >
            <option value="">Sélectionnez une date</option>
            {availableDates.map((date) => {
              const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              return (
                <option key={date} value={date}>
                  {formattedDate}
                </option>
              );
            })}
          </select>
        ) : (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">Aucune date disponible</p>
          </div>
        )}
      </div>

      {formData.date && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            <span className="flex items-center gap-1">
              <Clock className="text-sky-500 h-3 w-3" />
              Horaire *
            </span>
          </label>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const isSelected = formData.time === slot;
                const isPassed = isTimePassed(slot, formData.date);

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() =>
                      !isPassed &&
                      setFormData((prev) => ({ ...prev, time: slot }))
                    }
                    disabled={isPassed}
                    className={`rounded px-2 py-1.5 text-xs transition-all duration-150 focus:outline-none focus:ring-none ${
                      isSelected
                        ? "bg-sky-600 text-white"
                        : isPassed
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "border border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">
                Aucun créneau disponible pour cette date
              </p>
            </div>
          )}

          {formData.time && (
            <div className="mt-3 rounded bg-sky-50 p-3">
              <p className="text-xs text-sky-700">
                <span className="font-medium">Créneau sélectionné :</span>{" "}
                {new Date(formData.date).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                à {formData.time}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Indicateur de progression
  const renderProgressSteps = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 ${
                currentStep >= step
                  ? "bg-sky-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                currentStep >= step ? "text-sky-600" : "text-gray-400"
              }`}
            >
              {step === 1 ? "Personnel" : step === 2 ? "Projet" : "Créneau"}
            </span>
          </div>
        ))}
      </div>
      <div className="relative -mt-4">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-200">
          <div
            className="h-full bg-sky-600 transition-all duration-150"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  // Message de succès
  const renderSuccessMessage = () => (
    <div data-aos="zoom-in" className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="mb-3 text-lg font-bold text-gray-800">
        Rendez-vous confirmé !
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        Votre rendez-vous a été créé et confirmé avec succès.
        <br />
        Vous allez être redirigé vers vos rendez-vous.
      </p>
      <div className="animate-pulse">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          <span className="text-xs text-emerald-700">
            Redirection en cours...
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Prenez Rendez-Vous - Paname Consulting</title>
        <meta
          name="description"
          content="Prenez rendez-vous avec un conseiller Paname Consulting"
        />
        <link
          rel="canonical"
          href="https://panameconsulting.vercel.app/rendez-vous"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen py-6">
        <div className="mx-auto max-w-2xl px-3 sm:px-4">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-white p-2 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-sky-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Prendre un rendez-vous
            </h1>
          </div>

          {/* Affichage du message d'erreur */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-500" />
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {success ? (
            <div
              data-aos="zoom-in"
              className="overflow-hidden rounded-lg bg-white p-8 shadow-lg"
            >
              {renderSuccessMessage()}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-lg bg-white shadow-lg"
              data-aos="fade-up"
            >
              <div className="border-b border-gray-100 bg-linear-to-r from-sky-500 to-sky-600 px-6 py-4">
                <h1 className="text-xl font-bold text-white">
                  Prendre un rendez-vous
                </h1>
                <p className="mt-1 text-sm text-sky-100">
                  Complétez les informations pour planifier votre consultation
                </p>
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-8">
                {renderProgressSteps()}

                <div className="space-y-6">
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 focus:border-sky-500 focus:outline-none focus:ring-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        isStepValid(currentStep)
                          ? "bg-sky-600 text-white hover:bg-sky-700"
                          : "cursor-not-allowed bg-gray-300 text-gray-500"
                      }`}
                    >
                      Continuer
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading.create || !isStepValid(3)}
                      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none ${
                        !loading.create && isStepValid(3)
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "cursor-not-allowed bg-gray-300 text-gray-500"
                      }`}
                    >
                      {loading.create ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Traitement...
                        </>
                      ) : (
                        <>
                          Confirmer le rendez-vous
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <p className="text-center text-xs text-gray-500">
                  Tous les champs marqués d'un * sont obligatoires.
                  <br />
                  Les rendez-vous sont immédiatement confirmés après création.
                  <br />
                  Vous recevrez une confirmation par email.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default RendezVous;
