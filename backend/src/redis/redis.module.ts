import { Global, Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const url = configService.get<string>('redis.url')!;
        const keyv = createKeyv(url);
        keyv.on('error', (err: Error) => {
          logger.error(`❌ Redis error: ${err.message}`);
        });
        // Best-effort connection log on first use
        logger.log(`✅ Redis cache configured → ${url}`);
        return {
          stores: [keyv],
          ttl: 60_000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
