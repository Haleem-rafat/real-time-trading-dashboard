import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8080),
  MONGODB_URL: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().default('trading'),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES: Joi.string().default('24h'),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  ALLOW_ANON_WS: Joi.string().valid('true', 'false').default('true'),
  TICK_INTERVAL_MS: Joi.number().default(1000),
});
