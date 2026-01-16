import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
};

export const DigitalCard: React.FC<DigitalCardProps> = ({ member }) => {
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

    const getGradientColors = (tier: string): readonly [string, string, ...string[]] => {
        // We can map these to the theme.tierColors if we want strict adherence,
        // but for "Future Premium" we might want slightly richer gradients here.
        switch (tier.toLowerCase()) {
            case 'starter':
            case 'free':
                return ['#52525B', '#27272A']; // Zinc 600 -> Zinc 800
            case 'básico':
            case 'basico':
                return ['#22C55E', '#14532D']; // Green 500 -> Green 900
            case 'baixa pace':
                return ['#F97316', '#7C2D12']; // Orange 500 -> Orange 900
            case 'parceiro':
                return ['#EAB308', '#713F12']; // Yellow 500 -> Yellow 900
            default:
                return ['#3F3F46', '#18181B'] as const; // Default Dark
        }
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
                                <View>
                                    <Text style={styles.brandText}>CORRE</Text>
                                    <Text style={styles.clubText}>RUNNING CLUB</Text>
                                </View>
                                <View style={styles.tierBadge}>
                                    <Text style={styles.tierText}>{member.tier.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.chipContainer}>
                                <View style={styles.chip} />
                                <View style={styles.nfcIcon}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }}>•)))</Text>
                                </View>
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
                                    value={JSON.stringify({ id: member.id, type: 'member_checkin' })}
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
        borderColor: 'rgba(255,255,255,0.1)',
    },
    glassEffect: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    brandText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
        fontStyle: 'italic',
    },
    clubText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
    },
    tierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    tierText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    chipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    chip: {
        width: 45,
        height: 30,
        backgroundColor: '#e0c080', // Gold-ish chip color
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#b09050',
    },
    nfcIcon: {
        // Placeholder for NFC signal icon
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    valueMono: {
        fontSize: 16,
        fontFamily: 'Courier', // Monospace feel if available, or just generic
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    // Back styles
    qrContainer: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
    },
    scanText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        letterSpacing: 1,
    },
    helperText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    }
});
