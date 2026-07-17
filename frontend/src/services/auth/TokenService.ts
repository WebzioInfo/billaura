/** Access tokens are deliberately memory-only. Refresh tokens live in an HttpOnly cookie. */
let accessToken: string | null = null;

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

export class TokenService {
  static getAccessToken(): string | null {
    return accessToken;
  }

  static getCsrfToken(): string | null {
    return readCookie("ba_csrf");
  }

  static setAccessToken(token: string): void {
    accessToken = token;
  }

  // Kept as a compatibility shim while callers are migrated; the refresh value is never stored.
  static setTokens(token: string, _refreshToken?: string): void {
    accessToken = token;
  }

  static clearTokens(): void {
    accessToken = null;
  }
}
