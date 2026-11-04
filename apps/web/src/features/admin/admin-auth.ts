export function tokenRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as {
      role?: string;
      exp?: number;
    };
    if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function isAdminToken(token: string | null): boolean {
  return tokenRole(token) === 'admin';
}
