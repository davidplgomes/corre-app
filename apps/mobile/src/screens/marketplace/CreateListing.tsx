import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ImageBackground,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { PlusIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

type CreateListingProps = {
    navigation: any;
};

const CATEGORIES = [
    { label: 'Shoes', value: 'shoes', emoji: '👟' },
    { label: 'Clothing', value: 'clothing', emoji: '👕' },
    { label: 'Accessories', value: 'accessories', emoji: '⌚' },
    { label: 'Electronics', value: 'electronics', emoji: '📱' },
    { label: 'Other', value: 'other', emoji: '📦' },
];

const CONDITIONS = [
    { label: 'New', value: 'new', desc: 'With tags' },
    { label: 'Like New', value: 'like_new', desc: 'Barely used' },
    { label: 'Good', value: 'good', desc: 'Well maintained' },
    { label: 'Fair', value: 'fair', desc: 'Shows wear' },
];

export const CreateListing: React.FC<CreateListingProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState({ label: '', value: '', emoji: '' });
    const [condition, setCondition] = useState({ label: '', value: '', desc: '' });
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        Haptics.selectionAsync();
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleCreate = async () => {
        if (!user) return;
        const isPro = profile?.membershipTier && profile.membershipTier !== 'free';
        if (!isPro) {
            Alert.alert(
                t('marketplace.proRequired', 'Recurso Exclusivo'),
                t('marketplace.proRequiredDesc', 'Vender no marketplace é um benefício exclusivo para assinantes PRO. Faça o upgrade para anunciar seus itens.')
            );
            return;
        }

        if (!title || !price || !category.value || !condition.value || !image) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('marketplace.requiredFields', 'Required Fields'),
                t('marketplace.fillAllFieldsPhoto', 'Please fill all fields and add a photo.')
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            // 1. Check if user is a seller
            const { data: sellerAccount } = await supabase
                .from('seller_accounts')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!sellerAccount || !sellerAccount.charges_enabled) {
                Alert.alert(
                    t('seller.setupRequired', 'Setup Required'),
                    t('seller.needSetup', 'You need to set up your payment account before selling.'),
                    [
                        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                        { text: t('seller.setupNow', 'Setup Now'), onPress: () => navigation.navigate('SellerOnboarding') }
                    ]
                );
                setLoading(false);
                return;
            }

            // 2. Upload Image
            const fileExt = image.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const fileData = {
                uri: image,
                name: fileName,
                type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
            } as any;

            const { error: uploadError } = await supabase.storage
                .from('marketplace-images')
                .upload(fileName, fileData, { upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('marketplace-images')
                .getPublicUrl(fileName);

            // 3. Create Listing
            const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);

            const { error: insertError } = await supabase
                .from('marketplace_listings')
                .insert({
                    seller_id: user.id,
                    title,
                    description,
                    price_cents: priceCents,
                    images: [publicUrl],
                    category: category.value,
                    condition: condition.value,
                    status: 'active'
                });

            if (insertError) throw insertError;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('common.success'), t('marketplace.listingPublished', 'Your listing is now live!'));
            navigation.goBack();

        } catch (error: any) {
            console.error('Create listing error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), error.message || t('marketplace.createListingFailed', 'Failed to create listing'));
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (value: string) => {
        const cleaned = value.replace(/[^0-9]/g, '');
        if (!cleaned) return '';
        const number = parseInt(cleaned, 10) / 100;
        return number.toFixed(2).replace('.', ',');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/run_bg_club.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <BackButton onPress={() => {
                                Haptics.selectionAsync();
                                navigation.goBack();
                            }} />
                            <View style={styles.headerTitles}>
                                <Text style={styles.headerLabel}>{t('marketplace.newListing', 'NEW LISTING')}</Text>
                                <Text style={styles.headerTitle}>{t('marketplace.sellItem', 'SELL ITEM')}</Text>
                            </View>
                        </View>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            contentContainerStyle={styles.content}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Image Picker Card */}
                            <BlurView intensity={20} tint="dark" style={styles.imageCard}>
                                <TouchableOpacity
                                    style={styles.imagePicker}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.placeholderContainer}>
                                            <View style={styles.plusCircle}>
                                                <PlusIcon size={24} color="#FFF" />
                                            </View>
                                            <Text style={styles.placeholderText}>{t('marketplace.addPhoto', 'Add Photo')}</Text>
                                            <Text style={styles.placeholderHint}>Tap to upload</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </BlurView>

                            {/* Form Card */}
                            <BlurView intensity={20} tint="dark" style={styles.formCard}>
                                {/* Title */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('marketplace.itemTitle', 'TITLE')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('marketplace.titlePlaceholder', 'What are you selling?')}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                </View>

                                {/* Price */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('marketplace.price', 'PRICE')}</Text>
                                    <View style={styles.priceInputContainer}>
                                        <Text style={styles.currencySymbol}>R$</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            placeholder="0,00"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="numeric"
                                            value={price}
                                            onChangeText={(text) => setPrice(formatPrice(text))}
                                        />
                                    </View>
                                </View>

                                {/* Category */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('marketplace.category', 'CATEGORY')}</Text>
                                    <View style={styles.chipsContainer}>
                                        {CATEGORIES.map(cat => (
                                            <TouchableOpacity
                                                key={cat.value}
                                                style={[
                                                    styles.chip,
                                                    category.value === cat.value && styles.chipSelected
                                                ]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setCategory(cat);
                                                }}
                                            >
                                                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                                                <Text style={[
                                                    styles.chipText,
                                                    category.value === cat.value && styles.chipTextSelected
                                                ]}>
                                                    {t(`marketplace.categories.${cat.value}`, cat.label)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Condition */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('marketplace.condition', 'CONDITION')}</Text>
                                    <View style={styles.conditionsContainer}>
                                        {CONDITIONS.map(cond => (
                                            <TouchableOpacity
                                                key={cond.value}
                                                style={[
                                                    styles.conditionCard,
                                                    condition.value === cond.value && styles.conditionCardSelected
                                                ]}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setCondition(cond);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.conditionLabel,
                                                    condition.value === cond.value && styles.conditionLabelSelected
                                                ]}>
                                                    {t(`marketplace.conditions.${cond.value}`, cond.label)}
                                                </Text>
                                                <Text style={styles.conditionDesc}>{cond.desc}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Description */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('marketplace.description', 'DESCRIPTION')} <Text style={styles.optionalLabel}>(Optional)</Text></Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder={t('marketplace.descriptionPlaceholder', 'Add details about your item...')}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        multiline
                                        numberOfLines={4}
                                        value={description}
                                        onChangeText={setDescription}
                                    />
                                </View>
                            </BlurView>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Footer */}
                    <BlurView intensity={30} tint="dark" style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {t('marketplace.publish', 'PUBLISH LISTING')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </BlurView>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitles: {
        marginLeft: 8,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    // Content
    content: {
        padding: 20,
        paddingBottom: 140,
        gap: 16,
    },

    // Image Card
    imageCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    imagePicker: {
        height: 200,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    plusCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        marginBottom: 8,
    },
    placeholderText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    placeholderHint: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },

    // Form Card
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '800',
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 10,
    },
    optionalLabel: {
        fontWeight: '500',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 0,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 16,
        borderRadius: 12,
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
    },
    currencySymbol: {
        color: theme.colors.brand.primary,
        fontSize: 18,
        fontWeight: '900',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        paddingVertical: 14,
    },

    // Category Chips
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 6,
    },
    chipSelected: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipText: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '700',
        fontSize: 12,
    },
    chipTextSelected: {
        color: '#000',
        fontWeight: '800',
    },

    // Condition Cards
    conditionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    conditionCard: {
        width: '48%',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    conditionCardSelected: {
        backgroundColor: 'rgba(204, 255, 0, 0.15)',
        borderColor: theme.colors.brand.primary,
    },
    conditionLabel: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 2,
    },
    conditionLabelSelected: {
        color: theme.colors.brand.primary,
    },
    conditionDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 100,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    submitButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 1,
    },
});
