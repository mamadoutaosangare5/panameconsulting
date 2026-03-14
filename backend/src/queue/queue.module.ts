import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ProcedureProcessor } from './processors/procedure.processor';
import { RendezvousProcessor } from './processors/rendezvous.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notification' },
      { name: 'procedure' },
      { name: 'backup' },
      { name: 'report' },
      { name: 'rendezvous' },
    ),
  ],
  providers: [
    QueueService,
    QueueController,
    EmailProcessor,
    NotificationProcessor,
    ProcedureProcessor,
    RendezvousProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
