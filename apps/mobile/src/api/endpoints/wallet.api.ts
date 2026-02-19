/**
 * Wallet API Endpoints
 * Refactored from services/supabase/wallet.ts to go through API client.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse } from '../../types/api.types';

interface WalletBalance {
    userId: string;
    points: number;
    xp: number;
    level: string;
}

interface WalletTransaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
}

class WalletApiClass {
    private static instance: WalletApiClass;

    private constructor() { }

    static getInstance(): WalletApiClass {
        if (!WalletApiClass.instance) {
            WalletApiClass.instance = new WalletApiClass();
        }
        return WalletApiClass.instance;
    }

    /** Get wallet balance */
    async getBalance(userId: string): Promise<ApiResponse<WalletBalance>> {
        logger.debug('API', `getBalance: ${userId}`);

        return apiClient.query<WalletBalance>('wallet.getBalance', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('id, current_month_points, total_lifetime_points')
                .eq('id', userId)
                .single();

            if (error) return { data: null, error };

            return {
                data: {
                    userId: data.id,
                    points: data.current_month_points || 0,
                    xp: data.total_lifetime_points || 0,
                    level: 'starter', // Calculated from XP
                },
                error: null,
            };
        });
    }

    /** Get wallet transaction history */
    async getTransactions(userId: string, limit: number = 20): Promise<ApiResponse<WalletTransaction[]>> {
        logger.debug('API', `getTransactions: ${userId}`, { limit });

        return apiClient.query<WalletTransaction[]>('wallet.getTransactions', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return { data: null, error };

            const transactions: WalletTransaction[] = (data || []).map((t: Record<string, unknown>) => ({
                id: t.id as string,
                type: t.type as string,
                amount: t.amount as number,
                description: t.description as string,
                createdAt: t.created_at as string,
            }));

            return { data: transactions, error: null };
        });
    }
}

export const WalletApi = WalletApiClass.getInstance();
