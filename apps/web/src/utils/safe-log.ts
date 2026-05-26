type SafeUiLogContext = Record<string, string | number | undefined>;

// VI: Ghi loi UI bang ngu canh toi thieu, khong in token, payload hay raw response tu backend.
export function logSafeUiError(module: string, action: string, message: string, error: unknown, context: SafeUiLogContext = {}): void {
  console.error({
    module,
    action,
    ...context,
    message,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: 'UI operation failed.',
  });
}
