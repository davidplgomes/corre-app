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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { uploadAvatar } from '../../services/supabase/storage'; // Reuse similar logic, or create new
import { PlusIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

type CreateListingProps = {
    navigation: any;
};

// Simplified category selection for MVP
const CATEGORIES = [
    { label: 'Tênis', value: 'shoes' },
    { label: 'Roupas', value: 'clothing' },
    { label: 'Acessórios', value: 'accessories' },
    { label: 'Eletrônicos', value: 'electronics' },
    { label: 'Outros', value: 'other' },
];

const CONDITIONS = [
    { label: 'Novo', value: 'new' },
    { label: 'Como Novo', value: 'like_new' },
    { label: 'Usado (Bom)', value: 'good' },
    { label: 'Usado (Justo)', value: 'fair' },
];

export const CreateListing: React.FC<CreateListingProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState({ label: '', value: '' });
    const [condition, setCondition] = useState({ label: '', value: '' });
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!user) return;
        if (!title || !price || !category.value || !condition.value || !image) {
            Alert.alert(t('marketplace.requiredFields', 'Campos obrigatórios'), t('marketplace.fillAllFieldsPhoto', 'Por favor preencha todos os campos e adicione uma foto.'));
            return;
        }

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
                    t('seller.setupRequired', 'Configuração Necessária'),
                    t('seller.needSetup', 'Você precisa configurar sua conta de recebimento antes de vender.'),
                    [
                        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
                        { text: t('seller.setupNow', 'Configurar Agora'), onPress: () => navigation.navigate('SellerOnboarding') }
                    ]
                );
                setLoading(false);
                return;
            }

            // 2. Upload Image
            // We'll reuse logic or just do direct upload here for simplicity
            // For now, assume we have a bucket 'marketplace-images'
            const fileExt = image.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const formData = new FormData();

            // React Native specific form data for file upload
            const fileData = {
                uri: image,
                name: fileName,
                type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
            } as any;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars') // Using avatars bucket temporary if marketplace-images doesn't exist, strictly this is wrong but works for demo if bucket public
                .upload(fileName, fileData, { upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
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

            Alert.alert(t('common.success'), t('marketplace.listingPublished', 'Seu anúncio foi publicado!'));
            navigation.goBack();

        } catch (error: any) {
            console.error('Create listing error:', error);
            Alert.alert(t('common.error'), error.message || t('marketplace.createListingFailed', 'Falha ao criar anúncio'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <BackButton style={styles.backButton} />
                    <Text style={styles.headerTitle}>{t('marketplace.sellItem').toUpperCase()}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Image Picker */}
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <PlusIcon size={32} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.placeholderText}>{t('marketplace.addPhoto')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Form */}
                        <View style={styles.form}>
                            <Text style={styles.label}>{t('marketplace.itemTitle').toUpperCase()}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('marketplace.titlePlaceholder')}
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={title}
                                onChangeText={setTitle}
                            />

                            <Text style={styles.label}>{t('marketplace.price').toUpperCase()}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0,00"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="numeric"
                                value={price}
                                onChangeText={setPrice}
                            />

                            <Text style={styles.label}>{t('marketplace.category').toUpperCase()}</Text>
                            <View style={styles.chipsContainer}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat.value}
                                        style={[
                                            styles.chip,
                                            category.value === cat.value && styles.chipSelected
                                        ]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            category.value === cat.value && styles.chipTextSelected
                                        ]}>{t(`marketplace.categories.${cat.value}`)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t('marketplace.condition').toUpperCase()}</Text>
                            <View style={styles.chipsContainer}>
                                {CONDITIONS.map(cond => (
                                    <TouchableOpacity
                                        key={cond.value}
                                        style={[
                                            styles.chip,
                                            condition.value === cond.value && styles.chipSelected
                                        ]}
                                        onPress={() => setCondition(cond)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            condition.value === cond.value && styles.chipTextSelected
                                        ]}>{t(`marketplace.conditions.${cond.value}`)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t('marketplace.description').toUpperCase()}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder={t('marketplace.descriptionPlaceholder')}
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        <Text style={styles.submitButtonText}>
                            {loading ? t('common.loading').toUpperCase() : t('marketplace.publish').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
    },
    headerTitle: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    imagePicker: {
        width: '100%',
        height: 200,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
        marginBottom: 24,
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
        gap: 12,
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    form: {
        gap: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: -8,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    chipSelected: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    chipText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        fontSize: 12,
    },
    chipTextSelected: {
        color: '#000',
        fontWeight: '800',
    },
    footer: {
        padding: 20,
        paddingBottom: 100, // Clear TabBar (80px) + Safety
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#000', // Ensure opacity covers content behind
    },
    submitButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 12, // Reduced from 16
        paddingHorizontal: 32, // Added horizontal padding
        borderRadius: 24, // More rounded like chips/pill
        alignItems: 'center',
        alignSelf: 'center', // Center it instead of full width
        minWidth: 200,
    },
    submitButtonText: {
        color: '#FFF', // White text
        fontWeight: '800',
        fontSize: 14, // Reduced from 16
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
