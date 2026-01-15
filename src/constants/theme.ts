// Corre App Design System
// Award-winning, minimal design inspired by Strava, Nike Run Club
// Focus: Typography, hierarchy, clean data visualization

export const theme = {
    // Minimal Color Palette - Black, White, Accent
    colors: {
        // Primary brand color - Energetic Orange (like Strava)
        brand: {
            primary: '#FF5722',
            secondary: '#FF7043',
            muted: 'rgba(255, 87, 34, 0.15)',
            subtle: 'rgba(255, 87, 34, 0.08)',
        },
        // Pure black and white for maximum contrast
        black: '#000000',
        white: '#FFFFFF',
        // Gray scale - carefully curated
        gray: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#EEEEEE',
            300: '#E0E0E0',
            400: '#BDBDBD',
            500: '#9E9E9E',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
            950: '#121212',
        },
        // Semantic colors - minimal
        success: '#00C853',
        warning: '#FFB300',
        error: '#FF1744',
        // Background colors - Dark theme
        background: {
            primary: '#000000',
            elevated: '#0A0A0A',
            card: '#121212',
            input: '#1A1A1A',
        },
        // Text colors - High contrast
        text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.7)',
            tertiary: 'rgba(255, 255, 255, 0.5)',
            disabled: 'rgba(255, 255, 255, 0.3)',
        },
        // Border colors - Subtle
        border: {
            default: 'rgba(255, 255, 255, 0.08)',
            hover: 'rgba(255, 255, 255, 0.15)',
            focus: 'rgba(255, 87, 34, 0.5)',
        },
        // Legacy color aliases for backward compatibility
        primary: {
            50: '#FFF3E0',
            100: '#FFE0B2',
            200: '#FFCC80',
            300: '#FFB74D',
            400: '#FFA726',
            500: '#FF9800',
            600: '#FF5722',
            700: '#E64A19',
            800: '#D84315',
            900: '#BF360C',
        },
        neutral: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#EEEEEE',
            300: '#E0E0E0',
            400: '#BDBDBD',
            500: '#9E9E9E',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
        },
    },

    // Typography - Strong hierarchy, modern fonts
    typography: {
        // Font sizes - Mobile optimized
        size: {
            // Display - Hero numbers, big stats
            displayXL: 72,
            displayLG: 56,
            displayMD: 48,
            displaySM: 40,
            // Headings
            h1: 32,
            h2: 24,
            h3: 20,
            h4: 18,
            // Body
            bodyLG: 17,
            bodyMD: 15,
            bodySM: 13,
            // Caption
            caption: 11,
            micro: 10,
        },
        // Font weights
        weight: {
            regular: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            black: '900',
        },
        // Letter spacing
        letterSpacing: {
            tighter: -2,
            tight: -1,
            normal: 0,
            wide: 0.5,
            wider: 1,
            widest: 2,
        },
        // Line heights
        lineHeight: {
            none: 1,
            tight: 1.1,
            snug: 1.25,
            normal: 1.4,
            relaxed: 1.6,
        },
    },

    // Spacing scale - strict 4pt grid
    spacing: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
        10: 40,
        12: 48,
        14: 56,
        16: 64,
        20: 80,
        24: 96,
        32: 128,
    },

    // Border radius - Minimal
    radius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 20,
        full: 9999,
    },

    // Shadows - Subtle, iOS-like
    shadows: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
        },
    },

    // Animation - Snappy, responsive
    animation: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
    },
};

// Tier colors - Premium feel
export const tierColors = {
    free: {
        primary: '#9E9E9E',
        label: 'STARTER',
        gradient: ['#6B7280', '#4B5563'],
    },
    basico: {
        primary: '#00C853',
        label: 'BÁSICO',
        gradient: ['#00C853', '#00A844'],
    },
    baixa_pace: {
        primary: '#FF5722',
        label: 'BAIXA PACE',
        gradient: ['#FF5722', '#E64A19'],
    },
    parceiros: {
        primary: '#FFB300',
        label: 'PARCEIRO',
        gradient: ['#FFB300', '#FF8F00'],
    },
};

// Event type styles - Minimal
export const eventStyles = {
    routine: {
        color: '#00C853',
        label: 'TREINO',
    },
    special: {
        color: '#FFB300',
        label: 'ESPECIAL',
    },
    race: {
        color: '#FF5722',
        label: 'CORRIDA',
    },
};

export default theme;
