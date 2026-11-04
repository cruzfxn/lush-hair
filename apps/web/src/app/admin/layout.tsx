'use client';

import { AdminGate } from '../../features/admin/admin-gate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
