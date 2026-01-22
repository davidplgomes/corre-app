import { supabase } from './client';

export type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string;
};

// Mock achievements for now, as we haven't implemented the full system yet
const MOCK_ACHIEVEMENTS: Achievement[] = [
    {
        id: '1',
        title: 'Primeiros Passos',
        description: 'Completou a primeira corrida',
        icon: '👟',
        earned_at: new Date().toISOString()
    },
    {
        id: '2',
        title: 'Madrugador',
        description: 'Correu antes das 6am',
        icon: '🌅',
        earned_at: new Date().toISOString()
    },
    {
        id: '3',
        title: 'Maratonista',
        description: 'Correu 42km no total',
        icon: '🏃',
        earned_at: new Date().toISOString()
    },
    {
        id: '4',
        title: 'Social',
        description: 'Participou de 5 eventos',
        icon: '🎉',
        earned_at: new Date().toISOString()
    },
    {
        id: '5',
        title: 'Explorador',
        description: 'Fez check-in em 3 locais diferentes',
        icon: '📍',
        earned_at: new Date().toISOString()
    }
];

export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
    // In a real app, we would fetch from a user_achievements table
    // For this demo, we'll return mock data based on user ID to simulate variety
    // const { data } = await supabase.from('user_achievements')...

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Randomize slightly for demo
    const count = userId.charCodeAt(0) % 3 + 3; // 3 to 5 achievements
    return MOCK_ACHIEVEMENTS.slice(0, count);
};
