import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type ProductDetailProps = {
    route: any;
    navigation: any;
};

export const ProductDetail: React.FC<ProductDetailProps> = ({ route, navigation }) => {
    const { product } = route.params || {};

    if (!product) {
        return null;
    }

    const handleRedeem = () => {
        // Mock redeem action
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sucesso', 'Solicitação de resgate enviada!');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView style={styles.scrollView} bounces={false}>
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: product.image_url || product.image }} style={styles.image} />
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                    >
                        <ChevronRightIcon size={24} color="#000" />
                    </TouchableOpacity>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.imageOverlay}
                    />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.brand}>{product.brand}</Text>
                            <Text style={styles.title}>{product.title}</Text>
                        </View>
                        <View style={styles.pointsBadge}>
                            <Text style={styles.pointsValue}>{product.points || product.price}</Text>
                            <Text style={styles.pointsLabel}>{product.points ? 'pts' : 'EUR'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DESCRIÇÃO</Text>
                        <Text style={styles.description}>
                            {product.description || 'Produto exclusivo para membros do Corre App. Troque seus pontos por este item incrível e melhore sua performance. Disponível por tempo limitado.'}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DETALHES</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Categoria</Text>
                            <Text style={styles.detailValue}>{product.category}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Disponibilidade</Text>
                            <Text style={styles.detailValue}>Em estoque</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action */}
            <SafeAreaView edges={['bottom']} style={styles.footer}>
                <TouchableOpacity
                    style={styles.redeemButton}
                    onPress={handleRedeem}
                >
                    <Text style={styles.redeemText}>RESGATAR AGORA</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

// Simple LinearGradient replacement if not available or to simplify
const LinearGradient = ({ colors, style }: any) => (
    <View style={[style, { backgroundColor: 'transparent' }]} />
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        height: 400,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transform: [{ rotate: '180deg' }]
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    content: {
        padding: theme.spacing[6],
        marginTop: -40,
        backgroundColor: theme.colors.background.primary,
        borderTopLeftRadius: theme.radius.lg, // 16px soft corners
        borderTopRightRadius: theme.radius.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[6],
    },
    brand: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.bold as any,
        marginBottom: theme.spacing[1],
        textTransform: 'uppercase',
    },
    title: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
        maxWidth: 200,
    },
    pointsBadge: {
        alignItems: 'center',
        backgroundColor: theme.colors.background.card,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    pointsValue: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
    },
    pointsLabel: {
        fontSize: 10,
        color: theme.colors.text.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border.default,
        marginBottom: theme.spacing[6],
    },
    section: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[3],
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    description: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
        lineHeight: 24,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    detailLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
    },
    detailValue: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.semibold as any,
    },
    footer: {
        padding: theme.spacing[6],
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.default,
        backgroundColor: theme.colors.background.elevated,
    },
    redeemButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: theme.spacing[4],
        borderRadius: theme.radius.full,
        alignItems: 'center',
    },
    redeemText: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.bold as any,
        color: '#fff',
        letterSpacing: 1,
    },
});
