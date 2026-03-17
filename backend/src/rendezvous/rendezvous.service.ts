// rendezvous.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  RendezvousStatus,
  UserRole,
  ProcedureStatus,
  AdminOpinion,
  TimeSlot,
  Rendezvous,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RendezvousRepository } from './rendezvous.repository';
import { CreateRendezvousDto } from './dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto';
import { CurrentUser } from '../interfaces/current-user.interface';
import { MailService } from '../mail/mail.service';
import { HolidaysService } from '../holidays/holidays.service';

@Injectable()
export class RendezvousService {
  private readonly logger = new Logger(RendezvousService.name);

  /**
   * Convertit une chaîne de caractères HH:MM en TimeSlot
   */
  private convertTimeStringToTimeSlot(timeString: string): TimeSlot {
    const timeMap: Record<string, TimeSlot> = {
      '09:00': TimeSlot.SLOT_0900,
      '09:30': TimeSlot.SLOT_0930,
      '10:00': TimeSlot.SLOT_1000,
      '10:30': TimeSlot.SLOT_1030,
      '11:00': TimeSlot.SLOT_1100,
      '11:30': TimeSlot.SLOT_1130,
      '12:00': TimeSlot.SLOT_1200,
      '12:30': TimeSlot.SLOT_1230,
      '13:00': TimeSlot.SLOT_1300,
      '13:30': TimeSlot.SLOT_1330,
      '14:00': TimeSlot.SLOT_1400,
      '14:30': TimeSlot.SLOT_1430,
      '15:00': TimeSlot.SLOT_1500,
      '15:30': TimeSlot.SLOT_1530,
      '16:00': TimeSlot.SLOT_1600,
      '16:30': TimeSlot.SLOT_1630,
    };

    const timeSlot = timeMap[timeString];
    if (!timeSlot) {
      throw new BadRequestException(
        `Heure non valide: ${timeString}. Heures disponibles: ${Object.keys(timeMap).join(', ')}`,
      );
    }

    return timeSlot;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly rendezvousRepository: RendezvousRepository,
    private readonly mailService: MailService,
    private readonly holidaysService: HolidaysService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Créer un nouveau rendez-vous
   */
  async create(
    createRendezvousDto: CreateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    const step = 'POST /api/rendezvous';
    this.logger.log(`[RendezvousService] ${step} -> création rendez-vous`);

    // 1. Vérifier si le compte utilisateur est valide et actif
    await this.validateUserAccount(currentUser);

    // 2. Valider les contraintes de date et créneau
    const rendezvousDate = new Date(createRendezvousDto.date);

    // Vérifier si la date est disponible (pas week-end ni jour férié)
    if (!this.holidaysService.isDateAvailable(rendezvousDate)) {
      this.logger.warn(
        `[RendezvousService] ${step} -> date non disponible: ${createRendezvousDto.date}`,
      );
      throw new BadRequestException(
        "La date sélectionnée n'est pas disponible (week-end ou jour férié)",
      );
    }

    // Vérifier si la date est passée
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(createRendezvousDto.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      this.logger.warn(
        `[RendezvousService] ${step} -> date passée: ${createRendezvousDto.date}`,
      );
      throw new BadRequestException(
        'Vous ne pouvez pas réserver une date passée',
      );
    }

    // 3. VALIDATION DES CHAMPS "AUTRE" - COMPLÈTE ET ROBUSTE
    this.validateOtherFields(createRendezvousDto);

    // 4. Vérifier la limite de 1 rendez-vous confirmé par utilisateur
    await this.checkUserRendezvousLimit(
      currentUser.email,
      createRendezvousDto.date,
    );

    // 5. Récupérer les rendez-vous existants pour cette date
    const existingRendezvous = await this.rendezvousRepository.findAll({
      where: {
        date: createRendezvousDto.date,
        status: RendezvousStatus.CONFIRMED,
      },
    });

    this.logger.log(
      `[RendezvousService] ${step} -> rendez-vous existants pour cette date: ${existingRendezvous.length}`,
    );

    // 6. Vérifier si le créneau horaire est disponible
    const availableTimeSlots = await this.holidaysService.getAvailableTimeSlots(
      rendezvousDate,
      existingRendezvous,
    );

    // Vérification supplémentaire : s'assurer que le créneau n'est pas pendant la pause déjeuner (12:30-14h)
    const timeSlotAvailable = await this.rendezvousRepository.checkAvailability(
      createRendezvousDto.date,
      createRendezvousDto.time as TimeSlot,
    );

    this.logger.log(
      `[RendezvousService] ${step} -> créneaux disponibles: ${availableTimeSlots.length}`,
    );
    this.logger.log(
      `[RendezvousService] ${step} -> créneau demandé: ${createRendezvousDto.time}`,
    );

    if (!availableTimeSlots.includes(createRendezvousDto.time)) {
      this.logger.warn(
        `[RendezvousService] ${step} -> créneau non disponible: ${createRendezvousDto.time}`,
      );
      throw new BadRequestException('Créneau horaire non disponible');
    }

    if (!timeSlotAvailable) {
      this.logger.warn(
        `[RendezvousService] ${step} -> créneau non disponible (pause déjeuner/week-end/férié): ${createRendezvousDto.time}`,
      );
      throw new BadRequestException('Créneau horaire non disponible');
    }

    // 7. Préparer les données pour Prisma
    const data: Prisma.RendezvousCreateInput = {
      firstName: createRendezvousDto.firstName,
      lastName: createRendezvousDto.lastName,
      email: createRendezvousDto.email,
      telephone: createRendezvousDto.telephone,
      destination:
        createRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.destinationAutre?.trim() || ''
          : createRendezvousDto.destination?.trim() || '',
      destinationAutre:
        createRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.destinationAutre?.trim()
          : null,
      niveauEtude:
        createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.niveauEtudeAutre?.trim() || ''
          : createRendezvousDto.niveauEtude?.trim() || '',
      niveauEtudeAutre:
        createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.niveauEtudeAutre?.trim()
          : null,
      filiere:
        createRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.filiereAutre?.trim() || ''
          : createRendezvousDto.filiere?.trim() || '',
      filiereAutre:
        createRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? createRendezvousDto.filiereAutre?.trim()
          : null,
      date: createRendezvousDto.date,
      time: this.convertTimeStringToTimeSlot(createRendezvousDto.time),
      status: RendezvousStatus.CONFIRMED,
      user: {
        connect: { id: currentUser.id },
      },
    };

    // Log avec données masquées
    const maskedData = this.maskSensitiveData(data);
    this.logger.log(
      `[RendezvousService] ${step} -> création rendez-vous avec données: ${JSON.stringify(maskedData)}`,
    );

    try {
      const rendezvous = await this.rendezvousRepository.create(data);
      this.logger.log(
        `[RendezvousService] ${step} -> 201: rendez-vous créé avec ID: ${rendezvous.id}`,
      );
      return rendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousService] ${step} -> 500: erreur création: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Validation complète de tous les champs "Autre"
   */
  private validateOtherFields(createRendezvousDto: CreateRendezvousDto): void {
    const step = 'POST /api/rendezvous';

    // ===== VALIDATION DESTINATION =====
    if (createRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.destinationAutre ||
        createRendezvousDto.destinationAutre.trim() === ''
      ) {
        this.logger.warn(
          `[RendezvousService] ${step} -> validation échouée: destination = "Autre" sans précision`,
        );
        throw new BadRequestException(
          'La destination "Autre" nécessite une précision',
        );
      }

      const trimmedDest = createRendezvousDto.destinationAutre.trim();
      if (trimmedDest.length < 2) {
        throw new BadRequestException(
          'La destination personnalisée doit contenir au moins 2 caractères',
        );
      }
      if (trimmedDest.length > 100) {
        throw new BadRequestException(
          'La destination personnalisée ne peut pas dépasser 100 caractères',
        );
      }

      this.logger.log(
        `[RendezvousService] ${step} -> destination "Autre" validée: ${this.maskValue(trimmedDest)}`,
      );
    }

    // ===== VALIDATION FILIÈRE =====
    if (createRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.filiereAutre ||
        createRendezvousDto.filiereAutre.trim() === ''
      ) {
        this.logger.warn(
          `[RendezvousService] ${step} -> validation échouée: filière = "Autre" sans précision`,
        );
        throw new BadRequestException(
          'La filière "Autre" nécessite une précision',
        );
      }

      const trimmedFiliere = createRendezvousDto.filiereAutre.trim();
      if (trimmedFiliere.length < 2) {
        throw new BadRequestException(
          'La filière personnalisée doit contenir au moins 2 caractères',
        );
      }
      if (trimmedFiliere.length > 100) {
        throw new BadRequestException(
          'La filière personnalisée ne peut pas dépasser 100 caractères',
        );
      }

      this.logger.log(
        `[RendezvousService] ${step} -> filière "Autre" validée: ${this.maskValue(trimmedFiliere)}`,
      );
    }

    // ===== VALIDATION NIVEAU D'ÉTUDE =====
    if (createRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
      if (
        !createRendezvousDto.niveauEtudeAutre ||
        createRendezvousDto.niveauEtudeAutre.trim() === ''
      ) {
        this.logger.warn(
          `[RendezvousService] ${step} -> validation échouée: niveau d'étude = "Autre" sans précision`,
        );
        throw new BadRequestException(
          'Le niveau d\'étude "Autre" nécessite une précision',
        );
      }

      const trimmedNiveau = createRendezvousDto.niveauEtudeAutre.trim();
      if (trimmedNiveau.length < 2) {
        throw new BadRequestException(
          "Le niveau d'étude personnalisé doit contenir au moins 2 caractères",
        );
      }
      if (trimmedNiveau.length > 100) {
        throw new BadRequestException(
          "Le niveau d'étude personnalisé ne peut pas dépasser 100 caractères",
        );
      }

      this.logger.log(
        `[RendezvousService] ${step} -> niveau d'étude "Autre" validé: ${this.maskValue(trimmedNiveau)}`,
      );
    }

    this.logger.log(
      `[RendezvousService] ${step} -> validation des champs "Autre" réussie`,
    );
  }

