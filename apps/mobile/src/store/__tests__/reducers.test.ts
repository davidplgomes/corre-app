import { appReducer, initialAppState } from '../reducers';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../../types/user.types';
import { AppState } from '../../types/store.types';

describe('appReducer', () => {
    it('should return the initial state', () => {
        // @ts-ignore - passing undefined to test initial state initialization
        expect(appReducer(undefined, {} as any)).toEqual(initialAppState);
    });

    it('should handle AUTH_SET_SESSION', () => {
        const mockUser: User = {
            id: '123',
            email: 'test@example.com',
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
        } as unknown as User;

        const action = {
            type: 'AUTH_SET_SESSION',
            payload: { user: mockUser, session: { access_token: 'token' } as any }
        } as const;

        const newState = appReducer(initialAppState, action);

        expect(newState.auth.user).toEqual(mockUser);
        expect(newState.auth.isAuthenticated).toBe(true);
        expect(newState.auth.status).toBe('success');
    });

    it('should handle PROFILE_SET', () => {
        const mockProfile: any = {
            id: '123',
            full_name: 'Test User',
            neighborhood: 'Downtown',
        };

        const action = { type: 'PROFILE_SET', payload: mockProfile } as const;
        const newState = appReducer(initialAppState, action);

        expect(newState.profile.profile).toEqual(mockProfile);
        expect(newState.profile.status).toBe('success');
    });

    it('should handle AUTH_CLEAR_SESSION', () => {
        const loggedInState: AppState = {
            ...initialAppState,
            auth: {
                ...initialAppState.auth,
                isAuthenticated: true,
                user: { id: '123' } as User,
            },
        };

        const action = { type: 'AUTH_CLEAR_SESSION' } as const;
        const newState = appReducer(loggedInState, action);

        expect(newState.auth.isAuthenticated).toBe(false);
        expect(newState.auth.user).toBeNull();
    });
});
