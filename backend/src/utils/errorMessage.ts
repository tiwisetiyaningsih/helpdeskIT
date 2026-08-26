export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message;

    const looksLikeInternalLeak =
      message.includes("prisma.") ||
      message.includes("Invalid `") ||
      message.includes("\n") ||
      message.length > 200;

    if (!looksLikeInternalLeak) {
      return message;
    }
  }

  return fallback;
}