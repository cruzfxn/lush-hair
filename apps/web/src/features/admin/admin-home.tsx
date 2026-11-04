import Link from 'next/link';

export function AdminHome() {
  return (
    <main className="admin-content">
      <p className="eyebrow">STORE MANAGEMENT</p>
      <h1>Admin dashboard</h1>
      <p className="admin-lede">Manage the catalogue, product options, variants and images.</p>
      <Link className="primary-link-button" href="/admin/products">Manage products</Link>
    </main>
  );
}
