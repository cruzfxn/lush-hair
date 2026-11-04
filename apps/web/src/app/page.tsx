import { Storefront } from '../features/products/storefront';
import { getProducts } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const products = await getProducts();
    return <Storefront products={products} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The store API is unavailable.';
    return <Storefront products={[]} loadError={message} />;
  }
}
