import { getPartnerCoupons, redeemPartnerCouponWithPoints, getUserRedeemedCoupons } from '../coupons';
import { supabase } from '../client';

// Mock the Supabase client
jest.mock('../client', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

describe('Coupons Service', () => {
    const mockUserId = 'test-user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPartnerCoupons', () => {
        it('should return active partner coupons', async () => {
            const mockCoupons = [
                {
                    id: 'coupon-1',
                    title: '10% OFF',
                    description: 'Discount at Nike Store',
                    partner: 'Nike',
                    code: 'NIKE10',
                    points_required: 500,
                    discount_type: 'percentage',
                    discount_value: 10,
                    category: 'fashion',
                    expires_at: '2026-12-31T23:59:59Z',
                    is_active: true,
                    stock_limit: 100,
                    redeemed_count: 5,
                    image_url: 'nike.jpg',
                    terms: 'Valid for one use only',
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gt: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockCoupons, error: null }),
            });

            const result = await getPartnerCoupons();

            expect(result).toEqual(mockCoupons);
            expect(result.length).toBe(1);
            expect(result[0].partner).toBe('Nike');
            expect(supabase.from).toHaveBeenCalledWith('partner_coupons');
        });

        it('should return empty array when no coupons available', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gt: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            });

            const result = await getPartnerCoupons();

            expect(result).toEqual([]);
        });

        it('should return empty array on error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gt: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            });

            const result = await getPartnerCoupons();

            expect(result).toEqual([]);
        });
    });

    describe('redeemPartnerCouponWithPoints', () => {
        const mockCouponId = 'coupon-123';

        it('should redeem coupon successfully', async () => {
            const mockResponse = {
                success: true,
                code: 'UNIQUE-CODE-123',
                redemption_id: 'redemption-456',
            };

            (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResponse, error: null });

            const result = await redeemPartnerCouponWithPoints(mockUserId, mockCouponId);

            expect(result.success).toBe(true);
            expect(result.code).toBe('UNIQUE-CODE-123');
            expect(result.redemption_id).toBe('redemption-456');
            expect(supabase.rpc).toHaveBeenCalledWith('redeem_partner_coupon', {
                p_user_id: mockUserId,
                p_coupon_id: mockCouponId,
            });
        });

        it('should handle insufficient points error', async () => {
            const mockResponse = {
                success: false,
                error: 'Insufficient points',
            };

            (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResponse, error: null });

            const result = await redeemPartnerCouponWithPoints(mockUserId, mockCouponId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient points');
        });

        it('should handle coupon out of stock error', async () => {
            const mockResponse = {
                success: false,
                error: 'Coupon is out of stock',
            };

            (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockResponse, error: null });

            const result = await redeemPartnerCouponWithPoints(mockUserId, mockCouponId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Coupon is out of stock');
        });

        it('should handle database error', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
            });

            const result = await redeemPartnerCouponWithPoints(mockUserId, mockCouponId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database connection failed');
        });

        it('should handle unexpected exception', async () => {
            (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await redeemPartnerCouponWithPoints(mockUserId, mockCouponId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('An unexpected error occurred');
        });
    });

    describe('getUserRedeemedCoupons', () => {
        it('should return user redeemed coupons', async () => {
            const mockRedemptions = [
                {
                    id: 'redemption-1',
                    user_id: mockUserId,
                    coupon_id: 'coupon-1',
                    code_used: 'UNIQUE-CODE-1',
                    points_spent: 500,
                    redeemed_at: '2026-01-15T10:00:00Z',
                    is_used: false,
                    used_at: null,
                    coupon: {
                        title: '10% OFF',
                        partner: 'Nike',
                    },
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockRedemptions, error: null }),
            });

            const result = await getUserRedeemedCoupons(mockUserId);

            expect(result).toEqual(mockRedemptions);
            expect(result.length).toBe(1);
            expect(supabase.from).toHaveBeenCalledWith('user_coupon_redemptions');
        });

        it('should return empty array when no redemptions', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            });

            const result = await getUserRedeemedCoupons(mockUserId);

            expect(result).toEqual([]);
        });

        it('should return empty array on error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
            });

            const result = await getUserRedeemedCoupons(mockUserId);

            expect(result).toEqual([]);
        });
    });
});
