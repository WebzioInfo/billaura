import * as Joi from "joi";

export const appConfigValidationSchema = Joi.object({
  API_PREFIX: Joi.string().default("api"),
  DATABASE_URL: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().optional().allow(""),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("30d"),
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(4000),
  SMTP_HOST: Joi.string().optional().allow(""),
  SMTP_PORT: Joi.number().optional().allow(""),
  SMTP_USER: Joi.string().optional().allow(""),
  SMTP_PASSWORD: Joi.string().optional().allow(""),
  CLOUDINARY_NAME: Joi.string().optional().allow(""),
  CLOUDINARY_KEY: Joi.string().optional().allow(""),
  CLOUDINARY_SECRET: Joi.string().optional().allow(""),
});
