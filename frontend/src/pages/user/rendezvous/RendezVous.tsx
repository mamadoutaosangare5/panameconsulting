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
  AlertTriangle,
} from "lucide-react";
import { useRendezvous } from "../../../hooks/useRendezvous";
import {
  type CreateRendezvousDto,
  type TimeSlot,
  type TimeSlotWithMeta,
  type RendezvousResponseDto,
  DESTINATION_OPTIONS,
  NIVEAU_ETUDE_OPTIONS,
  FILIERE_OPTIONS,
  displayToTimeSlot,
  timeSlotToDisplay,
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
  time: TimeSlot | "";
}

// ==================== COMPOSANTS RÉUTILISABLES ====================

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  minLength?: number;
  maxLength?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error,
  icon,
  minLength,
  maxLength,
}) => (
  <div>
    <label htmlFor={name} className="mb-1 block text-xs font-medium text-gray-700">
      <span className="flex items-center gap-1">
        {icon}
        {label} {required && "*"}
      </span>
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus:ring-none hover:border-sky-400 ${
        error
          ? "border-red-300 focus:border-red-500"
          : "border-gray-300 focus:border-sky-500"
      }`}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  required?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  icon,
  placeholder = "Sélectionnez",
}) => (
  <div>
    <label htmlFor={name} className="mb-1 block text-xs font-medium text-gray-700">
      <span className="flex items-center gap-1">
        {icon}
        {label} {required && "*"}
      </span>
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

// ==================== COMPOSANT PRINCIPAL ====================

const RendezVous = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();

  // ✅ DÉLÉGATION COMPLÈTE AU HOOK
  const {
    availableDates: hookAvailableDates,
    availableSlots: hookAvailableSlots,
    loading,
    createRendezvous,
    checkAvailability,
    getAvailableSlots,
    getAvailableDates,
    error: hookError,
  } = useRendezvous({
    autoLoad: false,
  });

  const isAuthChecked = useMemo(() => isAuthenticated, [isAuthenticated]);
  const [currentStep, setCurrentStep] = useState(1);

  // État du formulaire
  const [formData, setFormData] = useState<FormData>(() => ({
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
  }));

  const [showOtherDestination, setShowOtherDestination] = useState(false);
  const [showOtherNiveau, setShowOtherNiveau] = useState(false);
  const [showOtherFiliere, setShowOtherFiliere] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [createdRendezvous, setCreatedRendezvous] = useState<RendezvousResponseDto | null>(null);

  // ✅ Utiliser les erreurs du hook
  const error = localError || hookError;

  // ✅ Utiliser les données du hook avec optimisation
  const availableDates = useMemo(
    () => hookAvailableDates.map((d) => d.date),
    [hookAvailableDates],
  );

  const availableSlots = useMemo(
    () => {
      if (!formData.date) return [];
      const slots = hookAvailableSlots.find(
        (slot) => slot.date === formData.date
      );
      return slots?.availableSlots || [];
    },
    [hookAvailableSlots, formData.date],
  );

  // ✅ Ajouter des statistiques sur les créneaux
  const slotStats = useMemo(() => {
    if (!formData.date) return { total: 0, available: 0, occupied: 0 };
    const slots = hookAvailableSlots.find(
      (slot) => slot.date === formData.date
    );
    return {
      total: slots?.totalSlots || 0,
      available: slots?.availableSlots?.length || 0,
      occupied: slots?.occupiedSlots || 0,
    };
  }, [hookAvailableSlots, formData.date]);

  // Initialisation AOS
  useEffect(() => {
    AOS.init({
      duration: 300,
      easing: "ease-in-out",
      once: true,
    });
  }, []);

  // Redirection si non authentifié
  useEffect(() => {
    if (!isLoading && !isAuthenticated && isAuthChecked) {
      navigate("/connexion");
    }
  }, [isLoading, isAuthenticated, isAuthChecked, navigate]);

  // ✅ Charger les dates disponibles via le hook
  useEffect(() => {
    const loadDates = async () => {
      try {
        await getAvailableDates();
      } catch {
        setLocalError("Impossible de charger les dates disponibles");
      }
    };
    loadDates();
  }, [getAvailableDates]);

  // ✅ Charger les créneaux quand la date change
  useEffect(() => {
    if (formData.date) {
      const loadSlots = async () => {
        try {
          await getAvailableSlots(formData.date);
        } catch {
          setLocalError("Impossible de charger les créneaux pour cette date");
        }
      };
      loadSlots();
    }
  }, [formData.date, getAvailableSlots]);

  // Gestion des changements de formulaire
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Gestion des champs "Autre"
    const handlers: Record<
      string,
      { setter: (val: boolean) => void; resetField: string }
    > = {
      destination: {
        setter: setShowOtherDestination,
        resetField: "destinationAutre",
      },
      niveauEtude: { setter: setShowOtherNiveau, resetField: "niveauEtudeAutre" },
      filiere: { setter: setShowOtherFiliere, resetField: "filiereAutre" },
    };

    if (name in handlers) {
      const handler = handlers[name];
      handler.setter(value === "Autre");
      if (value !== "Autre") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          [handler.resetField]: "",
        }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError(null);
  };

  // Validation téléphone
  const validatePhone = useCallback((phone: string): boolean => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanedPhone) && !cleanedPhone.startsWith("+0");
  }, []);

  // Vérifier si un horaire est passé
  const isTimePassed = useCallback((timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);

    if (selectedDate.toDateString() !== today.toDateString()) return false;

    const [hours, minutes] = timeStr.split(":").map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);

    return selectedTime < today;
  }, []);

  // Convertir TimeSlotWithMeta vers TimeSlot
  const convertToTimeSlot = useCallback((slot: TimeSlotWithMeta): TimeSlot => {
    const validTimeSlots: TimeSlot[] = [
      "SLOT_0900", "SLOT_0930", "SLOT_1000", "SLOT_1030", 
      "SLOT_1100", "SLOT_1130", "SLOT_1200",
      "SLOT_1400", "SLOT_1430", "SLOT_1500", 
      "SLOT_1530", "SLOT_1600", "SLOT_1630"
    ];
    
    const timeSlot = displayToTimeSlot(slot.time);
    if (validTimeSlots.includes(timeSlot)) {
      return timeSlot;
    }
    return "SLOT_0900";
  }, []);

  // Validation de chaque étape
  const isStepValid = useCallback(
    (step: number): boolean => {
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
          if (!formData.destination) return false;
          if (
            formData.destination === "Autre" &&
            !formData.destinationAutre?.trim()
          )
            return false;

          if (!formData.niveauEtude) return false;
          if (
            formData.niveauEtude === "Autre" &&
            !formData.niveauEtudeAutre?.trim()
          )
            return false;

          if (!formData.filiere) return false;
          if (formData.filiere === "Autre" && !formData.filiereAutre?.trim())
            return false;

          return true;

        case 3:
          return !!(formData.date && formData.time);

        default:
          return false;
      }
    },
    [formData, validatePhone],
  );

  // Navigation entre les étapes
  const nextStep = useCallback((): void => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      setTimeout(() => AOS.refreshHard(), 50);
    } else {
      const errors: Record<number, Record<string, string>> = {
        1: {
          name: "Veuillez remplir votre nom et prénom",
          email: "Veuillez remplir votre adresse email",
          phone: "Veuillez remplir un numéro de téléphone valide",
        },
        2: {
          destination: "Veuillez sélectionner une destination",
          destinationAutre: "Veuillez spécifier votre destination",
          niveau: "Veuillez sélectionner votre niveau d'étude",
          niveauAutre: "Veuillez spécifier votre niveau d'étude",
          filiere: "Veuillez sélectionner une filière",
          filiereAutre: "Veuillez spécifier votre filière",
        },
      };

      if (currentStep === 1) {
        if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
          setLocalError(errors[1].name);
        } else if (!formData.email?.trim()) {
          setLocalError(errors[1].email);
        } else if (
          !formData.telephone?.trim() ||
          !validatePhone(formData.telephone)
        ) {
          setLocalError(errors[1].phone);
        }
      } else if (currentStep === 2) {
        if (!formData.destination) {
          setLocalError(errors[2].destination);
        } else if (
          formData.destination === "Autre" &&
          !formData.destinationAutre?.trim()
        ) {
          setLocalError(errors[2].destinationAutre);
        } else if (!formData.niveauEtude) {
          setLocalError(errors[2].niveau);
        } else if (
          formData.niveauEtude === "Autre" &&
          !formData.niveauEtudeAutre?.trim()
        ) {
          setLocalError(errors[2].niveauAutre);
        } else if (!formData.filiere) {
          setLocalError(errors[2].filiere);
        } else if (
          formData.filiere === "Autre" &&
          !formData.filiereAutre?.trim()
        ) {
          setLocalError(errors[2].filiereAutre);
        }
      }
    }
  }, [currentStep, isStepValid, formData, validatePhone]);

  const prevStep = useCallback((): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setTimeout(() => AOS.refreshHard(), 50);
  }, []);

  // ✅ Validation finale avec vérification de disponibilité
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!isStepValid(3)) return;

    setLocalError(null);
    
    try {
      const availabilityCheck = await checkAvailability(
        formData.date,
        formData.time as TimeSlot,
      );

      if (!availabilityCheck) {
        setLocalError("Ce créneau n'est plus disponible. Veuillez en choisir un autre.");
        await getAvailableSlots(formData.date);
        setFormData((prev) => ({ ...prev, time: "" }));
        return;
      }

      if (!availabilityCheck.available) {
        setLocalError("Ce créneau n'est plus disponible. Veuillez en choisir un autre.");
        await getAvailableSlots(formData.date);
        setFormData((prev) => ({ ...prev, time: "" }));
        return;
      }

      // Structure conforme à CreateRendezvousDto
      const submitData: CreateRendezvousDto = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim(),
        destination: formData.destination.trim(),
        destinationAutre:
          formData.destination === "Autre"
            ? formData.destinationAutre?.trim()
            : undefined,
        niveauEtude: formData.niveauEtude.trim(),
        niveauEtudeAutre:
          formData.niveauEtude === "Autre"
            ? formData.niveauEtudeAutre?.trim()
            : undefined,
        filiere: formData.filiere.trim(),
        filiereAutre:
          formData.filiere === "Autre" ? formData.filiereAutre?.trim() : undefined,
        date: formData.date,
        time: formData.time as TimeSlot,
      };

      const result = await createRendezvous(submitData);
      if (result) {
        setCreatedRendezvous(result);
        setSuccess(true);
        setTimeout(() => {
          navigate("/user/mes-rendezvous");
        }, 2000);
      }
    } catch {
      // L'erreur est déjà gérée par le hook
    }
  };

  // Rendu des étapes
  const renderStep1 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <User className="text-sky-500 h-4 w-4" />
          Informations personnelles
        </span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Prénom"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          placeholder="Votre prénom"
          required
          icon={<Dock className="text-sky-500 h-3 w-3" />}
          minLength={2}
          maxLength={50}
        />

        <InputField
          label="Nom"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          placeholder="Votre nom"
          required
          icon={<Book className="text-sky-500 h-3 w-3" />}
          minLength={2}
          maxLength={50}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="exemple@email.com"
          required
          icon={<Mail className="text-sky-500 h-3 w-3" />}
          maxLength={100}
        />

        <InputField
          label="Téléphone"
          name="telephone"
          type="tel"
          value={formData.telephone}
          onChange={handleInputChange}
          placeholder="+22812345678"
          required
          icon={<Phone className="text-sky-500 h-3 w-3" />}
          error={
            formData.telephone && !validatePhone(formData.telephone)
              ? "Format: +22812345678 (8-15 chiffres)"
              : undefined
          }
          maxLength={20}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <GraduationCap className="text-sky-500 h-4 w-4" />
          Projet d'études
        </span>
      </h2>

      <div>
        <SelectField
          label="Destination"
          name="destination"
          value={formData.destination}
          onChange={handleInputChange}
          options={DESTINATION_OPTIONS}
          required
          icon={<Globe className="text-sky-500 h-3 w-3" />}
        />

        {showOtherDestination && (
          <div className="mt-3">
            <InputField
              label="Précisez votre destination"
              name="destinationAutre"
              value={formData.destinationAutre || ""}
              onChange={handleInputChange}
              placeholder="Ex: Suisse, Allemagne, Japon..."
              required
              icon={<Target className="text-sky-500 h-3 w-3" />}
              maxLength={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Obligatoire quand "Autre" est sélectionné
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <SelectField
            label="Niveau d'étude"
            name="niveauEtude"
            value={formData.niveauEtude}
            onChange={handleInputChange}
            options={NIVEAU_ETUDE_OPTIONS}
            required
            icon={<Award className="text-sky-500 h-3 w-3" />}
          />

          {showOtherNiveau && (
            <div className="mt-3">
              <InputField
                label="Précisez votre niveau"
                name="niveauEtudeAutre"
                value={formData.niveauEtudeAutre || ""}
                onChange={handleInputChange}
                placeholder="Ex: BTS, DUT, Formation professionnelle..."
                required
                icon={<Target className="text-sky-500 h-3 w-3" />}
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">
                Obligatoire quand "Autre" est sélectionné
              </p>
            </div>
          )}
        </div>

        <div>
          <SelectField
            label="Filière"
            name="filiere"
            value={formData.filiere}
            onChange={handleInputChange}
            options={FILIERE_OPTIONS}
            required
            icon={<BookOpen className="text-sky-500 h-3 w-3" />}
          />

          {showOtherFiliere && (
            <div className="mt-3">
              <InputField
                label="Précisez votre filière"
                name="filiereAutre"
                value={formData.filiereAutre || ""}
                onChange={handleInputChange}
                placeholder="Ex: Architecture, Psychologie..."
                required
                icon={<Target className="text-sky-500 h-3 w-3" />}
                maxLength={100}
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

  const renderStep3 = () => (
    <div data-aos="fade-up" className="space-y-3">
      <h2 className="text-md font-semibold text-sky-600">
        <span className="flex items-center gap-2">
          <Calendar className="text-sky-500 h-4 w-4" />
          Choix du créneau
        </span>
      </h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          <span className="flex items-center gap-1">
            <Calendar className="text-sky-500 h-3 w-3" />
            Date *
          </span>
        </label>
        {availableDates.length > 0 ? (
          <select
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-all duration-150 focus:border-sky-500 focus:outline-none focus:ring-none hover:border-sky-400"
            required
          >
            <option value="">Sélectionnez une date</option>
            {availableDates.map((date) => {
              const dateObj = new Date(date);
              const isToday = dateObj.toDateString() === new Date().toDateString();
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              
              return (
                <option key={date} value={date}>
                  {dateObj.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {isToday && " (Aujourd'hui)"}
                  {isWeekend && " (Week-end)"}
                </option>
              );
            })}
          </select>
        ) : (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-700">
              {loading.dates
                ? "Chargement des dates..."
                : "Aucune date disponible"}
            </p>
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
          
          {/* Statistiques des créneaux */}
          {slotStats.total > 0 && (
            <div className="mb-2 rounded border border-gray-200 bg-gray-50 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Disponibles:</span>
                <span className="font-medium text-sky-600">
                  {slotStats.available}/{slotStats.total}
                </span>
              </div>
            </div>
          )}
          
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const timeSlot = convertToTimeSlot(slot);
                const isSelected = formData.time === timeSlot;
                const isPassed = isTimePassed(slot.time, formData.date);
                const displayTime = timeSlotToDisplay(timeSlot);

                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() =>
                      !isPassed && !slot.isLunchBreak &&
                      setFormData((prev) => ({ ...prev, time: timeSlot }))
                    }
                    disabled={isPassed || slot.isLunchBreak || loading.slots}
                    className={`rounded px-2 py-1.5 text-xs transition-all duration-150 focus:outline-none focus:ring-none ${
                      isSelected
                        ? "bg-sky-600 text-white"
                        : slot.isLunchBreak
                          ? "cursor-not-allowed bg-orange-100 text-orange-400 border border-orange-200"
                          : isPassed
                            ? "cursor-not-allowed bg-gray-100 text-gray-400"
                            : "border border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    <span className="block">{displayTime}</span>
                    {slot.isLunchBreak && (
                      <span className="inline-flex items-center justify-center">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">
                {loading.slots
                  ? "Chargement des créneaux..."
                  : "Aucun créneau disponible pour cette date"}
              </p>
            </div>
          )}

          {/* Informations sur le créneau sélectionné */}
          {formData.time && (
            <div className="mt-3 space-y-2">
              <div className="rounded bg-sky-50 p-3">
                <p className="text-xs text-sky-700">
                  <span className="font-medium">Créneau sélectionné :</span>{" "}
                  {new Date(formData.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  à {timeSlotToDisplay(formData.time as TimeSlot)}
                </p>
              </div>
              
              {/* Avertissement si le créneau est très proche */}
              {(() => {
                const now = new Date();
                const rdvTime = new Date(`${formData.date}T${timeSlotToDisplay(formData.time as TimeSlot)}:00`);
                const timeDiff = rdvTime.getTime() - now.getTime();
                const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
                
                if (hoursUntil < 2 && hoursUntil > 0) {
                  return (
                    <div className="rounded bg-amber-50 border border-amber-200 p-2">
                      <p className="text-xs text-amber-700">
                        ⚠️ Ce créneau est très proche (dans {hoursUntil} heure{hoursUntil > 1 ? "s" : ""})
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
          />
        </div>
      </div>
    </div>
  );

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
      {createdRendezvous && (
        <div className="mb-4 rounded bg-sky-50 p-3 text-left">
          <p className="text-xs text-sky-700">
            <span className="font-medium">Résumé :</span><br />
            {createdRendezvous.fullName}<br />
            {new Date(createdRendezvous.date).toLocaleDateString("fr-FR")} à {timeSlotToDisplay(createdRendezvous.time)}
          </p>
        </div>
      )}
      <div className="animate-pulse">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
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

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button
                  onClick={() => setLocalError(null)}
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
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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