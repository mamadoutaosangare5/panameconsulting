import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RendezvousStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const Holidays = require('date-holidays');

interface HolidayItem {
  date: string;
  name: string;
  type: string;
}

interface HolidaysInstance {
  getHolidays(year: number): HolidayItem[];
}

type HolidaysConstructor = new (country?: string) => HolidaysInstance;

export interface TimeSlot {
  time: string;
  available: boolean;
  isPast?: boolean;
  isLunchBreak?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface HolidayInfo {
  date: string;
  name: string;
  type: string;
}

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);
  private holidays: HolidaysInstance | null;
  private cachedHolidays = new Map<string, HolidayInfo[]>();

  // Constantes de configuration
  private readonly MAX_SLOTS_PER_DAY = 24;
  private readonly LUNCH_BREAK = { start: 12.5, end: 14 }; // Pause déjeuner 12:30-14:00

  // Jours fériés fixes Mali
  private readonly FIXED_HOLIDAYS = [
    { date: '01-01', name: 'Nouvel An' },
    { date: '01-20', name: "Fête de l'Armée" },
    { date: '03-26', name: 'Journée des Martyrs' },
    { date: '05-01', name: 'Fête du Travail' },
    { date: '05-25', name: "Journée de l'Afrique" },
    { date: '09-22', name: "Fête de l'Indépendance" },
    { date: '12-25', name: 'Noël' },
  ];

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private prisma: PrismaService,
  ) {
    this.initializeHolidays();
  }

  /**
   * Initialise la bibliothèque date-holidays pour le Mali
   */
  private initializeHolidays(): void {
    try {
      this.holidays = new (Holidays as HolidaysConstructor)('ML');
      const holidaysList = this.holidays.getHolidays(new Date().getFullYear());
      this.logger.log(
        `Bibliothèque date-holidays initialisée pour le Mali avec succès.\n` +
          `Nombre de jours fériés: ${holidaysList?.length || 0}`,
      );
    } catch (error) {
      this.logger.error(
        "Erreur d'initialisation de date-holidays",
        (error as Error).stack,
      );
      this.holidays = null;
    }
  }

  /**
   * Récupère les jours fériés pour une année donnée avec cache
   */
  public getHolidaysForYear(year: number): HolidayInfo[] {
    const cacheKey = year.toString();

    if (this.cachedHolidays.has(cacheKey)) {
      return this.cachedHolidays.get(cacheKey);
    }

    const holidays: HolidayInfo[] = [];

    try {
      // Ajouter les jours fériés mobiles via date-holidays
      if (this.holidays) {
        const holidaysList = this.holidays.getHolidays(year);

        if (holidaysList && Array.isArray(holidaysList)) {
          holidays.push(
            ...holidaysList
              .filter((holiday) => holiday.type === 'public')
              .map((holiday) => {
                const date = new Date(holiday.date);
                return {
                  date: date.toISOString().split('T')[0],
                  name: holiday.name,
                  type: 'mobile',
                };
              }),
          );
        }
      }

      // Ajouter les jours fériés fixes
      this.FIXED_HOLIDAYS.forEach((fixed) => {
        const dateStr = `${year}-${fixed.date}`;
        if (!holidays.some((h) => h.date === dateStr)) {
          holidays.push({
            date: dateStr,
            name: fixed.name,
            type: 'fixed',
          });
        }
      });

      // Trier par date
      holidays.sort((a, b) => a.date.localeCompare(b.date));

      this.cachedHolidays.set(cacheKey, holidays);

      this.logger.log(
        `${holidays.length} jours fériés chargés pour l'année ${year}`,
      );
      return holidays;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des jours fériés pour ${year}`,
        (error as Error).stack,
      );

      // Fallback: uniquement les jours fixes
      const fallbackHolidays = this.FIXED_HOLIDAYS.map((fixed) => ({
        date: `${year}-${fixed.date}`,
        name: fixed.name,
        type: 'fixed',
      }));

      this.cachedHolidays.set(cacheKey, fallbackHolidays);
      return fallbackHolidays;
    }
  }

  /**
   * Vérifie si une date est un jour férié
   */
  public isHoliday(dateStr: string): boolean {
    try {
      const year = new Date(dateStr).getFullYear();
      const holidays = this.getHolidaysForYear(year);
      return holidays.some((h) => h.date === dateStr);
    } catch (error) {
      this.logger.error(
        'Erreur lors de la vérification du jour férié',
        (error as Error).stack,
      );
      return false;
    }
  }

  /**
   * Récupère le nom du jour férié si applicable
   */
  public getHolidayName(dateStr: string): string | null {
    try {
      const year = new Date(dateStr).getFullYear();
      const holidays = this.getHolidaysForYear(year);
      const holiday = holidays.find((h) => h.date === dateStr);
      return holiday?.name || null;
    } catch {
      return null;
    }
  }

  /**
   * Vérifie si une date est un week-end
   */
  public isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Dimanche (0) ou Samedi (6)
  }

  /**
   * Vérifie si une date est aujourd'hui
   */
  public isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  /**
   * Vérifie si un créneau horaire est passé
   */
  public isPastTimeSlot(dateStr: string, timeStr: string): boolean {
    const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return slotDateTime < new Date();
  }

  /**
   * Vérifie si une date est disponible (pas week-end, pas jour férié)
   */
  public isDateAvailable(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateStr = dateObj.toISOString().split('T')[0];
    return !this.isWeekend(dateObj) && !this.isHoliday(dateStr);
  }

  /**
   * Génère tous les créneaux horaires possibles
   * Exclut automatiquement les créneaux de pause déjeuner (12:30-14:00)
   */
  public generateAllTimeSlots(): string[] {
    const slots: string[] = [];
    for (let hour = 9; hour <= 16; hour++) {
      // Exclure les créneaux pendant la pause déjeuner (12:30-14:00)
      if (hour < this.LUNCH_BREAK.start || hour >= this.LUNCH_BREAK.end) {
        // Ajouter le créneau :00
        slots.push(`${hour.toString().padStart(2, '0')}:00`);

        // Ajouter le créneau :30 (sauf pour 16h car fin à 16:30)
        if (hour < 16) {
          // Pas de 16:30 car fin à 16:30
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    return slots;
  }

  /**
   * Récupère les créneaux occupés depuis la base de données
   */
  public async getOccupiedSlotsFromDB(
    dateStr: string,
    excludeId?: string,
  ): Promise<string[]> {
    const rendezvous = await this.prisma.rendezvous.findMany({
      where: {
        date: dateStr,
        status: {
          not: RendezvousStatus.CANCELLED,
        },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { time: true },
    });

    return rendezvous.map((rdv) => rdv.time as string);
  }

  /**
   * Génère les créneaux horaires disponibles avec métadonnées
   */
  public async getAvailableTimeSlotsWithMetadata(
    date: Date,
    excludeId?: string,
  ): Promise<TimeSlot[]> {
    if (!this.isDateAvailable(date)) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const allSlots = this.generateAllTimeSlots();

    // Récupérer les créneaux occupés depuis la base
    const occupiedSlots = await this.getOccupiedSlotsFromDB(dateStr, excludeId);

    const isToday = this.isToday(dateStr);

    return allSlots.map((time) => {
      const isPast = isToday && this.isPastTimeSlot(dateStr, time);
      const isLunchBreak = this.isLunchBreakTime(time);

      return {
        time,
        available: !occupiedSlots.includes(time) && !isPast && !isLunchBreak,
        isPast,
        isLunchBreak,
      };
    });
  }

  /**
   * Génère les créneaux horaires disponibles (simple liste)
   */
  public async getAvailableTimeSlots(
    date: Date,
    existingRendezvous?: { time: string }[],
  ): Promise<string[]> {
    if (!existingRendezvous) {
      // Si pas de liste existante, utiliser la méthode avec base de données
      const slotsWithMetadata =
        await this.getAvailableTimeSlotsWithMetadata(date);
      return slotsWithMetadata
        .filter((slot) => slot.available)
        .map((slot) => slot.time);
    }

    // Utiliser la liste existante pour compatibilité
    const dateStr = date.toISOString().split('T')[0];
    const allSlots = this.generateAllTimeSlots();

    const takenTimeSlots = existingRendezvous.map((rdv) => rdv.time);
    const isToday = this.isToday(dateStr);

    return allSlots.filter((slot) => {
      const isTaken = takenTimeSlots.includes(slot);
      const isPast = isToday && this.isPastTimeSlot(dateStr, slot);
      return !isTaken && !isPast;
    });
  }

  /**
   * Vérifie si l'heure est pendant la pause déjeuner
   */
  private isLunchBreakTime(time: string): boolean {
    const [hours] = time.split(':').map(Number);
    return hours >= this.LUNCH_BREAK.start && hours < this.LUNCH_BREAK.end;
  }

  /**
   * Génère les dates disponibles pour une période donnée
   */
  public async getAvailableDates(
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const availableDates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (this.isDateAvailable(currentDate)) {
        // Vérifier le nombre de rendez-vous pour cette date
        const count = await this.prisma.rendezvous.count({
          where: {
            date: dateStr,
            status: {
              not: RendezvousStatus.CANCELLED,
            },
          },
        });

        if (count < this.MAX_SLOTS_PER_DAY) {
          availableDates.push(dateStr);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableDates;
  }

  /**
   * Récupère la liste des jours fériés pour l'année courante
   */
  public getCurrentYearHolidays(): HolidayInfo[] {
    return this.getHolidaysForYear(new Date().getFullYear());
  }

  /**
   * Vérifie si un rendez-vous peut être annulé (2h minimum avant)
   */
  public canBeCancelled(rendezvousDate: Date, rendezvousTime: string): boolean {
    const rendezvousDateTime = new Date(
      `${this.formatDate(rendezvousDate)}T${rendezvousTime}:00`,
    );
    const hoursDifference =
      (rendezvousDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    return hoursDifference > 2; // Au moins 2h avant
  }

  /**
   * Formate une date au format YYYY-MM-DD
   */
  public formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse une date au format YYYY-MM-DD
   */
  public parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Récupère le jour de la semaine en français
   */
  public getDayOfWeek(date: Date): string {
    const days = [
      'dimanche',
      'lundi',
      'mardi',
      'mercredi',
      'jeudi',
      'vendredi',
      'samedi',
    ];
    return days[date.getDay()];
  }
}
