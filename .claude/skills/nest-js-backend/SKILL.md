# NestJS Backend Development Guide

## Tech Stack
- **NestJS 11** + **TypeScript 5.5+** (target ES2022, CommonJS)
- **MongoDB** with **Mongoose 8.9+** ODM
- **Passport.js** - JWT, Local, Google OAuth, Facebook OAuth strategies
- **Socket.IO 4.8** for real-time WebSocket gateway
- **Stripe 17+** for payments
- **Redis** via `@nestjs/cache-manager` + `cache-manager-redis-yet` for caching
- **Azure Blob Storage** for file uploads (SAS token generation)
- **Firebase Admin** for push notifications (FCM)
- **Nodemailer** for email (or **@nestjs-modules/mailer** with templates)
- **class-validator** + **class-transformer** for DTO validation
- **@nestjs/swagger** for OpenAPI docs at `/docs`
- **@nestjs/event-emitter** for event-driven architecture
- **@nestjs/schedule** for cron jobs
- **Application Insights** for monitoring

## NestJS 11 Key Changes
- **Node.js 18+ required** — Dropped Node.js 16 support
- **Express v5 support** — NestJS 11 supports Express v5 (new path matching, improved security)
- **`@nestjs/config` improvements** — Better typed configuration with `ConfigType`
- **Logger enhancements** — Improved built-in logger, better JSON logging support
- **`@nestjs/throttler` v6** — Rate limiting with improved Redis store support
- **`@nestjs/cache-manager` v3** — Updated cache module with better Redis integration
- **Performance improvements** — Faster module resolution and dependency injection
- **Fastify v5 support** — Optional Fastify adapter updated to v5

## Project Structure
```
src/
├── main.ts                    # Bootstrap: CORS, Swagger, global filters, port 8080
├── app.module.ts              # Root module: ConfigModule, DB, Redis, Stripe, JWT guard, ValidationPipe
├── app.controller.ts          # Root controller
├── common/                    # Shared code (global)
│   ├── decorators/            # @Public(), @UserFromPayload(), @AccountType()
│   ├── dto/                   # BasePaginationQuery
│   ├── enums/                 # Routes, Role, AppEvents, SocketEvents, TokenTypes, OrganizationAccountType
│   ├── filter/                # HttpException, MongoException, CastError, JWT, Stripe, WS filters
│   ├── guards/                # JwtGuard, RoleGuard, OrganizationGuard, AccountTypeGuard, SocketAuthGuard
│   ├── helpers/               # Utility helpers
│   ├── interceptors/          # ApplicationInsightsInterceptor
│   ├── middleware/            # HTTPLoggerMiddleware
│   ├── modules/               # BaseListService (reusable list CRUD)
│   ├── pipes/                 # ParseBooleanPipe, ValidatePayloadExistsPipe
│   ├── services/              # EmailService, ApplicationInsightsService
│   ├── templates/             # Email HTML templates
│   ├── validator/             # ValidObjectId custom validator
│   └── common.module.ts       # @Global() module exporting shared services
├── database/
│   ├── database.module.ts     # MongooseModule.forRootAsync() with env-based config
│   ├── database.service.ts    # DB utilities
│   ├── common/                # Shared sub-schemas (Location, SMDetails)
│   └── seeders/               # Countries, Categories, Languages, Platforms, Roles seed data
├── utils/
│   ├── constants.ts           # STRIPE_CLIENT, passwordMinLength, cache key factories
│   ├── helpers.ts             # hashPassword, comparePassword, convertTime, getNameFromEmail
│   └── options.ts             # Schema transform (snake_case, remove _id/__v/password)
├── redis/                     # CacheModule with Redis store (global)
├── stripe/                    # Stripe module (forRoot pattern), webhooks, payments, subscriptions
├── blob/                      # Azure Blob SAS token generation
├── auth/                      # JWT + Passport auth (strategies/, dtos/, interfaces/)
├── user/                      # User schema + profile management
├── organization/              # Organization CRUD + members + cron-jobs/
├── chat/                      # Chat rooms
├── message/                   # Messages within chat rooms
├── socket/                    # Socket.IO gateway + auth middleware
├── notification/              # Firebase FCM push notifications
├── campaign/                  # Campaign management + helpers/ + enums
├── connectors/                # Social media (YouTube, Instagram, Facebook, TikTok)
├── [feature]/                 # Each: module, controller, service, schema, dto/
│   ├── [feature].module.ts
│   ├── [feature].controller.ts
│   ├── [feature].service.ts
│   ├── [feature].schema.ts
│   └── dto/
└── test/                      # E2E tests (auth, chat, socket, member, organization, service)
```

