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
import { ChevronRightIcon, VerifiedIcon } from '../../components/common/TabIcons';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

type ListingDetailsProps = {
    route: any;
    navigation: any;
};

export const ListingDetails: React.FC<ListingDetailsProps> = ({ route, navigation }) => {
    const { id } = route.params;
    const { user } = useAuth();
    const { t } = useTranslation();

    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const { data, error } = await supabase
                    .from('marketplace_listings')
                    .select(`
                        *,
                        seller:seller_id (id, full_name, avatar_url, membership_tier),
                        seller_account:seller_accounts!inner(charges_enabled)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setListing(data);
            } catch (error) {
                console.error('Error fetching listing details:', error);
                Alert.alert('Error', 'Could not load listing details');
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

            if (data?.error) {
                throw new Error(data.error);
            }

            // 2. Here we would integrate Stripe Payment Sheet
            // Since we don't have stripe-react-native configured in this environment, 
            // we will simulate a success for demonstration.

            Alert.alert(
                'Pagamento Iniciado',
                'Em um app real, o Stripe PaymentSheet abriria aqui com o clientSecret: ' + data.clientSecret?.substring(0, 10) + '...',
                [
                    { text: 'Simular Sucesso', onPress: () => handleSuccess() },
                    { text: 'Cancelar', style: 'cancel' }
                ]
            );

        } catch (error: any) {
            console.error('Buy error:', error);
            Alert.alert('Erro', error.message || 'Falha ao iniciar pagamento');
        } finally {
            setBuying(false);
        }
    };

    const handleSuccess = async () => {
        // Optimistic update (in real app, webhook handles this)
        Alert.alert('Sucesso!', 'Compra realizada com sucesso.');
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
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <View style={styles.backIcon}>
                            <ChevronRightIcon size={20} color="#FFF" />
                        </View>
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
                            {buying ? 'PROCESSANDO...' : 'COMPRAR AGORA'}
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
        left: 20,
    },
    backIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        transform: [{ rotate: '180deg' }],
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
