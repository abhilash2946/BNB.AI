const TOKEN_KEY = 'bnb_app_token';

// Determine API Base URL dynamically
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  return '/api';
};

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  agency_name?: string;
  avatar_url?: string;
  role?: string;
  tier?: string;
}

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  loginWithGoogle(): void {
    const apiUrl = getApiUrl();
    window.location.href = `${apiUrl}/auth/app-login/google`;
  },

  logout(): void {
    this.clearToken();
    window.location.href = '/';
  },

  async fetchCurrentUser(): Promise<AppUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.clearToken();
        }
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error('[auth] Error fetching current user:', err);
      return null;
    }
  },
};
