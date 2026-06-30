import * as Joi from "joi";

export const appConfigValidationSchema = Joi.object({
  API_PREFIX: Joi.string().default("api"),
  DATABASE_URL: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(4000),
});
