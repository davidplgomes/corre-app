import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
    filled?: boolean;
}

// Home Icon
export const HomeIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <Path d="M12 3L2 12H5V20H9V14H15V20H19V12H22L12 3Z" fill={color} />
        ) : (
            <Path d="M12 3L2 12H5V20H9V14H15V20H19V12H22L12 3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
    </Svg>
);

// Calendar Icon (Eventos)
export const CalendarIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <>
                <Rect x="3" y="4" width="18" height="18" rx="3" fill={color} />
                <Path d="M8 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <Path d="M16 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <Rect x="3" y="10" width="18" height="1" fill="#000" opacity="0.3" />
            </>
        ) : (
            <>
                <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5" />
                <Path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                <Path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                <Path d="M3 10H21" stroke={color} strokeWidth="1.5" />
            </>
        )}
    </Svg>
);

// Trophy Icon (Ranking)
export const TrophyIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <Path
                d="M12 17C15.866 17 19 13.866 19 10V4H5V10C5 13.866 8.13401 17 12 17ZM12 17V21M8 21H16M3 4H5M19 4H21M3 4V7C3 8.10457 3.89543 9 5 9M21 4V7C21 8.10457 20.1046 9 19 9"
                fill={color}
            />
        ) : (
            <Path
                d="M12 17C15.866 17 19 13.866 19 10V4H5V10C5 13.866 8.13401 17 12 17ZM12 17V21M8 21H16M3 4H5M19 4H21M3 4V7C3 8.10457 3.89543 9 5 9M21 4V7C21 8.10457 20.1046 9 19 9"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        )}
    </Svg>
);

// Card Icon (Cartão)
export const CardIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <>
                <Rect x="2" y="5" width="20" height="14" rx="3" fill={color} />
                <Rect x="2" y="9" width="20" height="3" fill="#000" opacity="0.3" />
            </>
        ) : (
            <>
                <Rect x="2" y="5" width="20" height="14" rx="3" stroke={color} strokeWidth="1.5" />
                <Path d="M2 10H22" stroke={color} strokeWidth="1.5" />
                <Path d="M6 15H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </>
        )}
    </Svg>
);

// Person Icon (Perfil)
export const PersonIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <>
                <Circle cx="12" cy="8" r="4" fill={color} />
                <Path
                    d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z"
                    fill={color}
                />
            </>
        ) : (
            <>
                <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" />
                <Path
                    d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z"
                    stroke={color}
                    strokeWidth="1.5"
                />
            </>
        )}
    </Svg>
);

// Run Icon (para histórico)
export const RunIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="17" cy="4" r="2" stroke={color} strokeWidth="1.5" />
        <Path
            d="M15 8L12 11L9 9L5 13"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 11L15 14L12 20"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M9 17L7 22"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </Svg>
);

// Medal Icon (para conquistas)
export const MedalIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="14" r="6" stroke={color} strokeWidth="1.5" />
        <Path d="M8 4L10 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M16 4L14 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M9 14H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
);

// Settings Icon
export const SettingsIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
        <Path
            d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </Svg>
);

// Chevron Right Icon
export const ChevronRightIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M9 6L15 12L9 18"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// Shopping Bag Icon (Marketplace)
export const ShoppingBagIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <>
                <Path
                    d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                    fill={color}
                />
                <Path
                    d="M3 6H21"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Path
                    d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                />
            </>
        ) : (
            <>
                <Path
                    d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Path
                    d="M3 6H21"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Path
                    d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </>
        )}
    </Svg>
);

// Map Icon
export const MapIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M1 6V22L8 18L16 22L23 18V2L16 6L8 2L1 6Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 2V18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 6V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
// Feed Icon (Social)
export const FeedIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <>
                <Rect x="4" y="4" width="16" height="16" rx="4" fill={color} />
                <Path d="M8 8H16" stroke="#000" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                <Path d="M8 12H16" stroke="#000" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                <Path d="M8 16H12" stroke="#000" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </>
        ) : (
            <>
                <Rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth="1.5" />
                <Path d="M8 9H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                <Path d="M8 13H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                <Path d="M8 17H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </>
        )}
    </Svg>
);

// Heart Icon (Like)
export const HeartIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <Path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill={color}
                stroke={color}
                strokeWidth="2"
            />
        ) : (
            <Path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        )}
    </Svg>
);

// Chat Bubble Icon (Comment)
export const ChatBubbleIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <Path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                fill={color}
            />
        ) : (
            <Path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        )}
    </Svg>
);

// Pin Icon (Check-in)
export const PinIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {filled ? (
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill={color} />
        ) : (
            <>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
        )}
    </Svg>
);

// Text/Post Icon
export const TextIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17 10H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 6H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 14H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 18H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
