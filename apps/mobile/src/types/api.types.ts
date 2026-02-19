/**
 * API Layer Types
 * All request/response types for the stateless API layer.
 * Every endpoint returns an ApiResponse<T> for consistent error handling.
 */

/** Standard API response wrapper */
export interface ApiResponse<T> {
    data: T | null;
    error: ApiError | null;
    status: ApiStatus;
}

/** Structured API error */
export interface ApiError {
    code: string;
    message: string;
    details?: string;
    statusCode?: number;
}

/** API call status */
export type ApiStatus = 'success' | 'error' | 'loading' | 'idle';

/** Paginated response */
export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/** API request configuration */
export interface ApiRequestConfig {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
}

/** Auth token payload */
export interface AuthTokenPayload {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

/** Sign up request */
export interface SignUpRequest {
    email: string;
    password: string;
    fullName: string;
    neighborhood: string;
    languagePreference?: string;
}

/** Sign in request */
export interface SignInRequest {
    email: string;
    password: string;
}

/** Change password request */
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

/** Reset email request */
export interface ResetEmailRequest {
    email: string;
}

/** Update profile request — each field is independent */
export interface UpdateProfileRequest {
    fullName?: string;
    neighborhood?: string;
    bio?: string;
    city?: string;
    instagramHandle?: string;
    languagePreference?: 'en' | 'pt' | 'es';
    privacyVisibility?: 'friends' | 'anyone' | 'nobody';
    avatarUrl?: string | null;
}

/** Update email request */
export interface UpdateEmailRequest {
    newEmail: string;
}
