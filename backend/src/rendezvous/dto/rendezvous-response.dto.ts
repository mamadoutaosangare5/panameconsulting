import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RendezvousStatus,
  AdminOpinion,
  EducationLevel,
  CancelledBy,
} from '@prisma/client';

class UserInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'jean.dupont@email.com' })
  email: string;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullName: string;
}

class ProcedureInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'En cours' })
  statut: string;
}

export class RendezvousResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;

  @ApiProperty({ example: 'Jean Dupont' })
  fullName: string;

  @ApiProperty({ example: 'jean.dupont@email.com' })
  email: string;

  @ApiProperty({ example: '+33612345678' })
  telephone: string;

  @ApiProperty({ example: 'France' })
  destination: string;

  @ApiPropertyOptional({ example: 'Belgique' })
  destinationAutre?: string;

  @ApiProperty({ example: 'France' })
  effectiveDestination: string;

  @ApiProperty({ enum: EducationLevel, example: EducationLevel.Master_I })
  niveauEtude: EducationLevel;

  @ApiPropertyOptional({ example: 'DUT' })
  niveauEtudeAutre?: string;

  @ApiProperty({ example: 'Master I' })
  effectiveNiveauEtude: string;

  @ApiProperty({ example: 'Informatique' })
  filiere: string;

  @ApiPropertyOptional({ example: 'Data Science' })
  filiereAutre?: string;

  @ApiProperty({ example: 'Informatique' })
  effectiveFiliere: string;

  @ApiProperty({ example: '2024-12-25' })
  date: string;

  @ApiProperty({ example: '14:30' })
  time: string;

  @ApiProperty({ example: '2024-12-25T14:30:00.000Z' })
  dateTime: Date;

  @ApiProperty({ enum: RendezvousStatus, example: RendezvousStatus.CONFIRMED })
  status: RendezvousStatus;

  @ApiPropertyOptional({ enum: AdminOpinion, example: AdminOpinion.FAVORABLE })
  avisAdmin?: AdminOpinion;

  @ApiPropertyOptional({ example: '2024-12-20T10:30:00.000Z' })
  cancelledAt?: Date;

  @ApiPropertyOptional({ enum: CancelledBy, example: CancelledBy.USER })
  cancelledBy?: CancelledBy;

  @ApiPropertyOptional({ example: 'Empêchement personnel' })
  cancellationReason?: string;

  @ApiProperty({ example: '2024-12-01T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-12-20T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId?: string;

  @ApiPropertyOptional({ type: UserInfoDto })
  user?: UserInfoDto;

  @ApiPropertyOptional({ type: ProcedureInfoDto })
  procedure?: ProcedureInfoDto;

  @ApiProperty({ example: true })
  canCancel: boolean;

  @ApiProperty({ example: true })
  canModify: boolean;

  @ApiProperty({ example: false })
  isPast: boolean;

  @ApiProperty({ example: false })
  isToday: boolean;

  @ApiProperty({ example: 45 })
  minutesUntilRendezvous: number;
}

export class PaginatedRendezvousResponseDto {
  @ApiProperty({ type: [RendezvousResponseDto] })
  data: RendezvousResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}

export class RendezvousStatisticsDto {
  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({
    example: {
      confirmed: 80,
      completed: 45,
      cancelled: 15,
      pending: 10,
    },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    example: {
      today: 8,
      tomorrow: 12,
      thisWeek: 45,
      thisMonth: 120,
    },
  })
  upcoming: Record<string, number>;

  @ApiProperty({
    example: [
      { destination: 'France', count: 45 },
      { destination: 'Canada', count: 32 },
    ],
  })
  topDestinations: { destination: string; count: number }[];

  @ApiProperty({ example: 30.0 })
  completionRate: number;

  @ApiProperty({ example: 10.0 })
  cancellationRate: number;
}

export class AvailableSlotsDto {
  @ApiProperty({ example: '2024-12-25' })
  date: string;

  @ApiProperty({
    example: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '14:00',
      '14:30',
      '15:00',
    ],
    type: [String],
  })
  slots: string[];

  @ApiProperty({ example: 8 })
  totalAvailable: number;

  @ApiProperty({ example: 16 })
  totalSlots: number;
}

export class AvailabilityCheckDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ example: '2024-12-25' })
  date: string;

  @ApiProperty({ example: '14:30' })
  time: string;

  @ApiPropertyOptional({
    example: {
      date: '2024-12-25',
      time: '15:00',
    },
  })
  nextAvailableSlot?: { date: string; time: string };

  @ApiPropertyOptional({
    example: ['14:30', '15:00', '15:30'],
    type: [String],
  })
  alternativeSlots?: string[];
}
