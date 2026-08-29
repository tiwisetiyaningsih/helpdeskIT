type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
(cleanupTimer as any)?.unref?.();

function hit(
  key: string,
  windowMs: number,
  max: number
): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > max) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

function getClientIp(context: any): string {
  const forwardedFor = context.headers?.["x-forwarded-for"];

  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  if (context.ip) {
    return String(context.ip);
  }

  try {
    const address = context.server?.requestIP?.(context.request)?.address;
    if (address) return String(address);
  } catch {
    // abaikan
  }

  return "unknown";
}

type RateLimitOptions = {
  windowMs?: number;
  max?: number;
};

export function createAuthRateLimiter(
  label: string,
  options: RateLimitOptions = {}
) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 5;

  return (context: any) => {
    const { body, set } = context;

    const ip = getClientIp(context);
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    const ipResult = hit(`${label}:ip:${ip}`, windowMs, max);
    const emailResult = email
      ? hit(`${label}:email:${email}`, windowMs, max)
      : { limited: false, retryAfterSeconds: 0 };

    if (ipResult.limited || emailResult.limited) {
      const retryAfterSeconds = Math.max(
        ipResult.retryAfterSeconds,
        emailResult.retryAfterSeconds
      );

      set.status = 429;
      set.headers["Retry-After"] = String(retryAfterSeconds);

      return {
        success: false,
        message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(
          retryAfterSeconds / 60
        )} menit.`,
      };
    }
  };
}

export const loginRateLimit = createAuthRateLimiter("login", {
  max: 5,
  windowMs: 15 * 60 * 1000,
});

export const registerRateLimit = createAuthRateLimiter("register", {
  max: 5,
  windowMs: 15 * 60 * 1000,
});

export const refreshRateLimit = createAuthRateLimiter("refresh", {
  max: 30,
  windowMs: 5 * 60 * 1000,
});

export function createUserRateLimiter(
  label: string,
  options: RateLimitOptions = {}
) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const max = options.max ?? 10;

  return (context: any) => {
    const { set, currentUser } = context;

    const ip = getClientIp(context);
    const key = currentUser?.id
      ? `${label}:user:${currentUser.id}`
      : `${label}:ip:${ip}`;

    const result = hit(key, windowMs, max);

    if (result.limited) {
      set.status = 429;
      set.headers["Retry-After"] = String(result.retryAfterSeconds);

      return {
        success: false,
        message: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(
          result.retryAfterSeconds / 60
        )} menit.`,
      };
    }
  };
}

export const createTicketRateLimit = createUserRateLimiter("create-ticket", {
  max: 10,
  windowMs: 15 * 60 * 1000,
});