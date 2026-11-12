import Constants from 'expo-constants';

const EXPLICIT_BASE = process.env.EXPO_PUBLIC_API_URL?.trim();

function resolveBase(): string {
  if (EXPLICIT_BASE) {
    return EXPLICIT_BASE.replace(/\/+$/, '');
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:8080` : 'http://localhost:8080';
}

export const API_BASE = resolveBase();
const V1 = `${API_BASE}/api/v1`;

export type EventType = 'concert' | 'charity' | 'community';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  starts_at: string;
  ends_at?: string | null;
  capacity: number;
  price_min: number;
  price_max: number;
  currency: string;
  cover_image_url: string;
  organizer_name: string;
  contact_email: string;
  contact_phone: string;
  tags: string[];
  beneficiary?: string;
  donation_target?: number;
  donation_raised?: number;
  created_at: string;
  going_count: number;
  going_names: string[];
  review_count: number;
  rating_avg: number;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface EventList {
  data: Event[];
  pagination: Pagination;
}

export interface Review {
  id: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  event_cover_url: string;
  event_starts_at: string;
  user_id: string;
  user_name: string;
  rating: number;
  body: string;
  photo_url?: string;
  helpful_count: number;
  created_at: string;
}

export interface ReviewList {
  data: Review[];
  pagination: Pagination;
}

export interface EventReviewList {
  data: Review[];
  summary: { count: number; average: number };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  user: SessionUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface EventQuery {
  q?: string;
  type?: EventType | '';
  city?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  concert: 'Konser',
  charity: 'Amal',
  community: 'Komunitas',
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type AuthBridge = {
  accessToken: () => string | null;
  refresh: () => Promise<string | null>;
};

let bridge: AuthBridge | null = null;

export function bindAuthBridge(next: AuthBridge | null): void {
  bridge = next;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = bridge?.accessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${V1}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      'offline',
      'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
    );
  }

  if (response.status === 401 && retry && token && bridge) {
    const refreshed = await bridge.refresh().catch(() => null);
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = (payload as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiError(
      response.status,
      detail?.code ?? 'request_failed',
      detail?.message ?? `Permintaan gagal (${response.status}).`,
      detail?.details,
    );
  }

  return payload as T;
}

function queryString(query: EventQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(query.pageSize ?? 20));
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.type) params.set('type', query.type);
  if (query.city?.trim()) params.set('city', query.city.trim());
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params.toString();
}

export function listEvents(query: EventQuery = {}, signal?: AbortSignal): Promise<EventList> {
  return request<EventList>(`/events?${queryString(query)}`, { signal });
}

export async function getEvent(slug: string, signal?: AbortSignal): Promise<Event> {
  const payload = await request<{ data: Event }>(`/events/${encodeURIComponent(slug)}`, {
    signal,
  });
  return payload.data;
}

export function listReviews(page = 1, pageSize = 9, signal?: AbortSignal): Promise<ReviewList> {
  return request<ReviewList>(`/events/reviews?page=${page}&page_size=${pageSize}`, { signal });
}

export function listEventReviews(
  slug: string,
  pageSize = 5,
  signal?: AbortSignal,
): Promise<EventReviewList> {
  return request<EventReviewList>(
    `/events/${encodeURIComponent(slug)}/reviews?page=1&page_size=${pageSize}`,
    { signal },
  );
}

export async function createReview(
  slug: string,
  payload: { rating: number; body: string },
): Promise<Review> {
  const response = await request<{ data: Review }>(
    `/events/${encodeURIComponent(slug)}/reviews`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return response.data;
}

export function login(email: string, password: string): Promise<Session> {
  return request<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginWithFirebase(idToken: string): Promise<Session> {
  return request<Session>('/auth/firebase', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function register(payload: RegisterPayload): Promise<Session> {
  return request<Session>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(): Promise<SessionUser> {
  const payload = await request<{ user: SessionUser }>('/auth/me');
  return payload.user;
}

export async function refreshSession(refreshToken: string): Promise<Session> {
  let response: Response;
  try {
    response = await fetch(`${V1}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    throw new ApiError(
      0,
      'offline',
      'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
    );
  }
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const error = (payload as { error?: { message?: string } })?.error;
    throw new ApiError(
      response.status,
      'refresh_failed',
      error?.message ?? 'Sesi berakhir. Silakan masuk kembali.',
    );
  }
  return payload as Session;
}

export function logoutRequest(refreshToken: string): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function requestPasswordReset(email: string): Promise<{ status: string }> {
  return request<{ status: string }>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyResetCode(email: string, code: string): Promise<void> {
  return request<void>('/auth/password/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function resetPassword(email: string, code: string, password: string): Promise<void> {
  return request<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Terjadi kesalahan saat memuat data.';
}