## Key Patterns

### Module Pattern
Every feature follows this structure:
```typescript
// feature.module.ts
@Module({
  imports: [MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### Controller Pattern
```typescript
@Controller(Routes.FEATURE)
@ApiBearerAuth()
@ApiTags(Routes.FEATURE)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  async getAll(@UserFromPayload() user: JwtPayload, @Query() query: BasePaginationQuery) {
    const data = await this.featureService.getAll(user, query);
    return { message: 'Success', data };
  }

  @Post()
  async create(@UserFromPayload() user: JwtPayload, @Body() dto: CreateFeatureDto) {
    const data = await this.featureService.create(user.id, dto);
    return { message: 'Feature created', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    const data = await this.featureService.update(id, dto);
    return { message: 'Feature updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.featureService.delete(id);
  }
}
```

### Service Pattern
```typescript
@Injectable()
export class FeatureService {
  constructor(
    @InjectModel(Feature.name) private readonly featureModel: Model<Feature>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateFeatureDto) {
    const feature = await this.featureModel.create({ ...dto, user: userId });
    this.eventEmitter.emit(AppEvents.SEND_NOTIFICATION, { /* payload */ });
    return feature;
  }

  async getAll(user: JwtPayload, query: BasePaginationQuery) {
    const { page = 1, limit = 10 } = query;
    return this.featureModel
      .find({ organization: user.organization })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'first_name last_name')
      .sort({ createdAt: -1 });
  }
}
```

### Schema Pattern (Mongoose)
```typescript
@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.password) delete ret.password;
      // Convert to snake_case
      if (ret.createdAt) { ret.created_at = ret.createdAt; delete ret.createdAt; }
      if (ret.updatedAt) { ret.updated_at = ret.updatedAt; delete ret.updatedAt; }
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform(_, ret) {
      ret.id = ret._id.toHexString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Feature {
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true })
  organization: Organization;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  members: User[];

  @Prop({ default: false })
  is_active: boolean;

  @Prop({ type: String, enum: ['draft', 'published'], default: 'draft' })
  status: string;
}

export const FeatureSchema = SchemaFactory.createForClass(Feature);

// Virtual references
FeatureSchema.virtual('items', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'feature',
  justOne: false,
});

// Indexes
FeatureSchema.index({ organization: 1, createdAt: -1 });
```

### DTO Pattern (class-validator)
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEmail, IsEnum, MinLength, IsArray, Validate } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ValidObjectId } from '../../common/validator/objectId.validator';

export class CreateFeatureDto {
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({ example: 'Feature Name', description: 'Name of the feature', type: String, required: true })
  title: string;

  @IsOptional()
  @ApiProperty({ example: 'Description', type: String, required: false })
  description?: string;

  @IsNotEmpty()
  @Validate(ValidObjectId, { message: 'Invalid organization ID' })
  @ApiProperty({ type: String, required: true })
  organization: string;

  @IsOptional()
  @IsArray()
  @Validate(ValidObjectId, { each: true, message: 'Invalid ID in array' })
  members?: string[];

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @ApiProperty({ example: '2025-01-25', type: Date, required: false })
  start_date?: Date;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
```

### Guard Pattern
```typescript
// Role-based (parameterized mixin pattern)
@UseGuards(RoleGuard(Role.OWNER, Role.ADMIN))

// Organization check
@UseGuards(OrganizationGuard)

// Public route (bypasses JWT)
@Public()
@Get('public-endpoint')
```

### Event-Driven Pattern
```typescript
// Emitting events
this.eventEmitter.emit(AppEvents.SEND_EMAIL, { to: email, subject, html });
this.eventEmitter.emit(AppEvents.SEND_NOTIFICATION, { userId, title, body });

// Listening to events (in another service)
@OnEvent(AppEvents.SEND_EMAIL)
async handleSendEmail(payload: { to: string; subject: string; html: string }) {
  await this.transporter.sendMail({ from: this.emailFrom, ...payload });
}
```

