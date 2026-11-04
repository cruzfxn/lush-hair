import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  JWT_SECRET: Joi.string().required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).optional(),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  POSTGRES_HOST: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_USER: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  POSTGRES_PASSWORD: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  POSTGRES_DB: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  PORT: Joi.number().port().default(5000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  TYPEORM_SYNCHRONIZE: Joi.boolean().truthy('true').falsy('false').optional(),
  API_PUBLIC_URL: Joi.string().uri().optional(),
  IMAGE_STORAGE: Joi.string().valid('local', 'cloudinary').default('local'),
  CLOUDINARY_CLOUD_NAME: Joi.string().when('IMAGE_STORAGE', { is: 'cloudinary', then: Joi.required(), otherwise: Joi.optional() }),
  CLOUDINARY_API_KEY: Joi.string().when('IMAGE_STORAGE', { is: 'cloudinary', then: Joi.required(), otherwise: Joi.optional() }),
  CLOUDINARY_API_SECRET: Joi.string().when('IMAGE_STORAGE', { is: 'cloudinary', then: Joi.required(), otherwise: Joi.optional() }),
});