  /**
   * Valider que le compte utilisateur est actif et valide
   */
  private async validateUserAccount(currentUser: CurrentUser): Promise<void> {
    const step = 'POST /api/rendezvous';

    const user = await this.prisma.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      this.logger.warn(
        `[RendezvousService] ${step} -> compte non trouvé: ${this.maskEmail(currentUser.email)}`,
      );
      throw new BadRequestException('Compte utilisateur non trouvé');
    }

    if (!user.isActive) {
      this.logger.warn(
        `[RendezvousService] ${step} -> compte désactivé: ${this.maskEmail(currentUser.email)}`,
      );
      throw new BadRequestException(
        "Votre compte est désactivé. Veuillez contacter l'administration",
      );
    }

    if (user.isDeleted) {
      this.logger.warn(
        `[RendezvousService] ${step} -> compte supprimé: ${this.maskEmail(currentUser.email)}`,
      );
      throw new BadRequestException('Ce compte a été supprimé');
    }

    this.logger.log(
      `[RendezvousService] ${step} -> compte validé: ${this.maskEmail(currentUser.email)}`,
    );
  }

  /**
   * Vérifier la limite de 1 rendez-vous confirmé par utilisateur par jour
   */
  private async checkUserRendezvousLimit(
    userEmail: string,
    date: string,
  ): Promise<void> {
    const step = 'POST /api/rendezvous';

    const existingCount = await this.prisma.rendezvous.count({
      where: {
        email: userEmail,
        date: date,
        status: {
          in: [RendezvousStatus.CONFIRMED, RendezvousStatus.PENDING],
        },
      },
    });

    if (existingCount >= 1) {
      this.logger.warn(
        `[RendezvousService] ${step} -> utilisateur a déjà un rendez-vous: ${this.maskEmail(userEmail)}`,
      );
      throw new BadRequestException(
        'Vous avez déjà un rendez-vous confirmé pour cette date. La limite est de 1 rendez-vous par jour.',
      );
    }

    this.logger.log(
      `[RendezvousService] ${step} -> limite vérifiée: ${this.maskEmail(userEmail)}`,
    );
  }

  /**
   * Récupérer tous les rendez-vous avec pagination
   */
  async findAll(
    currentUser: CurrentUser,
    filters?: {
      status?: RendezvousStatus;
      date?: Date;
      email?: string;
      destination?: string;
      filiere?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      hasAvis?: boolean;
      hasProcedure?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const step = 'GET /api/admin/rendezvous/all';
    this.logger.log(`[RendezvousService] ${step} -> recherche de rendez-vous`);

    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
      this.logger.log(
        `[RendezvousService] ${step} -> filtre par utilisateur: ${this.maskEmail(currentUser.email)}`,
      );
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.date) where.date = filters.date.toISOString().split('T')[0];
    if (filters?.email && currentUser.role === UserRole.ADMIN) {
      where.email = filters.email;
      this.logger.log(
        `[RendezvousService] ${step} -> filtre par email: ${this.maskEmail(filters.email)}`,
      );
    }
    if (filters?.destination) where.destination = filters.destination;
    if (filters?.filiere) where.filiere = filters.filiere;

    // Date range
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) {
        where.date.gte = filters.startDate.toISOString().split('T')[0];
      }
      if (filters?.endDate) {
        where.date.lte = filters.endDate.toISOString().split('T')[0];
      }
    }

    // Search in multiple fields
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { telephone: { contains: filters.search, mode: 'insensitive' } },
      ];
      this.logger.log(
        `[RendezvousService] ${step} -> recherche: ${filters.search}`,
      );
    }

    // Has admin opinion
    if (filters?.hasAvis !== undefined) {
      where.avisAdmin = filters.hasAvis ? { not: null } : null;
    }

    // Has procedure
    if (filters?.hasProcedure !== undefined) {
      where.procedures = filters.hasProcedure ? { some: {} } : { none: {} };
    }

    // Order by
    const orderBy: Prisma.RendezvousOrderByWithRelationInput = {};
    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'desc';

    if (sortBy === 'date') {
      orderBy.date = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'destination') {
      orderBy.destination = sortOrder;
    } else {
      orderBy.date = sortOrder;
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.rendezvousRepository.count(where);
    this.logger.log(`[RendezvousService] ${step} -> total trouvé: ${total}`);

    // Get paginated results
    const data = await this.rendezvousRepository.findAll({
      where,
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    this.logger.log(
      `[RendezvousService] ${step} -> 200: ${data.length} rendez-vous retournés (page ${page}/${totalPages})`,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Récupérer un rendez-vous par son ID
   */
  async findById(id: string, currentUser: CurrentUser) {
    const step = `GET /api/rendezvous/${id}`;
    this.logger.log(`[RendezvousService] ${step} -> recherche rendez-vous`);

    const rendezvous = await this.rendezvousRepository.findById(id);

    if (!rendezvous) {
      this.logger.warn(
        `[RendezvousService] ${step} -> 404: rendez-vous non trouvé`,
      );
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    if (
      currentUser.role !== UserRole.ADMIN &&
      rendezvous.email !== currentUser.email
    ) {
      this.logger.warn(
        `[RendezvousService] ${step} -> 403: accès non autorisé`,
      );
      throw new ForbiddenException('Accès non autorisé à ce rendez-vous');
    }

    this.logger.log(
      `[RendezvousService] ${step} -> 200: rendez-vous trouvé pour ${this.maskEmail(rendezvous.email)}`,
    );
    return rendezvous;
  }

  /**
   * Mettre à jour un rendez-vous
   */
  async update(
    id: string,
    updateRendezvousDto: UpdateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    const step = `PATCH /api/admin/rendezvous/${id}/patch`;
    this.logger.log(`[RendezvousService] ${step} -> mise à jour rendez-vous`);

    const existing = await this.findById(id, currentUser);

    // Validation des champs "Autre" pour la mise à jour
    if (updateRendezvousDto.destination) {
      if (updateRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.destinationAutre?.trim()) {
          this.logger.warn(
            `[RendezvousService] ${step} -> validation échouée: destination = "Autre" sans précision`,
          );
          throw new BadRequestException(
            'La destination "Autre" nécessite une précision',
          );
        }
      }
    }

    if (updateRendezvousDto.filiere) {
      if (updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.filiereAutre?.trim()) {
          this.logger.warn(
            `[RendezvousService] ${step} -> validation échouée: filière = "Autre" sans précision`,
          );
          throw new BadRequestException(
            'La filière "Autre" nécessite une précision',
          );
        }
      }
    }

    if (updateRendezvousDto.niveauEtude) {
      if (updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
        if (!updateRendezvousDto.niveauEtudeAutre?.trim()) {
          this.logger.warn(
            `[RendezvousService] ${step} -> validation échouée: niveau d'étude = "Autre" sans précision`,
          );
          throw new BadRequestException(
            'Le niveau d\'étude "Autre" nécessite une précision',
          );
        }
      }
    }

    const updateData: Prisma.RendezvousUpdateInput = {};

    if (updateRendezvousDto.firstName)
      updateData.firstName = updateRendezvousDto.firstName;
    if (updateRendezvousDto.lastName)
      updateData.lastName = updateRendezvousDto.lastName;
    if (updateRendezvousDto.email) updateData.email = updateRendezvousDto.email;
    if (updateRendezvousDto.telephone)
      updateData.telephone = updateRendezvousDto.telephone;

    if (updateRendezvousDto.destination) {
      const destinationValue =
        updateRendezvousDto.destination?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.destinationAutre?.trim()
          : updateRendezvousDto.destination.trim();
      updateData.destination = destinationValue;

      if (updateRendezvousDto.destination?.toLowerCase().trim() === 'autre') {
        updateData.destinationAutre =
          updateRendezvousDto.destinationAutre?.trim();
      } else {
        updateData.destinationAutre = null;
      }
    }

    if (updateRendezvousDto.niveauEtude) {
      const niveauEtudeValue =
        updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.niveauEtudeAutre?.trim()
          : updateRendezvousDto.niveauEtude.trim();
      updateData.niveauEtude = niveauEtudeValue;

      if (updateRendezvousDto.niveauEtude?.toLowerCase().trim() === 'autre') {
        updateData.niveauEtudeAutre =
          updateRendezvousDto.niveauEtudeAutre?.trim();
      } else {
        updateData.niveauEtudeAutre = null;
      }
    }

    if (updateRendezvousDto.filiere) {
      const filiereValue =
        updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre'
          ? updateRendezvousDto.filiereAutre?.trim()
          : updateRendezvousDto.filiere.trim();
      updateData.filiere = filiereValue;

      if (updateRendezvousDto.filiere?.toLowerCase().trim() === 'autre') {
        updateData.filiereAutre =
          updateRendezvousDto.filiereAutre?.trim() || '';
      } else {
        updateData.filiereAutre = null;
      }
    }

    if (updateRendezvousDto.date) updateData.date = updateRendezvousDto.date;
    if (updateRendezvousDto.time)
      updateData.time = this.convertTimeStringToTimeSlot(
        updateRendezvousDto.time,
      );

    if (updateRendezvousDto.status) {
      // Validation stricte des transitions de statut
      this.validateStatusTransition(
        existing.status,
        updateRendezvousDto.status,
      );

      // Validation : si le statut est COMPLETED, un avis administrateur est obligatoire
      if (
        updateRendezvousDto.status === RendezvousStatus.COMPLETED &&
        !updateRendezvousDto.avisAdmin
      ) {
        throw new BadRequestException(
          'Un avis administrateur (Favorable/Défavorable) est obligatoire pour terminer un rendez-vous',
        );
      }
      updateData.status = updateRendezvousDto.status;
    }

    if (updateRendezvousDto.avisAdmin) {
      updateData.avisAdmin = updateRendezvousDto.avisAdmin;
    }

    const maskedUpdateData = this.maskSensitiveData(updateData);
    this.logger.log(
      `[RendezvousService] ${step} -> données de mise à jour: ${JSON.stringify(maskedUpdateData)}`,
    );

    try {
      const updatedRendezvous = await this.rendezvousRepository.update(
        id,
        updateData,
      );

      this.logger.log(
        `[RendezvousService] ${step} -> 200: rendez-vous mis à jour avec succès`,
      );

      // Si le statut passe à COMPLETED avec avis FAVORABLE, créer automatiquement une procédure
      if (
        updateRendezvousDto.status === RendezvousStatus.COMPLETED &&
        updateRendezvousDto.avisAdmin === AdminOpinion.FAVORABLE
      ) {
        await this.createProcedureFromRendezvous(updatedRendezvous);
      }

      return updatedRendezvous;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousService] ${step} -> 500: erreur mise à jour: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Valide les transitions de statut autorisées
   */
  private validateStatusTransition(
    currentStatus: RendezvousStatus,
    newStatus: RendezvousStatus,
  ): void {
    const allowedTransitions: Record<RendezvousStatus, RendezvousStatus[]> = {
      [RendezvousStatus.PENDING]: [
        RendezvousStatus.CONFIRMED,
        RendezvousStatus.CANCELLED,
      ],
      [RendezvousStatus.CONFIRMED]: [
        RendezvousStatus.COMPLETED,
        RendezvousStatus.CANCELLED,
      ],
      [RendezvousStatus.COMPLETED]: [],
      [RendezvousStatus.CANCELLED]: [],
    };

    const validTransitions = allowedTransitions[currentStatus];

    if (!validTransitions.includes(newStatus)) {
      this.logger.warn(
        `Transition de statut invalide: ${currentStatus} → ${newStatus}`,
      );
      throw new BadRequestException(
        `Transition de statut invalide: ${currentStatus} → ${newStatus}. Transitions autorisées: ${validTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Créer automatiquement une procédure à partir d'un rendez-vous favorable
   */
  private async createProcedureFromRendezvous(rendezvous: Rendezvous) {
    const step = `POST /api/procedures (auto depuis rendezvous ${rendezvous.id})`;
    this.logger.log(
      `[RendezvousService] ${step} -> création automatique de procédure`,
    );

    try {
      const procedureData: Prisma.ProcedureCreateInput = {
        rendezVousId: rendezvous.id,
        prenom: rendezvous.firstName,
        nom: rendezvous.lastName,
        email: rendezvous.email,
        telephone: rendezvous.telephone,
        destination: rendezvous.destination,
        destinationAutre: rendezvous.destinationAutre,
        niveauEtude: rendezvous.niveauEtude,
        niveauEtudeAutre: rendezvous.niveauEtudeAutre,
        filiere: rendezvous.filiere,
        filiereAutre: rendezvous.filiereAutre,
        statut: ProcedureStatus.IN_PROGRESS,
        dateDerniereModification: new Date(),
        user: { connect: { id: rendezvous.userId } },
        steps: {
          create: [
            {
              nom: 'DEMANDE_ADMISSION',
              statut: 'IN_PROGRESS',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
            {
              nom: 'DEMANDE_VISA',
              statut: 'PENDING',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
            {
              nom: 'PREPARATIF_VOYAGE',
              statut: 'PENDING',
              dateCreation: new Date(),
              dateMaj: new Date(),
            },
          ],
        },
      };

      const procedure = await this.prisma.procedure.create({
        data: procedureData,
        include: { steps: true },
      });

      this.logger.log(
        `[RendezvousService] ${step} -> 201: procédure créée avec ID: ${procedure.id}`,
      );

      // Envoyer un email de notification
      const html = `
        <div style="margin:25px 0;line-height:1.8;">
          <p>Nous avons le plaisir de vous informer que votre procédure d'admission a été créée avec succès.</p>
          <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:25px 0;">
            <h3 style="margin-top:0;color:#0284c7;">Détails de votre procédure</h3>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Destination :</span> ${rendezvous.destinationAutre || rendezvous.destination}</div>
            <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> Créée</div>
          </div>
          <p>Notre équipe va désormais vous accompagner pas à pas dans votre projet d'études.</p>
          <div style="text-align:center;margin-top:30px;">
            <a href="${this.configService.get<string>('FRONTEND_URL')}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Suivre ma procédure</a>
          </div>
        </div>`;

      await this.mailService.sendProcedureCreatedEmail(
        rendezvous.email,
        rendezvous.firstName,
        html,
      );

      return procedure;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousService] ${step} -> erreur création procédure: ${errorMessage}`,
      );
    }
  }

  /**
   * Obtenir les créneaux disponibles pour une date donnée
   */
  async getAvailableSlots(date: Date | string) {
    const dateStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const step = `GET /api/rendezvous/available-slots/${dateStr}`;
    this.logger.log(
      `[RendezvousService] ${step} -> recherche créneaux disponibles`,
    );

    const rendezvousDate = typeof date === 'string' ? new Date(date) : date;

    // Vérifier si la date est disponible
    if (!this.holidaysService.isDateAvailable(rendezvousDate)) {
      this.logger.log(
        `[RendezvousService] ${step} -> date non disponible (week-end/férié)`,
      );
      return {
        date: rendezvousDate,
        available: false,
        reason: 'Week-end ou jour férié',
        availableSlots: [],
      };
    }

    // Récupérer les rendez-vous existants pour cette date
    const existingRendezvous = await this.rendezvousRepository.findAll({
      where: {
        date: rendezvousDate.toISOString().split('T')[0],
        status: RendezvousStatus.CONFIRMED,
      },
    });

    // Générer tous les créneaux possibles
    const allTimeSlots = this.generateValidTimeSlots();

    // Filtrer les créneaux déjà pris
    const takenTimeSlots = existingRendezvous.map((rdv) => rdv.time as string);

    // Filtrer les créneaux passés pour aujourd'hui
    const isToday = this.isToday(rendezvousDate);

    const availableSlots = allTimeSlots.filter((slot) => {
      const isTaken = takenTimeSlots.includes(slot);
      const isPast =
        isToday &&
        this.isPastTimeSlot(rendezvousDate.toISOString().split('T')[0], slot);
      return !isTaken && !isPast;
    });

    this.logger.log(
      `[RendezvousService] ${step} -> ${availableSlots.length} créneaux disponibles sur ${allTimeSlots.length}`,
    );

    return {
      date: rendezvousDate,
      available: availableSlots.length > 0,
      availableSlots,
      totalSlots: allTimeSlots.length,
      occupiedSlots: takenTimeSlots.length,
    };
  }

  /**
   * Génère les créneaux horaires valides
   */
  private generateValidTimeSlots(): string[] {
    const slots: string[] = [];

    // Matin: 9h00-11h30
    for (let hour = 9; hour <= 11; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 11) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    slots.push('11:30');

    // Après-midi: 13h30-16h30
    for (let hour = 13; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 16) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    slots.push('16:30');

    return slots;
  }

  /**
   * Vérifie si une date est aujourd'hui
   */
  private isToday(date: Date): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0] === today;
  }

  /**
   * Vérifie si un créneau horaire est passé
   */
  private isPastTimeSlot(dateStr: string, timeStr: string): boolean {
    const now = new Date();
    const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return slotDateTime < now;
  }

  /**
   * Obtenir les dates disponibles pour une période donnée
   */
  async getAvailableDates(startDate: Date, endDate: Date) {
    const step = 'GET /api/rendezvous/available-dates';
    this.logger.log(
      `[RendezvousService] ${step} -> recherche dates disponibles`,
    );

    const availableDates = this.holidaysService.getAvailableDates(
      startDate,
      endDate,
    );

    // Pour chaque date disponible, vérifier les créneaux horaires
    const datesWithSlots = await Promise.all(
      (await availableDates).map(async (dateStr) => {
        const date = new Date(dateStr);
        const existingRendezvous = await this.rendezvousRepository.findAll({
          where: {
            date: dateStr,
            status: RendezvousStatus.CONFIRMED,
          },
        });

        const availableSlots = await this.holidaysService.getAvailableTimeSlots(
          date,
          existingRendezvous,
        );

        return {
          date: dateStr,
          availableSlots: availableSlots.length,
          hasSlots: availableSlots.length > 0,
        };
      }),
    );

    const result = datesWithSlots.filter((dateInfo) => dateInfo.hasSlots);
    this.logger.log(
      `[RendezvousService] ${step} -> ${result.length} dates disponibles trouvées`,
    );

    return result;
  }

  /**
   * Vérifier la disponibilité d'un créneau spécifique
   */
  async checkAvailability(date: string, time: string) {
    const step = `GET /api/rendezvous/check-availability?date=${date}&time=${time}`;
    this.logger.log(
      `[RendezvousService] ${step} -> vérification disponibilité`,
    );

    try {
      // Validation de la date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      // Validation de l'heure
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(time)) {
        throw new BadRequestException(
          "Format d'heure invalide. Utilisez HH:MM",
        );
      }

      // Vérifier si le créneau est dans le passé
      if (this.isPastTimeSlot(date, time)) {
        this.logger.log(`[RendezvousService] ${step} -> créneau passé`);
        return {
          available: false,
          date,
          time,
          message: 'Ce créneau est déjà passé',
        };
      }

      // Récupérer les rendez-vous existants pour cette date
      const existingRendezvous = await this.rendezvousRepository.findAll({
        where: {
          date,
          status: RendezvousStatus.CONFIRMED,
        },
      });

      // Vérifier si le créneau est déjà pris
      const isTaken = existingRendezvous.some((rdv) => rdv.time === time);

      // Obtenir tous les créneaux disponibles pour cette date
      const availableSlots = await this.holidaysService.getAvailableTimeSlots(
        new Date(date),
        existingRendezvous,
      );

      // Trouver les créneaux alternatifs
      const alternativeSlots = availableSlots.filter((slot) => slot !== time);

      const result = {
        available: !isTaken,
        date,
        time,
        alternativeSlots: alternativeSlots.slice(0, 5),
        nextAvailableSlot:
          alternativeSlots.length > 0
            ? { date, time: alternativeSlots[0] }
            : undefined,
      };

      this.logger.log(
        `[RendezvousService] ${step} -> ${result.available ? 'disponible' : 'non disponible'}`,
      );
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousService] ${step} -> erreur: ${errorMessage}`,
      );
      throw new BadRequestException(
        'Erreur lors de la vérification de disponibilité',
      );
    }
  }

  /**
   * Obtenir des statistiques sur les rendez-vous
   */
  async getStatistics(currentUser: CurrentUser) {
    const step = 'GET /api/admin/rendezvous/statistics';
    this.logger.log(`[RendezvousService] ${step} -> calcul des statistiques`);

    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
    }

    const [total, confirmed, completed, cancelled, pending] = await Promise.all(
      [
        this.prisma.rendezvous.count({ where }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.CONFIRMED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.COMPLETED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.CANCELLED },
        }),
        this.prisma.rendezvous.count({
          where: { ...where, status: RendezvousStatus.PENDING },
        }),
      ],
    );

    // Statistiques par destination
    const destinationStats = await this.getDestinationStatistics(where);

    this.logger.log(
      `[RendezvousService] ${step} -> statistiques calculées: total=${total}`,
    );

    return {
      total,
      byStatus: {
        confirmed,
        completed,
        cancelled,
        pending,
      },
      upcoming: {
        today: 0, // TODO: implémenter
        tomorrow: 0, // TODO: implémenter
        thisWeek: 0, // TODO: implémenter
        thisMonth: 0, // TODO: implémenter
      },
      topDestinations: destinationStats,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
    };
  }

  /**
   * Obtenir les statistiques par destination
   */
  private async getDestinationStatistics(where: Prisma.RendezvousWhereInput) {
    const rendezvousByDestination = await this.prisma.rendezvous.groupBy({
      by: ['destination'],
      where,
      _count: {
        id: true,
      },
    });

    return rendezvousByDestination
      .map((stat) => ({
        destination: stat.destination,
        count: stat._count.id,
        percentage: 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Annuler un rendez-vous
   */
  async cancel(id: string, currentUser: CurrentUser) {
    const step = `PATCH /api/rendezvous/${id}/cancel`;
    this.logger.log(`[RendezvousService] ${step} -> annulation rendez-vous`);

    const existing = await this.findById(id, currentUser);

    if (existing.status === RendezvousStatus.CANCELLED) {
      this.logger.warn(
        `[RendezvousService] ${step} -> rendez-vous déjà annulé`,
      );
      throw new BadRequestException('Ce rendez-vous est déjà annulé');
    }

    // Vérifier que l'utilisateur peut annuler ce rendez-vous
    if (currentUser.role !== UserRole.ADMIN) {
      // Un utilisateur peut annuler son propre rendez-vous s'il correspond à son email
      if (existing.email !== currentUser.email) {
        this.logger.warn(
          `[RendezvousService] ${step} -> tentative d'annulation non autorisée: ${this.maskEmail(currentUser.email)} vs ${this.maskEmail(existing.email)}`,
        );
        throw new ForbiddenException(
          'Vous ne pouvez annuler que vos propres rendez-vous',
        );
      }

      // Un utilisateur ne peut annuler que les rendez-vous en attente ou confirmés
      if (
        existing.status !== RendezvousStatus.PENDING &&
        existing.status !== RendezvousStatus.CONFIRMED
      ) {
        this.logger.warn(
          `[RendezvousService] ${step} -> statut non annulable: ${existing.status}`,
        );
        throw new BadRequestException(
          'Seuls les rendez-vous en attente ou confirmés peuvent être annulés',
        );
      }
    }

    const cancelled = await this.rendezvousRepository.update(id, {
      status: RendezvousStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: currentUser.role === UserRole.ADMIN ? 'ADMIN' : 'USER',
    });

    this.logger.log(
      `[RendezvousService] ${step} -> 200: rendez-vous annulé avec succès`,
    );
    return cancelled;
  }

  /**
   * Confirmer un rendez-vous (terminer avec avis administrateur)
   */
  async complete(
    id: string,
    updateRendezvousDto: UpdateRendezvousDto,
    currentUser: CurrentUser,
  ) {
    const step = `PATCH /api/admin/rendezvous/${id}/complete`;
    this.logger.log(`[RendezvousService] ${step} -> complétion rendez-vous`);

    const existing = await this.findById(id, currentUser);

    if (existing.status !== RendezvousStatus.CONFIRMED) {
      this.logger.warn(
        `[RendezvousService] ${step} -> statut invalide: ${existing.status}`,
      );
      throw new BadRequestException(
        'Seuls les rendez-vous confirmés peuvent être terminés',
      );
    }

    // Validation obligatoire : un avis administrateur est requis
    if (!updateRendezvousDto.avisAdmin) {
      this.logger.warn(
        `[RendezvousService] ${step} -> avis administrateur manquant`,
      );
      throw new BadRequestException(
        'Un avis administrateur (Favorable/Défavorable) est obligatoire pour terminer un rendez-vous',
      );
    }

    // Mettre à jour le rendez-vous
    const updatedRendezvous = await this.rendezvousRepository.update(id, {
      status: RendezvousStatus.COMPLETED,
      avisAdmin: updateRendezvousDto.avisAdmin,
    });

    this.logger.log(
      `[RendezvousService] ${step} -> 200: rendez-vous complété avec avis: ${updateRendezvousDto.avisAdmin}`,
    );

    // Si l'avis est FAVORABLE, créer automatiquement une procédure
    if (updateRendezvousDto.avisAdmin === AdminOpinion.FAVORABLE) {
      await this.createProcedureFromRendezvous(updatedRendezvous);
    }

    return updatedRendezvous;
  }

  /**
   * Supprimer un rendez-vous (soft delete)
    this.logger.log(
      `[RendezvousService] ${step} -> 204: rendez-vous supprimé (soft delete)`,
    );
    return deleted;
  }

  /**
   * Compter les rendez-vous
   */
  async count(
    currentUser: CurrentUser,
    filters?: { status?: RendezvousStatus },
  ) {
    const where: Prisma.RendezvousWhereInput = {};

    if (currentUser.role !== UserRole.ADMIN) {
      where.email = currentUser.email;
    }

    if (filters?.status) where.status = filters.status;

    return this.rendezvousRepository.count(where);
  }

  // ==================== UTILITAIRES DE MASQUAGE ====================

  /**
   * Masquer les données sensibles pour les logs
   */
  private maskSensitiveData(
    data: Prisma.RendezvousCreateInput | Prisma.RendezvousUpdateInput,
  ): Prisma.RendezvousCreateInput | Prisma.RendezvousUpdateInput {
    if (!data) return data;

    const masked = { ...data };

    // Masquer l'email
    if (masked.email && typeof masked.email === 'string') {
      masked.email = this.maskEmail(masked.email);
    }

    // Masquer le téléphone
    if (masked.telephone && typeof masked.telephone === 'string') {
      masked.telephone = this.maskPhone(masked.telephone);
    }

    // Masquer les champs "Autre"
    if (
      masked.destinationAutre &&
      typeof masked.destinationAutre === 'string'
    ) {
      masked.destinationAutre = this.maskValue(masked.destinationAutre);
    }
    if (masked.filiereAutre && typeof masked.filiereAutre === 'string') {
      masked.filiereAutre = this.maskValue(masked.filiereAutre);
    }
    if (
      masked.niveauEtudeAutre &&
      typeof masked.niveauEtudeAutre === 'string'
    ) {
      masked.niveauEtudeAutre = this.maskValue(masked.niveauEtudeAutre);
    }

    return masked;
  }

  /**
   * Masquer un email (garder domaine et première lettre)
   */
  private maskEmail(email: string): string {
    if (!email) return '[MASQUÉ]';
    const [local, domain] = email.split('@');
    if (!domain) return '[MASQUÉ]';
    const maskedLocal =
      local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Masquer un téléphone (garder les 4 derniers chiffres)
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '[MASQUÉ]';
    return '***' + phone.slice(-4);
  }

  /**
   * Masquer une valeur personnalisée
   */
  private maskValue(value: string): string {
    if (!value || value.length < 2) return '[MASQUÉ]';
    if (value.length <= 4) return value.charAt(0) + '***';
    return value.charAt(0) + '***' + value.charAt(value.length - 1);
  }
}
