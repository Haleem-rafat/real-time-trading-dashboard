import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const url = configService.get<string>('mongodb.url')!;
        const dbName = configService.get<string>('mongodb.dbName');
        return {
          uri: url,
          dbName,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log(`✅ MongoDB connected → ${dbName}`);
            });
            connection.on('error', (err: Error) => {
              logger.error(`❌ MongoDB error: ${err.message}`);
            });
            connection.on('disconnected', () => {
              logger.warn('⚠️  MongoDB disconnected');
            });
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
