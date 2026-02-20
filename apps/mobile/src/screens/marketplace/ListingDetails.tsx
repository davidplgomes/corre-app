import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { formatDate } from '../../utils/date';
import { LoadingSpinner } from '../../components/common';
import { VerifiedIcon, CloseIcon } from '../../components/common/TabIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useStripe } from '@stripe/stripe-react-native';

const { width } = Dimensions.get('window');

type ListingDetailsProps = {
    route: any;
    navigation: any;
};

export const ListingDetails: React.FC<ListingDetailsProps> = ({ route, navigation }) => {
    const { id } = route.params;
    const { user, profile } = useAuth();
    const { t } = useTranslation();

    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const { data, error } = await supabase
                    .from('marketplace_items')
                    .select('*, seller:users!seller_id(id, full_name, avatar_url, membership_tier)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setListing(data);
            } catch (error) {
                console.error('Error fetching listing:', error);
                Alert.alert('Erro', 'Não foi possível carregar o anúncio.');
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id]);

    const handleBuy = async () => {
        if (!user) return;
        if (user.id === listing.seller.id) {
            Alert.alert('Erro', 'Você não pode comprar seu próprio item.');
            return;
        }

        setBuying(true);
        try {
            // 1. Call Edge Function to create Payment Intent
            const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
                body: { listing_id: listing.id }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Corre Marketplace',
                paymentIntentClientSecret: data.clientSecret,
                defaultBillingDetails: {
                    name: profile?.fullName || user.user_metadata?.full_name || '',
                },
                appearance: {
                    colors: {
                        primary: theme.colors.brand.primary,
                        background: '#1A1A1A',
                        componentBackground: '#2A2A2A',
                        primaryText: '#FFFFFF',
                        secondaryText: '#AAAAAA',
                        placeholderText: '#666666',
                    },
                    shapes: { borderRadius: 12 },
                }
            });

            if (initError) throw initError;

            // 3. Present Payment Sheet
            const { error: stripeError } = await presentPaymentSheet();

            if (stripeError) {
                if (stripeError.code === 'Canceled') return; // User cancelled
                throw stripeError;
            }

            // 4. Success handling
            await handleSuccess();

        } catch (error: any) {
            console.error('Buy error:', error);
            Alert.alert('Erro', error.message || 'Falha ao iniciar pagamento');
        } finally {
            setBuying(false);
        }
    };

    const handleSuccess = async () => {
        Alert.alert('Sucesso!', 'Compra realizada com sucesso!');
        navigation.goBack();
    };

    if (loading) return <LoadingSpinner />;
    if (!listing) return null;

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Gallery (Simplified to single image for now) */}
                <View style={styles.imageContainer}>
                    {listing.images && listing.images[0] ? (
                        <Image source={{ uri: listing.images[0] }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <CloseIcon size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{listing.title}</Text>
                            <Text style={styles.condition}>{listing.condition.toUpperCase()} • {listing.category?.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.price}>{formatPrice(listing.price_cents)}</Text>
                    </View>

                    {/* Seller Info */}
                    <View style={styles.sellerSection}>
                        <View style={styles.avatarContainer}>
                            {listing.seller.avatar_url ? (
                                <Image source={{ uri: listing.seller.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: theme.colors.brand.secondary }]} />
                            )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.sellerName}>{listing.seller.full_name}</Text>
                                {listing.seller.membership_tier === 'parceiros' && <VerifiedIcon size={14} color={theme.colors.brand.primary} />}
                            </View>
                            <Text style={styles.sellerLabel}>Vendedor</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DESCRIÇÃO</Text>
                        <Text style={styles.description}>{listing.description || 'Sem descrição.'}</Text>
                    </View>

                    {/* Meta */}
                    <Text style={styles.metaText}>Publicado em {formatDate(listing.created_at)}</Text>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <BlurView intensity={20} tint="dark" style={styles.actionBar}>
                <SafeAreaView edges={['bottom']}>
                    <TouchableOpacity
                        style={[styles.buyButton, buying && { opacity: 0.7 }]}
                        onPress={handleBuy}
                        disabled={buying}
                    >
                        <Text style={styles.buyButtonText}>
                            {buying ? t('marketplace.processing') : t('marketplace.buyNow')}
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    imageContainer: {
        width: width,
        height: width, // Square
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#FFF',
        fontWeight: '700',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4,
        marginRight: 12,
    },
    condition: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    price: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.brand.primary,
        fontVariant: ['tabular-nums'],
    },
    sellerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        marginBottom: 24,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    sellerLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 12,
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 24,
    },
    metaText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buyButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    buyButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
