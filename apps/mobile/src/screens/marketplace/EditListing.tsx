import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { BackButton, Button, Input } from '../../components/common';
import { updateListing, getListingById } from '../../services/supabase/marketplace';
import { supabase } from '../../services/supabase/client';

type EditListingProps = {
    navigation: any;
    route: {
        params: {
            listingId: string;
            listing?: any;
        };
    };
};

const CATEGORIES = [
    { key: 'shoes', label: 'Shoes', emoji: '👟' },
    { key: 'clothing', label: 'Clothing', emoji: '👕' },
    { key: 'accessories', label: 'Accessories', emoji: '⌚' },
    { key: 'electronics', label: 'Electronics', emoji: '📱' },
    { key: 'other', label: 'Other', emoji: '📦' },
];

const CONDITIONS = [
    { key: 'new', label: 'New', desc: 'Never used, with tags' },
    { key: 'like_new', label: 'Like New', desc: 'Used once or twice' },
    { key: 'good', label: 'Good', desc: 'Used but well maintained' },
    { key: 'fair', label: 'Fair', desc: 'Shows signs of wear' },
];

export const EditListing: React.FC<EditListingProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { listingId, listing: initialListing } = route.params;

    const [loading, setLoading] = useState(!initialListing);
    const [saving, setSaving] = useState(false);
    const [listing, setListing] = useState(initialListing);

    // Form state
    const [title, setTitle] = useState(initialListing?.title || '');
    const [description, setDescription] = useState(initialListing?.description || '');
    const [price, setPrice] = useState(initialListing ? String(initialListing.price_cents / 100) : '');
    const [category, setCategory] = useState(initialListing?.category || 'other');
    const [condition, setCondition] = useState(initialListing?.condition || 'good');
    const [images, setImages] = useState<string[]>(initialListing?.images || []);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        if (!initialListing) {
            loadListing();
        }
    }, [listingId]);

    const loadListing = async () => {
        try {
            const data = await getListingById(listingId);
            if (data) {
                setListing(data);
                setTitle(data.title);
                setDescription(data.description || '');
                setPrice(String(data.price_cents / 100));
                setCategory(data.category);
                setCondition(data.condition);
                setImages(data.images || []);
            }
        } catch (error) {
            console.error('Error loading listing:', error);
            Alert.alert(t('common.error'), t('marketplace.errorLoadingListing', 'Failed to load listing'));
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        Haptics.selectionAsync();

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('errors.permissionRequired'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setUploadingImage(true);
            try {
                // Upload image to storage
                const uri = result.assets[0].uri;
                const filename = `listing_${listingId}_${Date.now()}.jpg`;
                const response = await fetch(uri);
                const blob = await response.blob();

                const { data, error } = await supabase.storage
                    .from('marketplace-images')
                    .upload(filename, blob, { contentType: 'image/jpeg' });

                if (error) {
                    // Try avatars bucket as fallback
                    const { data: fallbackData, error: fallbackError } = await supabase.storage
                        .from('avatars')
                        .upload(`marketplace/${filename}`, blob, { contentType: 'image/jpeg' });

                    if (fallbackError) throw fallbackError;

                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(`marketplace/${filename}`);

                    setImages(prev => [...prev, urlData.publicUrl]);
                } else {
                    const { data: urlData } = supabase.storage
                        .from('marketplace-images')
                        .getPublicUrl(filename);

                    setImages(prev => [...prev, urlData.publicUrl]);
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                console.error('Error uploading image:', error);
                Alert.alert(t('common.error'), t('marketplace.errorUploadingImage', 'Failed to upload image'));
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const removeImage = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!title.trim()) {
            Alert.alert(t('common.error'), t('marketplace.titleRequired', 'Title is required'));
            return false;
        }
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 5) {
            Alert.alert(t('common.error'), t('marketplace.priceMinimum', 'Minimum price is R$ 5.00'));
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSaving(true);

        try {
            await updateListing(listingId, {
                title: title.trim(),
                description: description.trim(),
                price_cents: Math.round(parseFloat(price) * 100),
                category,
                condition,
                images,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                t('common.success'),
                t('marketplace.listingUpdated', 'Your listing has been updated'),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Error updating listing:', error);
            Alert.alert(t('common.error'), t('marketplace.errorUpdating', 'Failed to update listing'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <BackButton onPress={() => {
                            Haptics.selectionAsync();
                            navigation.goBack();
                        }} />
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>{t('marketplace.editListing', 'Edit Listing')}</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Images */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('marketplace.images', 'Images')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imageWrapper}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Text style={styles.removeImageText}>×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    style={styles.addImageButton}
                                    onPress={pickImage}
                                    disabled={uploadingImage}
                                >
                                    {uploadingImage ? (
                                        <ActivityIndicator color={theme.colors.brand.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.addImageIcon}>+</Text>
                                            <Text style={styles.addImageText}>{t('marketplace.addImage', 'Add')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

                        {/* Title */}
                        <View style={styles.section}>
                            <Input
                                label={t('marketplace.title', 'Title')}
                                value={title}
                                onChangeText={setTitle}
                                placeholder={t('marketplace.titlePlaceholder', 'e.g. Nike Air Zoom Pegasus 40')}
                                maxLength={100}
                            />
                        </View>

                        {/* Price */}
                        <View style={styles.section}>
                            <Text style={styles.inputLabel}>{t('marketplace.price', 'Price')}</Text>
                            <View style={styles.priceInputContainer}>
                                <Text style={styles.currencyLabel}>R$</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="0.00"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        {/* Category */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('marketplace.category', 'Category')}</Text>
                            <View style={styles.optionsGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.key}
                                        style={[
                                            styles.optionCard,
                                            category === cat.key && styles.optionCardActive
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setCategory(cat.key);
                                        }}
                                    >
                                        <Text style={styles.optionEmoji}>{cat.emoji}</Text>
                                        <Text style={[
                                            styles.optionLabel,
                                            category === cat.key && styles.optionLabelActive
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Condition */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('marketplace.condition', 'Condition')}</Text>
                            <View style={styles.conditionList}>
                                {CONDITIONS.map((cond) => (
                                    <TouchableOpacity
                                        key={cond.key}
                                        style={[
                                            styles.conditionCard,
                                            condition === cond.key && styles.conditionCardActive
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setCondition(cond.key);
                                        }}
                                    >
                                        <View style={styles.conditionInfo}>
                                            <Text style={[
                                                styles.conditionLabel,
                                                condition === cond.key && styles.conditionLabelActive
                                            ]}>
                                                {cond.label}
                                            </Text>
                                            <Text style={styles.conditionDesc}>{cond.desc}</Text>
                                        </View>
                                        <View style={[
                                            styles.radioOuter,
                                            condition === cond.key && styles.radioOuterActive
                                        ]}>
                                            {condition === cond.key && <View style={styles.radioInner} />}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Input
                                label={t('marketplace.description', 'Description')}
                                value={description}
                                onChangeText={setDescription}
                                placeholder={t('marketplace.descriptionPlaceholder', 'Describe the item, including size, color, any defects...')}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 100, textAlignVertical: 'top' }}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Button
                            title={t('common.saveChanges', 'Save Changes')}
                            onPress={handleSave}
                            loading={saving}
                        />
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    flex: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    imagesRow: {
        flexDirection: 'row',
    },
    imageWrapper: {
        width: 80,
        height: 80,
        marginRight: 12,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        fontSize: 18,
        color: '#FFF',
        fontWeight: 'bold',
    },
    addImageButton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageIcon: {
        fontSize: 24,
        color: theme.colors.brand.primary,
        fontWeight: 'bold',
    },
    addImageText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
    },
    currencyLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        paddingVertical: 16,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionCard: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionCardActive: {
        borderColor: theme.colors.brand.primary,
        backgroundColor: 'rgba(255,87,34,0.1)',
    },
    optionEmoji: {
        fontSize: 16,
        marginRight: 8,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    optionLabelActive: {
        color: theme.colors.brand.primary,
    },
    conditionList: {
        gap: 8,
    },
    conditionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    conditionCardActive: {
        borderColor: theme.colors.brand.primary,
        backgroundColor: 'rgba(255,87,34,0.1)',
    },
    conditionInfo: {
        flex: 1,
    },
    conditionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
    },
    conditionLabelActive: {
        color: '#FFF',
    },
    conditionDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterActive: {
        borderColor: theme.colors.brand.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.brand.primary,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
});
