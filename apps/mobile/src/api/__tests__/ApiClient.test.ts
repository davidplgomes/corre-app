import { apiClient } from '../ApiClient';
import { supabase } from '../../services/supabase/client';

// Mock the Supabase client service
jest.mock('../../services/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
        functions: {
            invoke: jest.fn(),
        }
    },
}));

describe('ApiClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(apiClient).toBeDefined();
    });

    it('should handle successful query', async () => {
        const mockData = { id: 1, name: 'Test' };
        // We are mocking the queryFn passed TO the query method, not the method itself
        const operation = jest.fn().mockResolvedValue({ data: mockData, error: null });

        const result = await apiClient.query('testQuery', operation);

        expect(result.data).toEqual(mockData);
        expect(result.error).toBeNull();
        expect(result.status).toBe('success');
    });

    it('should handle query error', async () => {
        const mockError = { message: 'Database error', code: 'DB_ERR' };
        const operation = jest.fn().mockResolvedValue({ data: null, error: mockError });

        const result = await apiClient.query('testError', operation);

        expect(result.data).toBeNull();
        expect(result.error).toEqual(expect.objectContaining({ message: 'Database error' }));
        expect(result.status).toBe('error');
    });

    it('should handle unhandled exception in query', async () => {
        const mockError = new Error('Network failure');
        const operation = jest.fn().mockRejectedValue(mockError);

        const result = await apiClient.query('testException', operation);

        expect(result.data).toBeNull();
        expect(result.error).toEqual(expect.objectContaining({ code: 'QUERY_EXCEPTION' }));
        expect(result.status).toBe('error');
    });
});
