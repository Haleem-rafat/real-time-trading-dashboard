export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodb: {
    url: string;
    dbName: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  frontendUrl: string;
  allowAnonWs: boolean;
  tickIntervalMs: number;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  mongodb: {
    url: process.env.MONGODB_URL ?? 'mongodb://localhost:27017/trading',
    dbName: process.env.MONGODB_DB_NAME ?? 'trading',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES ?? '24h',
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  allowAnonWs: process.env.ALLOW_ANON_WS !== 'false',
  tickIntervalMs: Number(process.env.TICK_INTERVAL_MS ?? 1000),
});
