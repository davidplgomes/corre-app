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

// Run Icon (para histórico) - Improved
export const RunIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Head */}
        <Circle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.5" />
        {/* Body and Limbs */}
        <Path
            d="M12 8v5l3 3l2-1 M12 13l-3 2l-1 4 M12 8l3-1l2 3 M12 8l-3 1l-2-2"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
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

// Settings Icon (Gear/Cog)
export const SettingsIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
    </Svg>
);

// Bell Icon (Notifications)
export const BellIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// Chevron Left Icon
export const ChevronLeftIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M15 18L9 12L15 6"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
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

// QR Code Icon (Scan)
export const QRCodeIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
        <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
        <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
        <Rect x="14" y="14" width="3" height="3" stroke={color} strokeWidth="1.5" />
        <Rect x="18" y="18" width="3" height="3" stroke={color} strokeWidth="1.5" />
        <Rect x="14" y="18" width="3" height="3" stroke={color} strokeWidth="1.5" />
        <Rect x="18" y="14" width="3" height="3" stroke={color} strokeWidth="1.5" />
        <Rect x="5" y="5" width="3" height="3" fill={color} />
        <Rect x="16" y="5" width="3" height="3" fill={color} />
        <Rect x="5" y="16" width="3" height="3" fill={color} />
    </Svg>
);

// Gift Icon (Redeem)
export const GiftIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="8" width="18" height="4" rx="1" stroke={color} strokeWidth="1.5" />
        <Path d="M12 8V21" stroke={color} strokeWidth="1.5" />
        <Rect x="5" y="12" width="14" height="9" rx="1" stroke={color} strokeWidth="1.5" />
        <Path d="M12 8C12 8 12 5 9 5C7 5 6 6 6 7C6 8 7 8 12 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 8C12 8 12 5 15 5C17 5 18 6 18 7C18 8 17 8 12 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
);

// Clock Icon (History)
export const ClockIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <Path d="M12 7V12L15 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Pencil Icon (Edit)
export const PencilIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// Instagram Icon
export const InstagramIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="2" width="20" height="20" rx="5" stroke={color} strokeWidth="1.5" />
        <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke={color} strokeWidth="1.5" />
        <Path d="M17.5 6.5h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

// Info Icon (About)
export const InfoIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
        <Path d="M12 16v-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 8h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

// Lock Icon
export const LockIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="1.5" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="1.5" />
    </Svg>
);

// Close Icon
export const CloseIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Arrow Right Icon (Join)
export const ArrowRightIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12 5L19 12L12 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Sunrise Icon (Early Bird) - Cleaner design
export const SunriseIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Horizon line */}
        <Path d="M3 18H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Half sun circle above horizon */}
        <Path d="M5 18C5 14.14 8.14 11 12 11C15.86 11 19 14.14 19 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Sun rays */}
        <Path d="M12 3V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M5.64 6.64L7.76 8.76" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M18.36 6.64L16.24 8.76" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
);

// Party Icon (Social) - Simple Confetti/Balloon style
export const PartyIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
        <Path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M15 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

// Verified Icon (Checkmark Badge)
export const VerifiedIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF',
    filled = false
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 12l2 2 4-4" stroke={filled ? '#000' : color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path
            d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth="1.5"
        />
    </Svg>
);

// Plus Icon (Add)
export const PlusIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 5V19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Filter Icon
export const FilterIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Search Icon
export const SearchIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 21L16.65 16.65" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Eye Icon (View)
export const EyeIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
    </Svg>
);

// Compass Icon (Explorer)
export const CompassIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#FFFFFF'
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
        <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