### Pagination Pattern
```typescript
// BasePaginationQuery DTO (from common/dto/)
export class BasePaginationQuery {
  @IsOptional() @Type(() => Number) @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @Min(1) @Max(20) limit?: number = 10;
}

// Usage in service
const { page = 1, limit = 10 } = query;
const total = await this.model.countDocuments(filter);
const data = await this.model.find(filter).skip((page - 1) * limit).limit(limit);
return { data, total, page, limit };
```

### Response Format
All endpoints return consistent format:
```typescript
{ message: string, data: T }           // Success
{ message: string, error: object }      // Error (from exception filters)
```

### Socket.IO Gateway Pattern
```typescript
@WebSocketGateway({ cors: { origin: true, credentials: true } })
@UseGuards(SocketAuthGuard)
@UseFilters(WsExceptionFilter)
@UsePipes(ValidationPipe)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(WSAuthMiddleware);  // JWT auth middleware
  }

  handleConnection(client: AuthSocket) {
    this.socketService.setUserSocket(client.user.id, client);
  }

  @SubscribeMessage(SocketEvents.MESSAGE_SENT)
  async handleMessage(@MessageBody() dto: CreateMessageDto, @ConnectedSocket() client: AuthSocket) {
    // Handle and broadcast
    this.server.to(roomId).emit(SocketEvents.MESSAGE_RECEIVED, message);
  }
}
```

### Rate Limiting Pattern (NestJS 11)
```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

// In app.module.ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),

// Per-route override
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('login')
async login(@Body() dto: LoginDto) { /* ... */ }
```

## Naming Conventions
- **Schemas:** PascalCase class, snake_case fields (`first_name`, `is_active`, `created_at`)
- **DTOs:** PascalCase class with `Dto` suffix (`CreateFeatureDto`, `UpdateFeatureDto`)
- **Services:** PascalCase with `Service` suffix, `@Injectable()`
- **Controllers:** PascalCase with `Controller` suffix, route from `Routes` enum
- **Enums:** PascalCase values (`AppEvents.SEND_EMAIL`, `Role.OWNER`, `TokenTypes.Access`)
- **Files:** kebab-case or dot-notation (`feature.service.ts`, `feature.schema.ts`, `feature.module.ts`)
- **Guards:** PascalCase with `Guard` suffix
- **Filters:** PascalCase with `ExceptionFilter` or `Filter` suffix

## Global Configuration (app.module.ts)
```
ConfigModule.forRoot({ envFilePath: NODE_ENV === 'development' ? '.env' : '.env.stage', isGlobal: true })
ValidationPipe({ whitelist: true }) — global pipe
JwtGuard — global guard (all routes protected by default, use @Public() to opt out)
HTTPLoggerMiddleware — all routes
EventEmitterModule.forRoot() — async events
ScheduleModule.forRoot() — cron jobs
```

## Auth Flow
1. **Register** → Create user + send verification email
2. **Login** → Validate credentials → Return `{ access_token, refresh_token, user }`
3. **JWT Guard** → Every request validates Bearer token (except `@Public()` routes)
4. **Refresh** → Exchange refresh_token for new access_token
5. **OAuth** → Google/Facebook → Redirect with encoded JWT in URL
6. **@UserFromPayload()** → Extract user from JWT payload in any controller

## Key Decorators
- `@Public()` — Skip JWT auth
- `@UserFromPayload()` — Get `JwtPayload` from request
- `@AccountType(type)` — Require specific account type
- `@UseGuards(RoleGuard(Role.OWNER, Role.ADMIN))` — Role-based access
- `@UseGuards(OrganizationGuard)` — Require organization membership

## Environment Variables
```
# Database
MONGODB_URL, MONGODB_DB_NAME, MONGODB_ROOT_USER, MONGODB_ROOT_PASSWORD
# JWT
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES
# OAuth
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
# Email
EMAIL_HOST, EMAIL_PORT, EMAIL_FROM, EMAIL_PASSWORD
# Stripe
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CURRENCY
# Redis
REDIS_URI, REDIS_PASSWORD, REDIS_TTL
# Azure Blob
BLOB_CONNECTION_URL, SAS_TOKEN_EXPIRY_HOURS
# Session
SESSION_SECRET, SALT_ROUNDS
```

## Testing
- **Unit:** `npm test` (Jest, `*.spec.ts`)
- **E2E:** `npm run test:e2e` (Supertest, `*.e2e-spec.ts` in `test/`)
- **Coverage:** `npm run test:cov`
