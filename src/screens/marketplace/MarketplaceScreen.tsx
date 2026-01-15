import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    StatusBar,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

type MarketplaceScreenProps = {
    navigation: any;
};

// Mock Categories
const CATEGORIES = [
    { id: 'all', label: 'Todos' },
    { id: 'gear', label: 'Equipamentos' },
    { id: 'nutrition', label: 'Nutrição' },
    { id: 'digital', label: 'Digital' },
    { id: 'services', label: 'Serviços' },
];

// Mock Products
const PRODUCTS = [
    {
        id: '1',
        title: 'Tênis Running Pro',
        brand: 'Nike',
        points: 4500,
        category: 'gear',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
        featured: true,
    },
    {
        id: '2',
        title: 'Smartwatch Series 5',
        brand: 'Apple',
        points: 12000,
        category: 'gear',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80',
        featured: true,
    },
    {
        id: '3',
        title: 'Kit Suplementos',
        brand: 'Growth',
        points: 1200,
        category: 'nutrition',
        image: 'https://plus.unsplash.com/premium_photo-1675716443562-b771d72a3da7?w=500&q=80',
        featured: false,
    },
    {
        id: '4',
        title: 'Assinatura Premium',
        brand: 'Strava',
        points: 800,
        category: 'digital',
        image: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=500&q=80',
        featured: false,
    },
    {
        id: '5',
        title: 'Consulta Nutricionista',
        brand: 'Saúde+',
        points: 3000,
        category: 'services',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80',
        featured: false,
    },
    {
        id: '6',
        title: 'Camiseta Dry-Fit',
        brand: 'Adidas',
        points: 1500,
        category: 'gear',
        image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&q=80',
        featured: false,
    },
];

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({ navigation }) => {
    const { profile } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredProducts = selectedCategory === 'all'
        ? PRODUCTS
        : PRODUCTS.filter(p => p.category === selectedCategory);

    const renderProduct = ({ item }: { item: typeof PRODUCTS[0] }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => console.log('Product clicked')}
            activeOpacity={0.8}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                {item.featured && (
                    <View style={styles.featuredBadge}>
                        <Text style={styles.featuredText}>DESTAQUE</Text>
                    </View>
                )}
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productBrand}>{item.brand}</Text>
                <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.pointsContainer}>
                    <Text style={styles.pointsValue}>{item.points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>SHOP</Text>
                        <Text style={styles.headerTitle}>Marketplace</Text>
                    </View>
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>SEUS PONTOS</Text>
                        <Text style={styles.balanceValue}>{profile?.currentMonthPoints || 0}</Text>
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContent}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryPill,
                                    selectedCategory === cat.id && styles.categoryPillActive
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    selectedCategory === cat.id && styles.categoryTextActive
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[6],
    },
    headerLabel: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[1],
    },
    headerTitle: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    balanceContainer: {
        alignItems: 'flex-end',
    },
    balanceLabel: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        marginBottom: 2,
    },
    balanceValue: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
    },
    categoriesContainer: {
        marginBottom: theme.spacing[4],
    },
    categoriesContent: {
        paddingHorizontal: theme.spacing[6],
        gap: theme.spacing[3],
    },
    categoryPill: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        backgroundColor: theme.colors.background.card,
    },
    categoryPillActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    categoryText: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.weight.medium as any,
    },
    categoryTextActive: {
        color: theme.colors.white,
    },
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
    },
    productCard: {
        width: '48%',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    imageContainer: {
        height: 140,
        backgroundColor: theme.colors.background.elevated,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    featuredBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    featuredText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    productInfo: {
        padding: theme.spacing[3],
    },
    productBrand: {
        fontSize: 10,
        color: theme.colors.text.tertiary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    productTitle: {
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[2],
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    pointsValue: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
        marginRight: 4,
    },
    pointsLabel: {
        fontSize: 10,
        color: theme.colors.text.secondary,
    },
});
