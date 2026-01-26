import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    withSpring,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - theme.spacing[12]; // standard margin
const CARD_HEIGHT = CARD_WIDTH * 0.63; // Credit card aspect ratio

type DigitalCardProps = {
    member: {
        name: string;
        id: string;
        tier: string;
        tierColor: string;
    };
    qrData?: string;
};

export const DigitalCard: React.FC<DigitalCardProps> = ({ member, qrData }) => {
    const rotate = useSharedValue(0);

    const handleFlip = () => {
        Haptics.selectionAsync();
        // Toggle between 0 and 180 degrees
        rotate.value = withSpring(rotate.value === 0 ? 1 : 0, {
            damping: 15,
            stiffness: 100,
        });
    };

    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateValue = interpolate(rotate.value, [0, 1], [0, 180]);
        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateValue}deg` },
            ],
            opacity: interpolate(rotate.value, [0, 0.5, 1], [1, 0, 0]),
            zIndex: rotate.value < 0.5 ? 1 : 0,
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateValue = interpolate(rotate.value, [0, 1], [180, 360]);
        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateValue}deg` },
            ],
            opacity: interpolate(rotate.value, [0, 0.5, 1], [0, 0, 1]),
            zIndex: rotate.value > 0.5 ? 1 : 0,
        };
    });

    // Enforce B&W / Monochrome Aesthetic
    const getGradientColors = (tier: string): readonly [string, string, ...string[]] => {
        // All tiers use a sleek dark/black gradient now
        return ['#27272A', '#000000'] as const;
    };

    return (
        <TouchableOpacity activeOpacity={1} onPress={handleFlip}>
            <View style={styles.container}>
                {/* Front Control */}
                <Animated.View style={[styles.cardCommon, frontAnimatedStyle]}>
                    <LinearGradient
                        colors={getGradientColors(member.tier)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        {/* Glass Overlay Effect */}
                        <View style={styles.glassEffect} />

                        {/* Noise/Texture could go here if we had an image asset */}

                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <View style={styles.brandContainer}>
                                    <Image
                                        source={require('../../../assets/logo_transparent.png')}
                                        style={styles.cardLogo}
                                        resizeMode="contain"
                                    />
                                    <View>
                                        <Text style={styles.brandText}>CORRE</Text>
                                        <Text style={styles.clubText}>RUNNING CLUB</Text>
                                    </View>
                                </View>
                                {/* Removed Tier Badge for cleaner look, or keep it if essential? Keeping for now but styled B&W */}
                                <View style={styles.tierBadge}>
                                    <Text style={styles.tierText}>{member.tier.toUpperCase()}</Text>
                                </View>
                            </View>

                            {/* Center Logo/Icon or Empty Space for Cleanliness */}
                            <View style={styles.centerDecor}>
                                {/* Optional: Put a large transparent arrows logo here if desired */}
                            </View>

                            <View style={styles.cardFooter}>
                                <View>
                                    <Text style={styles.label}>NOME</Text>
                                    <Text style={styles.value}>{member.name.toUpperCase()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.label}>ID DO MEMBRO</Text>
                                    <Text style={styles.valueMono}>{member.id}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Back Control */}
                <Animated.View style={[styles.cardCommon, styles.cardBack, backAnimatedStyle]}>
                    <LinearGradient
                        colors={['#18181B', '#09090B']}
                        style={styles.cardGradient}
                    >
                        <View style={styles.cardContentBack}>
                            <Text style={styles.scanText}>ESCANEIE PARA PONTUAR</Text>

                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={qrData || JSON.stringify({ id: member.id, type: 'member_checkin' })}
                                    size={CARD_HEIGHT * 0.5} // Responsive size
                                    color="black"
                                    backgroundColor="white"
                                />
                            </View>

                            <Text style={styles.helperText}>Toque para virar</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardCommon: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        borderRadius: 16,
        backfaceVisibility: 'hidden', // Crucial for 3D flip
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    cardBack: {
        // Basic back styling setup
    },
    cardGradient: {
        flex: 1,
        borderRadius: 16,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)', // Crisp border
    },
    glassEffect: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.03)', // Very subtle tint
        zIndex: 0,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
        zIndex: 1,
    },
    cardContentBack: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardLogo: {
        width: 80, // Increased significantly to 80
        height: 80,
    },
    brandText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    clubText: {
        fontSize: 8,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 3,
    },
    tierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tierText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    centerDecor: {
        flex: 1,
        // Could be used for pattern overlay
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    valueMono: {
        fontSize: 14,
        fontFamily: 'Courier', // Monospace feel if available
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    // Back styles
    qrContainer: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
    },
    scanText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 20,
        letterSpacing: 2,
    },
    helperText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
