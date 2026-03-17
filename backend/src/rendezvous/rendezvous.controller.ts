// rendezvous.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { RendezvousService } from './rendezvous.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRendezvousDto,
  UpdateRendezvousDto,
  CancelRendezvousDto,
  RendezvousResponseDto,
  RendezvousQueryDto,
  CompleteRendezvousDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as currentUserInterface from '../interfaces/current-user.interface';
import { QueueService } from '../queue/queue.service';
import { UserRole, RendezvousStatus } from '@prisma/client';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('rendezvous')
@Controller('')
export class RendezvousController {
  private readonly logger = new Logger(RendezvousController.name);

  constructor(
    private readonly rendezvousService: RendezvousService,
    private readonly mailService: MailService,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== ROUTES PUBLIQUES ====================

  @Get('rendezvous/available-slots/:date')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les créneaux disponibles pour une date (PUBLIC)',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date au format YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Créneaux disponibles pour la date spécifiée',
  })
  async getAvailableSlots(@Param('date') date: string) {
    const step = `GET /api/rendezvous/available-slots/${date}`;
    this.logger.log(`[RendezvousController] ${step}`);

    try {
      // Validation de la date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 400: format de date invalide`,
        );
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      const availableSlots =
        await this.rendezvousService.getAvailableSlots(date);
      this.logger.log(
        `[RendezvousController] ${step} -> 200: ${availableSlots.availableSlots?.length || 0} créneaux trouvés`,
      );
      return availableSlots;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${errorMessage}`,
      );
      throw new BadRequestException(
        'Erreur lors de la récupération des créneaux disponibles',
      );
    }
  }

  @Get('rendezvous/available-dates')
  @Public()
  @ApiOperation({
    summary: 'Obtenir les dates disponibles pour une période (PUBLIC)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Date de fin (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dates disponibles avec leurs créneaux',
  })
  async getAvailableDates(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const step = 'GET /api/rendezvous/available-dates';
    this.logger.log(`[RendezvousController] ${step}`);

    try {
      // Validation des dates si fournies
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (startDate && !dateRegex.test(startDate)) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 400: format startDate invalide`,
        );
        throw new BadRequestException(
          'Format de startDate invalide. Utilisez YYYY-MM-DD',
        );
      }

      if (endDate && !dateRegex.test(endDate)) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 400: format endDate invalide`,
        );
        throw new BadRequestException(
          'Format de endDate invalide. Utilisez YYYY-MM-DD',
        );
      }

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const availableDates = await this.rendezvousService.getAvailableDates(
        start,
        end,
      );

      this.logger.log(
        `[RendezvousController] ${step} -> 200: ${availableDates.length} dates disponibles`,
      );
      return availableDates;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${errorMessage}`,
      );
      throw new BadRequestException(
        'Erreur lors de la récupération des dates disponibles',
      );
    }
  }

  @Get('rendezvous/check-availability')
  @Public()
  @ApiOperation({ summary: "Vérifier la disponibilité d'un créneau (PUBLIC)" })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date au format YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'time',
    required: true,
    description: 'Heure au format HH:MM',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilité du créneau',
  })
  async checkAvailability(
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    const step = `GET /api/rendezvous/check-availability?date=${date}&time=${time}`;
    this.logger.log(`[RendezvousController] ${step}`);

    try {
      // Validation de la date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 400: format de date invalide`,
        );
        throw new BadRequestException(
          'Format de date invalide. Utilisez YYYY-MM-DD',
        );
      }

      // Validation de l'heure
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(time)) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 400: format d'heure invalide`,
        );
        throw new BadRequestException(
          "Format d'heure invalide. Utilisez HH:MM",
        );
      }

      const availability = await this.rendezvousService.checkAvailability(
        date,
        time,
      );

      this.logger.log(
        `[RendezvousController] ${step} -> 200: ${availability.available ? 'disponible' : 'non disponible'}`,
      );
      return availability;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la vérification de disponibilité',
      );
    }
  }

  // ==================== ROUTES PROTÉGÉES ====================

  @Post('/rendezvous')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau rendez-vous' })
  @ApiResponse({
    status: 201,
    description: 'Rendez-vous créé avec succès',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Créneau non disponible' })
  async create(
    @Body() createRendezvousDto: CreateRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<any> {
    const step = 'POST /api/rendezvous';
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const rendezvous = await this.rendezvousService.create(
        createRendezvousDto,
        user,
      );

      // Ajouter l'email de confirmation à la queue
      try {
        // Créer le contenu HTML directement
        const htmlContent = this.generateConfirmationContent(rendezvous);

        await this.queueService.addEmailJob({
          to: rendezvous.email,
          subject: 'Confirmation de votre rendez-vous - Paname Consulting',
          html: htmlContent,
          priority: 'high',
        });
        this.logger.log(
          `[RendezvousController] ${step} -> email de confirmation ajouté à la queue`,
        );
      } catch (emailError) {
        this.logger.error(
          `[RendezvousController] ${step} -> erreur envoi email: ${
            emailError instanceof Error ? emailError.message : 'Unknown error'
          }`,
        );
        // Ne pas bloquer la réponse si l'email échoue
      }

      this.logger.log(
        `[RendezvousController] ${step} -> 201: rendez-vous créé avec ID: ${rendezvous.id}`,
      );
      return rendezvous;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la création du rendez-vous',
      );
    }
  }

  @Get('admin/rendezvous/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les rendez-vous (Admin seulement)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RendezvousStatus })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous' })
  async findAll(
    @Query() query: RendezvousQueryDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    const step = 'GET /api/admin/rendezvous/all';
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const result = await this.rendezvousService.findAll(user, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        date: query.date ? new Date(query.date) : undefined,
        email: query.email,
        destination: query.destination,
        filiere: query.filiere,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        search: query.search,
        hasAvis: query.hasAvis,
        hasProcedure: query.hasProcedure,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      this.logger.log(
        `[RendezvousController] ${step} -> 200: ${result.data.length} rendez-vous retournés`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Get('admin/rendezvous/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques des rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    const step = 'GET /api/admin/rendezvous/statistics';
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const statistics = await this.rendezvousService.getStatistics(user);
      this.logger.log(
        `[RendezvousController] ${step} -> 200: statistiques calculées`,
      );
      return statistics;
    } catch (error) {
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Get('rendezvous/by-email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trouver les rendez-vous par email' })
  @ApiResponse({ status: 200, description: 'Rendez-vous trouvés' })
  async findByEmail(
    @Param('email') email: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    const step = `GET /api/rendezvous/by-email/${this.maskEmail(email)}`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Pour la recherche par email, on permet aux utilisateurs de voir leurs propres rendez-vous
    // et aux admins de voir tous les rendez-vous
    if (user.role !== UserRole.ADMIN && user.email !== email) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 403: accès non autorisé`,
      );
      throw new UnauthorizedException(
        'Vous ne pouvez voir que vos propres rendez-vous',
      );
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 400: format d'email invalide`,
      );
      throw new BadRequestException("Format d'email invalide");
    }

    try {
      // Utiliser Prisma directement pour trouver les rendez-vous par email
      const rawRendezvous = await this.prisma.rendezvous.findMany({
        where: {
          email: email,
        },
        orderBy: {
          date: 'desc',
        },
      });

      // Ajouter les propriétés calculées
      const rendezvous = rawRendezvous.map((rdv) => {
        const now = new Date();
        const timeString = String(rdv.time); // Prisma stocke TimeSlot comme string
        const rendezvousDateTime = new Date(`${rdv.date}T${timeString}`);
        const hoursDifference =
          (rendezvousDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const minutesDifference =
          (rendezvousDateTime.getTime() - now.getTime()) / (1000 * 60);

        // Vérifier si le créneau est pendant la pause déjeuner (12:30-14h)
        const [hours] = timeString.split(':').map(Number);
        const isLunchBreak = hours >= 12.5 && hours < 14;

        return {
          ...rdv,
          // Propriétés calculées
          fullName: `${rdv.firstName} ${rdv.lastName}`,
          effectiveDestination: rdv.destinationAutre || rdv.destination,
          effectiveNiveauEtude: rdv.niveauEtudeAutre || rdv.niveauEtude,
          effectiveFiliere: rdv.filiereAutre || rdv.filiere,
          dateTime: rendezvousDateTime,
          // Un utilisateur peut annuler son propre RDV si PENDING ou CONFIRMED (sans contrainte de temps)
          canCancel: rdv.status === 'PENDING' || rdv.status === 'CONFIRMED',
          // Un utilisateur peut modifier seulement les RDV CONFIRMED prévus dans plus de 24h
          canModify: rdv.status === 'CONFIRMED' && hoursDifference > 24,
          isPast: rendezvousDateTime < now,
          isToday: rendezvousDateTime.toDateString() === now.toDateString(),
          minutesUntilRendezvous: Math.floor(minutesDifference),
          // Informations sur la pause déjeuner
          lunchBreakInfo: {
            lunchBreakStart: '12:30',
            lunchBreakEnd: '14:00',
            isLunchBreak: isLunchBreak,
          },
        };
      });

      // Pas de log ici - le middleware HTTP gère déjà le logging
      // this.logger.log(
      //   `[RendezvousController] ${step} -> 200: ${rendezvous.length} rendez-vous trouvés`,
      // );
      return rendezvous;
    } catch (error) {
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la recherche des rendez-vous par email',
      );
    }
  }

  @Get('rendezvous/by-date/:date')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trouver les rendez-vous par date (Admin seulement)',
  })
  @ApiResponse({ status: 200, description: 'Rendez-vous trouvés' })
  async findByDate(
    @Param('date') date: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    const step = `GET /api/rendezvous/by-date/${date}`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est un administrateur
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 403: accès réservé aux admins`,
      );
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    // Valider le format de la date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 400: format de date invalide`,
      );
      throw new BadRequestException(
        'Format de date invalide. Utilisez YYYY-MM-DD',
      );
    }

    try {
      // Utiliser Prisma directement pour trouver les rendez-vous par date
      const rendezvous = await this.prisma.rendezvous.findMany({
        where: {
          date: date,
        },
        orderBy: {
          time: 'asc',
        },
      });

      // Pas de log ici - le middleware HTTP gère déjà le logging
      // this.logger.log(
      //   `[RendezvousController] ${step} -> 200: ${rendezvous.length} rendez-vous trouvés`,
      // );
      return rendezvous;
    } catch (error) {
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la recherche des rendez-vous par date',
      );
    }
  }

  @Get('/rendezvous/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Détails d'un rendez-vous" })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous trouvé',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    const step = `GET /api/rendezvous/${id}`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const rendezvous = await this.rendezvousService.findById(id, user);
      this.logger.log(
        `[RendezvousController] ${step} -> 200: rendez-vous trouvé`,
      );
      return rendezvous;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 404: rendez-vous non trouvé`,
        );
      } else if (error instanceof ForbiddenException) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 403: accès non autorisé`,
        );
      } else {
        this.logger.error(
          `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      throw error;
    }
  }

  @Patch('admin/rendezvous/:id/patch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 200, description: 'Rendez-vous modifié' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  @ApiResponse({ status: 403, description: 'Admin uniquement' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: string,
    @Body() updateRendezvousDto: UpdateRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    const step = `PATCH /api/admin/rendezvous/${id}/patch`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const updated = await this.rendezvousService.update(
        id,
        updateRendezvousDto,
        user,
      );
      this.logger.log(
        `[RendezvousController] ${step} -> 200: rendez-vous mis à jour`,
      );
      return updated;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la mise à jour du rendez-vous',
      );
    }
  }

  @Patch('rendezvous/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous annulé',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Annulation impossible' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async cancel(
    @Param('id') id: string,
    @Body() cancelRendezvousDto: CancelRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    const step = `PATCH /api/rendezvous/${id}/cancel`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const cancelled = await this.rendezvousService.cancel(id, user);
      this.logger.log(
        `[RendezvousController] ${step} -> 200: rendez-vous annulé`,
      );
      return cancelled;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        "Erreur lors de l'annulation du rendez-vous",
      );
    }
  }

  @Patch('admin/rendezvous/:id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compléter un rendez-vous (Admin seulement)' })
  @ApiResponse({
    status: 200,
    description: 'Rendez-vous complété',
    type: RendezvousResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Complétion impossible' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async complete(
    @Param('id') id: string,
    @Body() completeRendezvousDto: CompleteRendezvousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ): Promise<any> {
    const step = `PATCH /api/admin/rendezvous/${id}/complete`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    try {
      const completed = await this.rendezvousService.complete(
        id,
        completeRendezvousDto,
        user,
      );
      this.logger.log(
        `[RendezvousController] ${step} -> 200: rendez-vous complété`,
      );
      return completed;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la complétion du rendez-vous',
      );
    }
  }

  @Delete('admin/rendezvous/:id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un rendez-vous (Admin seulement)' })
  @ApiResponse({ status: 204, description: 'Rendez-vous supprimé' })
  @ApiResponse({ status: 404, description: 'Rendez-vous non trouvé' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser | null,
  ) {
    const step = `DELETE /api/admin/rendezvous/${id}/delete`;
    this.logger.log(`[RendezvousController] ${step}`);

    if (!user) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 401: utilisateur non authentifié`,
      );
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est un administrateur
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `[RendezvousController] ${step} -> 403: accès réservé aux admins`,
      );
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    try {
      const rendezvous = await this.rendezvousService.findById(id, user);
      if (!rendezvous) {
        this.logger.warn(
          `[RendezvousController] ${step} -> 404: rendez-vous non trouvé`,
        );
        throw new NotFoundException('Rendez-vous non trouvé');
      }

      // Soft delete via Prisma
      await this.prisma.rendezvous.update({
        where: { id },
        data: {
          status: RendezvousStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `[RendezvousController] ${step} -> 204: rendez-vous supprimé`,
      );
      return;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `[RendezvousController] ${step} -> 500: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Erreur lors de la suppression du rendez-vous',
      );
    }
  }

  // ==================== UTILITAIRES ====================

  private generateConfirmationContent(rendezvous: {
    date: string | Date;
    time: string;
    firstName: string;
  }): string {
    const dateFormatted = new Date(rendezvous.date).toLocaleDateString(
      'fr-FR',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    return `
      <div style="margin:25px 0;line-height:1.8;">
        <p>Votre rendez-vous a été confirmé avec succès.</p>
        <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
          <h3 style="margin-top:0;color:#0ea5e9;">Détails du rendez-vous</h3>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Date :</span> ${dateFormatted}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Heure :</span> ${rendezvous.time}</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Lieu :</span> Paname Consulting - Kalaban Coura</div>
          <div style="margin-bottom:10px;"><span style="font-weight:600;color:#374151;">Statut :</span> <span style="color:#10b981;font-weight:600;">Confirmé</span></div>
        </div>
        <p>Nous vous attendons avec impatience.</p>
      </div>`;
  }

  // ==================== UTILITAIRES DE MASQUAGE ====================

  private maskEmail(email: string): string {
    if (!email) return '[MASQUÉ]';
    const [local, domain] = email.split('@');
    if (!domain) return '[MASQUÉ]';
    const maskedLocal =
      local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }
}
