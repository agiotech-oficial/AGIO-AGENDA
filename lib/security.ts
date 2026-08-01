/**
 * Security utilities for input sanitization, XSS prevention, and request validation.
 */

/**
 * Sanitizes a string input to prevent XSS attacks by escaping HTML entities.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes object keys and values recursively.
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = sanitizeInput(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  return obj;
}

/**
 * Validates whether a value is a valid email format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates authorization header or API session token on server-side routes.
 */
export function validateApiAuth(request: Request): { authenticated: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  const sessionToken = request.headers.get('x-session-token');

  // If no auth header or session token provided
  if (!authHeader && !sessionToken) {
    return {
      authenticated: false,
      error: 'Não autorizado: Token de autenticação ou cabeçalho ausente.',
    };
  }

  return { authenticated: true };
}
