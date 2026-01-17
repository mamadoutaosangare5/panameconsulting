import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createWinstonOptions } from './winston.options';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => createWinstonOptions(configService),
      inject: [ConfigService],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}
