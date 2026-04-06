import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { JwtGuard } from './common/guards/jwt.guard';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TickerModule } from './ticker/ticker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RedisModule,
    UserModule,
    AuthModule,
    TickerModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
