type CachedRole = {
  isActive: boolean;
  roleName: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 30_000; 

const cache = new Map<number, CachedRole>();

export function getCachedRole(userId: number): CachedRole | null {
  const entry = cache.get(userId);

  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    cache.delete(userId);
    return null;
  }

  return entry;
}

export function setCachedRole(
  userId: number,
  isActive: boolean,
  roleName: string
) {
  cache.set(userId, {
    isActive,
    roleName,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateRoleCache(userId: number) {
  cache.delete(userId);
}