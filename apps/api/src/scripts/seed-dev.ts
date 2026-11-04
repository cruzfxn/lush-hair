import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { Product, ProductType } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';

type SeedVariant = {
  sku: string;
  options: Record<string, string>;
  price: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  type: ProductType;
  texture: string;
  origin: string;
  leadTimeDays: number;
  availableColours: string[];
  attributes: Record<string, unknown>;
  options: Array<{ name: string; values: string[]; sortOrder: number }>;
  variants: SeedVariant[];
};

const products: SeedProduct[] = [
  {
    slug: 'silky-straight-wig',
    name: 'Silky Straight Wig',
    description: 'Soft, natural-looking silky straight human hair wig.',
    type: ProductType.WIG,
    texture: 'Silky straight',
    origin: 'Brazilian',
    leadTimeDays: 7,
    availableColours: ['Natural Black', '1B', 'Dark Brown'],
    attributes: { hairType: 'Human hair', cap: 'Adjustable' },
    options: [
      { name: 'Length', values: ['16 inch', '18 inch', '20 inch'], sortOrder: 0 },
      { name: 'Density', values: ['180%', '200%'], sortOrder: 1 },
    ],
    variants: [
      { sku: 'SEED-WIG-16-180', options: { Length: '16 inch', Density: '180%' }, price: 25000000 },
      { sku: 'SEED-WIG-18-180', options: { Length: '18 inch', Density: '180%' }, price: 28000000 },
      { sku: 'SEED-WIG-20-180', options: { Length: '20 inch', Density: '180%' }, price: 31000000 },
      { sku: 'SEED-WIG-20-200', options: { Length: '20 inch', Density: '200%' }, price: 34000000 },
    ],
  },
  {
    slug: 'brazilian-body-wave-bundle',
    name: 'Brazilian Body Wave Bundle',
    description: 'A full, soft body wave bundle for versatile styling.',
    type: ProductType.BUNDLE,
    texture: 'Body wave',
    origin: 'Brazilian',
    leadTimeDays: 3,
    availableColours: ['Natural Black', '1B', 'Dark Brown'],
    attributes: { hairType: 'Human hair', bundlesPerPack: 1 },
    options: [{ name: 'Length', values: ['12 inch', '14 inch', '16 inch', '18 inch'], sortOrder: 0 }],
    variants: [
      { sku: 'SEED-BUNDLE-12', options: { Length: '12 inch' }, price: 6500000 },
      { sku: 'SEED-BUNDLE-14', options: { Length: '14 inch' }, price: 7500000 },
      { sku: 'SEED-BUNDLE-16', options: { Length: '16 inch' }, price: 8500000 },
      { sku: 'SEED-BUNDLE-18', options: { Length: '18 inch' }, price: 9500000 },
    ],
  },
  {
    slug: 'hd-lace-closure',
    name: 'HD Lace Closure',
    description: 'A natural-looking HD lace closure for a seamless finish.',
    type: ProductType.CLOSURE,
    texture: 'Body wave',
    origin: 'Brazilian',
    leadTimeDays: 5,
    availableColours: ['Natural Black', '1B'],
    attributes: { hairType: 'Human hair', lace: 'HD lace' },
    options: [
      { name: 'Length', values: ['12 inch', '14 inch'], sortOrder: 0 },
      { name: 'Size', values: ['4x4', '5x5'], sortOrder: 1 },
    ],
    variants: [
      { sku: 'SEED-CLOSURE-12-4X4', options: { Length: '12 inch', Size: '4x4' }, price: 8500000 },
      { sku: 'SEED-CLOSURE-12-5X5', options: { Length: '12 inch', Size: '5x5' }, price: 10000000 },
      { sku: 'SEED-CLOSURE-14-4X4', options: { Length: '14 inch', Size: '4x4' }, price: 10500000 },
      { sku: 'SEED-CLOSURE-14-5X5', options: { Length: '14 inch', Size: '5x5' }, price: 12000000 },
    ],
  },
];

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
    throw new Error(`Refusing to seed non-local database host "${host}". Rerun with --allow-non-local-db after checking your .env.`);
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

async function seed(): Promise<void> {
  loadRootEnv();
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    await dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const optionRepository = manager.getRepository(ProductOption);
      const variantRepository = manager.getRepository(ProductVariant);

      for (const seedProduct of products) {
        let product = await productRepository.findOneBy({ slug: seedProduct.slug });
        if (!product) product = productRepository.create();
        Object.assign(product, {
          slug: seedProduct.slug,
          name: seedProduct.name,
          description: seedProduct.description,
          type: seedProduct.type,
          texture: seedProduct.texture,
          origin: seedProduct.origin,
          leadTimeDays: seedProduct.leadTimeDays,
          isActive: true,
          attributes: seedProduct.attributes,
          availableColours: seedProduct.availableColours,
        });
        product = await productRepository.save(product);

        const existingOptions = await optionRepository.findBy({ productId: product.id });
        for (const optionData of seedProduct.options) {
          let option = existingOptions.find((current) => current.name === optionData.name);
          if (!option) option = optionRepository.create({ productId: product.id });
          Object.assign(option, optionData, { productId: product.id });
          await optionRepository.save(option);
        }

        for (const variantData of seedProduct.variants) {
          let variant = await variantRepository.findOneBy({ sku: variantData.sku });
          if (variant && variant.productId !== product.id) {
            throw new Error(`Seed SKU ${variantData.sku} is already used by another product.`);
          }
          if (!variant) variant = variantRepository.create();
          Object.assign(variant, {
            productId: product.id,
            options: variantData.options,
            price: variantData.price,
            sku: variantData.sku,
            isActive: true,
          });
          await variantRepository.save(variant);
        }
      }
    });
    console.log(`Development seed complete: ${products.length} products created or updated.`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Development seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
