// Corre App Design System
// Award-winning, minimal design inspired by Strava, Nike Run Club
// Focus: Typography, hierarchy, clean data visualization

export const theme = {
    // Minimal Color Palette - Black, White, Accent
    colors: {
        // Primary brand color - Energetic Orange (like Strava)
        // REDUCED USAGE: Only for primary actions/CTAs.
        brand: {
            primary: '#FF5722',
            secondary: '#FF7043',
            muted: '#27272A', // Hardcoded Zinc-800
            subtle: '#18181B', // Hardcoded Zinc-900
        },
        // Pure black and white for maximum contrast
        black: '#000000',
        white: '#FFFFFF',
        // Gray scale - OLED Optimized
        gray: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#EEEEEE',
            300: '#E0E0E0',
            400: '#A1A1AA', // Zinc-400
            500: '#71717A',
            600: '#52525B',
            700: '#3F3F46',
            800: '#27272A',
            900: '#18181B',
            950: '#09090B',
        },
        // Semantic colors
        success: '#22C55E', // Green
        warning: '#FBBF24', // Gold
        error: '#EF4444',
        // Background colors - OLED Dark Mode
        background: {
            primary: '#000000', // Pure Black
            secondary: '#09090B', // Very Dark Zinc (was #121212)
            elevated: '#18181B', // Zinc-900 (was 1C1C1E)
            card: '#18181B', // Zinc-900 for lighter cards
            input: '#27272A', // Dark Zinc
        },
        // Text colors
        text: {
            primary: '#FFFFFF',
            secondary: '#A1A1AA', // Zinc-400
            tertiary: '#71717A', // Zinc-500
            disabled: '#52525B',
        },
        // Border colors
        border: {
            default: '#27272A', // Zinc-800
            subtle: '#18181B',
            hover: '#3F3F46',
            focus: '#FFFFFF', // White focus
        },
        // Legacy color aliases
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
            displayXL: 72,
            displayLG: 56,
            displayMD: 48,
            displaySM: 40,
            h1: 28, // Adjusted to spec ~28px
            h2: 24, // Adjusted
            h3: 20,
            h4: 18, // Spec: Card Titles ~18px
            h5: 16,
            bodyLG: 16, // Spec: Body ~14-16px area
            bodyMD: 14, // Spec: Body
            bodySM: 13,
            caption: 12,
            micro: 10,
        },
        weight: {
            regular: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            black: '900',
        },
        letterSpacing: {
            tighter: -0.8,
            tight: -0.4,
            normal: 0,
            wide: 0.4,
            wider: 0.8,
            widest: 1.6,
        },
        lineHeight: {
            none: 1,
            tight: 1.1,
            snug: 1.3,
            normal: 1.5,
            relaxed: 1.7,
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

    // Border radius - Modern Rounded
    radius: {
        none: 0,
        sm: 8, // Softer small radius
        md: 12, // Buttons spec: 8-12px
        lg: 16, // Cards spec: 16px
        xl: 24,
        '2xl': 32,
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
