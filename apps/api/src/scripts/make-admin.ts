import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

function loadRootEnv(): void {
  const envPath = resolve(__dirname, '../../../../.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function createDataSource(): DataSource {
  const databaseUrl = process.env.DATABASE_URL;
  const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!databaseUrl && (!POSTGRES_HOST || !POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB)) {
    throw new Error('Set DATABASE_URL or all POSTGRES_HOST/PORT/USER/PASSWORD/DB values in the root .env file.');
  }

  const host = databaseUrl ? new URL(databaseUrl).hostname : POSTGRES_HOST!;
  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host.toLowerCase());
  if (!isLocal && !process.argv.includes('--allow-non-local-db')) {
    throw new Error(`Refusing to change non-local database host "${host}". Rerun with --allow-non-local-db after checking your .env.`);
  }
  return new DataSource({
    type: 'postgres',
    ...(databaseUrl ? { url: databaseUrl } : {
      host: POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_DB,
    }),
    ...(process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    entities: [resolve(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: false,
  });
}

async function promoteUser(): Promise<void> {
  loadRootEnv();
  const email = process.argv.slice(2).find((argument) => argument !== '--' && argument !== '--allow-non-local-db')?.trim();
  if (!email || !email.includes('@')) {
    throw new Error('Provide an email address: pnpm --filter api make:admin -- user@example.com [--allow-non-local-db]');
  }

  const dataSource = createDataSource();
  try {
    await dataSource.initialize();
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user) throw new Error(`No registered user found for ${email}. Register the account first.`);
    user.role = UserRole.ADMIN;
    await userRepository.save(user);
    console.log(`${user.email} now has the admin role.`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

promoteUser().catch((error: unknown) => {
  console.error('Admin promotion failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
