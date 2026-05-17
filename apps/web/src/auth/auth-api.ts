import type { AuthUser, ForgotPasswordResponse, LoginResponse } from './auth.types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// VI: Helper request JSON dung lai cho auth, co thong bao loi ngan gon va an toan.
async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed.');
  }

  return payload as T;
}

// VI: API login gui email/password, backend tra JWT va user public.
export function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// VI: Goi /auth/me de khoi phuc auth state sau khi refresh trang.
export function currentUserRequest(accessToken: string): Promise<AuthUser> {
  return requestJson<AuthUser>('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function registerRequest(name: string, email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function forgotPasswordRequest(email: string): Promise<ForgotPasswordResponse> {
  return requestJson<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordRequest(token: string, password: string): Promise<{ success: true }> {
  return requestJson<{ success: true }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
