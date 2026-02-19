import { getAvailablePoints, getCartItems, addToCart, removeFromCart, clearCart, consumePoints } from '../wallet';
import { supabase } from '../client';

// Mock the Supabase client
jest.mock('../client', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

describe('Wallet Service', () => {
    const mockUserId = 'test-user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAvailablePoints', () => {
        it('should return user points when successful', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ data: 500, error: null });

            const result = await getAvailablePoints(mockUserId);

            expect(result).toBe(500);
            expect(supabase.rpc).toHaveBeenCalledWith('get_available_points', {
                p_user_id: mockUserId,
            });
        });

        it('should return 0 when data is null', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

            const result = await getAvailablePoints(mockUserId);

            expect(result).toBe(0);
        });

        it('should throw error on database error', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Database error' } });

            await expect(getAvailablePoints(mockUserId)).rejects.toEqual({ message: 'Database error' });
        });
    });

    describe('getCartItems', () => {
        it('should return empty array when cart is empty', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            });

            const result = await getCartItems(mockUserId);

            expect(result).toEqual([]);
        });

        it('should throw error on database error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            });

            await expect(getCartItems(mockUserId)).rejects.toEqual({ message: 'Database error' });
        });
    });

    describe('addToCart', () => {
        it('should add item to cart successfully', async () => {
            const mockCartItem = {
                id: 'cart-item-1',
                user_id: mockUserId,
                item_type: 'shop',
                item_id: 'item-123',
                quantity: 2,
            };

            (supabase.from as jest.Mock).mockReturnValue({
                upsert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockCartItem, error: null }),
            });

            const result = await addToCart(mockUserId, 'shop', 'item-123', 2);

            expect(result).toEqual(mockCartItem);
            expect(supabase.from).toHaveBeenCalledWith('cart_items');
        });

        it('should throw error on database error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                upsert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            });

            await expect(addToCart(mockUserId, 'shop', 'item-123', 1)).rejects.toEqual({ message: 'Database error' });
        });
    });

    describe('removeFromCart', () => {
        it('should remove item from cart successfully', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            await expect(removeFromCart('cart-item-123')).resolves.toBeUndefined();
            expect(supabase.from).toHaveBeenCalledWith('cart_items');
        });

        it('should throw error on database error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
            });

            await expect(removeFromCart('cart-item-123')).rejects.toEqual({ message: 'Database error' });
        });
    });

    describe('clearCart', () => {
        it('should clear all cart items for user', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            await expect(clearCart(mockUserId)).resolves.toBeUndefined();
            expect(supabase.from).toHaveBeenCalledWith('cart_items');
        });

        it('should throw error on database error', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
            });

            await expect(clearCart(mockUserId)).rejects.toEqual({ message: 'Database error' });
        });
    });

    describe('consumePoints', () => {
        it('should deduct points from user successfully', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null });

            const result = await consumePoints(mockUserId, 100);

            expect(result).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('consume_points_fifo', {
                p_user_id: mockUserId,
                p_points_to_consume: 100,
            });
        });

        it('should throw error on insufficient points', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Insufficient points' } });

            await expect(consumePoints(mockUserId, 100)).rejects.toEqual({ message: 'Insufficient points' });
        });
    });
});
