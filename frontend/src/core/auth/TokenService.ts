const ACCESS_TOKEN_KEY = 'billaura_access_token';
const REFRESH_TOKEN_KEY = 'billaura_refresh_token';

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

export class TokenService {
  static getAccessToken(): string | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token === 'undefined' || token === 'null') return null;
    return token;
  }

  static getRefreshToken(): string | null {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token === 'undefined' || token === 'null') return null;
    return token;
  }

  static getCsrfToken(): string | null {
    return readCookie("ba_csrf");
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  static setTokens(accessToken: string, refreshToken?: string | null): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    
    // As per user requirements, clear individual keys on logout
    localStorage.removeItem('billaura_user');
    localStorage.removeItem('billaura_tenant');
    localStorage.removeItem('billaura_permissions');
  }
}

