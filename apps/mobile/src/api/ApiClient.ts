/**
 * ApiClient — Singleton, Stateless API Layer
 * 
 * All frontend components talk to this API client.
 * The API client talks to Supabase (via the database provider)
 * and to edge functions. It does NOT store state — it returns
 * typed ApiResponse<T> objects that the state store consumes.
 * 
 * Architecture:
 *   Backend (Edge Functions) <-> ApiClient <-> Frontend
 *   ApiClient <-> State Store
 */

import { supabase } from '../services/supabase/client';
import { logger } from '../services/logging/Logger';
import { CONFIG } from '../constants/config';
import { ApiResponse, ApiError } from '../types/api.types';

class ApiClient {
    private static instance: ApiClient;
    private readonly timeout: number;

    private constructor() {
        this.timeout = CONFIG.api.timeout;
        logger.info('API', 'ApiClient initialized', { timeout: this.timeout });
    }

    /** Get singleton instance */
    static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    /** Get the Supabase client (for API endpoints to use) */
    getSupabaseClient() {
        return supabase;
    }

    /**
     * Invoke a Supabase Edge Function
     * Wraps supabase.functions.invoke with logging and error handling.
     */
    async invokeFunction<T>(
        functionName: string,
        body?: Record<string, unknown>,
        options?: { method?: string }
    ): Promise<ApiResponse<T>> {
        const startTime = Date.now();
        logger.info('API', `Invoking edge function: ${functionName}`, { body, options });

        try {
            const { data, error } = await supabase.functions.invoke(functionName, {
                body: body,
                method: (options?.method || 'POST') as 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE',
            });

            const duration = Date.now() - startTime;

            if (error) {
                logger.error('API', `Edge function error: ${functionName}`, error, { duration });
                return this.createErrorResponse(error.message, 'EDGE_FUNCTION_ERROR');
            }

            logger.info('API', `Edge function success: ${functionName}`, { duration });
            return this.createSuccessResponse<T>(data as T);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('API', `Edge function exception: ${functionName}`, error, { duration });
            return this.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error',
                'EDGE_FUNCTION_EXCEPTION'
            );
        }
    }

    /**
     * Query the database via Supabase client
     * Generic wrapper with logging for any Supabase query.
     */
    async query<T>(
        operation: string,
        queryFn: () => Promise<{ data: T | null; error: { message: string; code?: string } | null }>
    ): Promise<ApiResponse<T>> {
        const startTime = Date.now();
        logger.debug('API', `Query start: ${operation}`);

        try {
            const { data, error } = await queryFn();
            const duration = Date.now() - startTime;

            if (error) {
                logger.error('API', `Query error: ${operation}`, new Error(error.message), { duration, code: error.code });
                return this.createErrorResponse(error.message, error.code || 'QUERY_ERROR');
            }

            logger.debug('API', `Query success: ${operation}`, { duration });
            return this.createSuccessResponse<T>(data as T);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('API', `Query exception: ${operation}`, error, { duration });
            return this.createErrorResponse(
                error instanceof Error ? error.message : 'Unknown error',
                'QUERY_EXCEPTION'
            );
        }
    }

    /** Create a success response */
    createSuccessResponse<T>(data: T): ApiResponse<T> {
        return { data, error: null, status: 'success' };
    }

    /** Create an error response */
    createErrorResponse<T>(message: string, code: string = 'UNKNOWN_ERROR', statusCode?: number): ApiResponse<T> {
        const apiError: ApiError = { code, message, statusCode };
        return { data: null, error: apiError, status: 'error' };
    }
}

/** Pre-instantiated API client */
export const apiClient = ApiClient.getInstance();
