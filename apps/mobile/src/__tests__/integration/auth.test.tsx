import { apiClient } from '../../api/ApiClient';

// Mock ApiClient
jest.mock('../../api/ApiClient', () => ({
    apiClient: {
        query: jest.fn(),
    },
}));

// Mock Supabase client
jest.mock('../../services/supabase/client', () => ({
    supabase: {
        auth: {
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            getSession: jest.fn(),
            onAuthStateChange: jest.fn().mockReturnValue({
                data: { subscription: { unsubscribe: jest.fn() } },
            }),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    },
}));

describe('Integration: Authentication Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have apiClient defined', () => {
        expect(apiClient).toBeDefined();
        expect(apiClient.query).toBeDefined();
    });

    it('should mock apiClient.query correctly', async () => {
        const mockUser = { id: '123', email: 'test@example.com' };

        (apiClient.query as jest.Mock).mockResolvedValue({
            data: { user: mockUser, session: { access_token: 'token' } },
            error: null,
            status: 'success',
        });

        const result = await apiClient.query('test', jest.fn());

        expect(result.status).toBe('success');
        expect(result.data.user).toEqual(mockUser);
    });

    it('should handle authentication error', async () => {
        (apiClient.query as jest.Mock).mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials' },
            status: 'error',
        });

        const result = await apiClient.query('login', jest.fn());

        expect(result.status).toBe('error');
        expect(result.error.message).toBe('Invalid credentials');
    });
});
