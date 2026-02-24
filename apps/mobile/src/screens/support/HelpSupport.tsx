import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { theme } from '../../constants/theme';
import { BackButton } from '../../components/common';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type HelpSupportProps = {
    navigation: any;
};

interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
}

const FAQ_DATA: FAQItem[] = [
    {
        id: '1',
        category: 'Getting Started',
        question: 'How do I connect my Strava account?',
        answer: 'Go to Profile > Settings > Connected Apps and tap "Connect Strava". You\'ll be redirected to Strava to authorize the connection. Once connected, your activities will sync automatically.',
    },
    {
        id: '2',
        category: 'Getting Started',
        question: 'How do I earn points?',
        answer: 'You earn points by completing runs (synced from Strava), checking into events, referring friends, and participating in community challenges. Points can be used for discounts in the shop.',
    },
    {
        id: '3',
        category: 'Events',
        question: 'How do I check into an event?',
        answer: 'When you\'re at an event location, open the event details and tap "Check In". Make sure location services are enabled. You must be within 200 meters of the event location.',
    },
    {
        id: '4',
        category: 'Events',
        question: 'Can I create my own running event?',
        answer: 'Yes! Tap the "+" button on the Events tab to create a new event. You can set the date, time, location, and distance. Friends can join and check in to earn points.',
    },
    {
        id: '5',
        category: 'Points & Rewards',
        question: 'Do my points expire?',
        answer: 'Yes, points expire 12 months after they are earned. You can see your points expiration dates in the Wallet section. Use them before they expire!',
    },
    {
        id: '6',
        category: 'Points & Rewards',
        question: 'How do I use points for purchases?',
        answer: 'During checkout, you\'ll see an option to apply your available points. Each 100 points equals €1 discount. The maximum discount is 50% of the order total.',
    },
    {
        id: '7',
        category: 'Marketplace',
        question: 'How do I sell items on the marketplace?',
        answer: 'Go to Marketplace > My Listings > Create Listing. You\'ll need to set up a Stripe Connect account to receive payments. Once approved, you can list running gear for sale.',
    },
    {
        id: '8',
        category: 'Account',
        question: 'How do I delete my account?',
        answer: 'Go to Profile > Settings > Account > Delete Account. This action is permanent and will remove all your data, including points, order history, and activity records.',
    },
];

const SUPPORT_OPTIONS = [
    {
        id: 'email',
        title: 'Email Support',
        description: 'Get help within 24 hours',
        icon: '📧',
        action: 'email',
    },
    {
        id: 'instagram',
        title: 'Instagram',
        description: '@correapp',
        icon: '📸',
        action: 'instagram',
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp',
        description: 'Quick chat support',
        icon: '💬',
        action: 'whatsapp',
    },
];

export const HelpSupport: React.FC<HelpSupportProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', ...Array.from(new Set(FAQ_DATA.map(faq => faq.category)))];

    const filteredFAQs = selectedCategory === 'All'
        ? FAQ_DATA
        : FAQ_DATA.filter(faq => faq.category === selectedCategory);

    const handleSupportAction = async (action: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        switch (action) {
            case 'email':
                try {
                    await Linking.openURL('mailto:support@correapp.com?subject=App%20Support%20Request');
                } catch (error) {
                    Alert.alert('Error', 'Could not open email client');
                }
                break;
            case 'instagram':
                try {
                    await Linking.openURL('instagram://user?username=correapp');
                } catch {
                    await Linking.openURL('https://instagram.com/correapp');
                }
                break;
            case 'whatsapp':
                try {
                    await Linking.openURL('https://wa.me/5511999999999?text=Hi,%20I%20need%20help%20with%20the%20Corre%20app');
                } catch (error) {
                    Alert.alert('Error', 'Could not open WhatsApp');
                }
                break;
        }
    };

    const toggleFAQ = (id: string) => {
        Haptics.selectionAsync();
        setExpandedFAQ(expandedFAQ === id ? null : id);
    };

    const appVersion = Constants.expoConfig?.version || '1.0.0';

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
                                <Text style={styles.headerLabel}>HELP &</Text>
                                <Text style={styles.headerTitle}>SUPPORT</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Contact Options */}
                        <Text style={styles.sectionTitle}>CONTACT US</Text>
                        <View style={styles.supportGrid}>
                            {SUPPORT_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    onPress={() => handleSupportAction(option.action)}
                                    activeOpacity={0.8}
                                >
                                    <BlurView intensity={20} tint="dark" style={styles.supportCard}>
                                        <View style={styles.supportIconContainer}>
                                            <Text style={styles.supportIcon}>{option.icon}</Text>
                                        </View>
                                        <Text style={styles.supportTitle}>{option.title}</Text>
                                        <Text style={styles.supportDescription}>{option.description}</Text>
                                    </BlurView>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* FAQ Section */}
                        <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>

                        {/* Category Filter */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryScroll}
                            contentContainerStyle={styles.categoryContainer}
                        >
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.categoryPill,
                                        selectedCategory === category && styles.categoryPillActive
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedCategory(category);
                                    }}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        selectedCategory === category && styles.categoryTextActive
                                    ]}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* FAQ Items */}
                        {filteredFAQs.map((faq) => (
                            <TouchableOpacity
                                key={faq.id}
                                onPress={() => toggleFAQ(faq.id)}
                                activeOpacity={0.8}
                            >
                                <BlurView
                                    intensity={expandedFAQ === faq.id ? 25 : 15}
                                    tint="dark"
                                    style={[
                                        styles.faqCard,
                                        expandedFAQ === faq.id && styles.faqCardExpanded
                                    ]}
                                >
                                    <View style={styles.faqHeader}>
                                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                                        <View style={[
                                            styles.faqChevron,
                                            expandedFAQ === faq.id && styles.faqChevronExpanded
                                        ]}>
                                            <ChevronRightIcon
                                                size={18}
                                                color="rgba(255,255,255,0.5)"
                                            />
                                        </View>
                                    </View>
                                    {expandedFAQ === faq.id && (
                                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                    )}
                                </BlurView>
                            </TouchableOpacity>
                        ))}

                        {/* Quick Links */}
                        <Text style={styles.sectionTitle}>QUICK LINKS</Text>
                        <BlurView intensity={20} tint="dark" style={styles.linksCard}>
                            <TouchableOpacity
                                style={styles.linkRow}
                                onPress={() => Linking.openURL('https://correapp.com/privacy')}
                            >
                                <Text style={styles.linkText}>Privacy Policy</Text>
                                <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                            <View style={styles.linkDivider} />
                            <TouchableOpacity
                                style={styles.linkRow}
                                onPress={() => Linking.openURL('https://correapp.com/terms')}
                            >
                                <Text style={styles.linkText}>Terms of Service</Text>
                                <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                            <View style={styles.linkDivider} />
                            <TouchableOpacity
                                style={styles.linkRow}
                                onPress={() => Linking.openURL('https://strava.com/legal/api')}
                            >
                                <Text style={styles.linkText}>Strava API Terms</Text>
                                <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
                            </TouchableOpacity>
                        </BlurView>

                        {/* App Info */}
                        <BlurView intensity={15} tint="dark" style={styles.appInfoCard}>
                            <Text style={styles.appName}>Corre</Text>
                            <Text style={styles.appVersion}>Version {appVersion}</Text>
                            <Text style={styles.appCopyright}>Made with ❤️ in Sao Paulo</Text>
                        </BlurView>
                    </ScrollView>
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
        backgroundColor: 'rgba(0,0,0,0.75)',
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
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Section Title
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 16,
        marginTop: 8,
    },

    // Support Grid
    supportGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    supportCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        minWidth: 100,
    },
    supportIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    supportIcon: {
        fontSize: 22,
    },
    supportTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
        textAlign: 'center',
    },
    supportDescription: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },

    // Category Filter
    categoryScroll: {
        marginBottom: 16,
        marginHorizontal: -20,
    },
    categoryContainer: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    categoryPillActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
    },
    categoryTextActive: {
        color: '#000',
    },

    // FAQ Cards
    faqCard: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    faqCardExpanded: {
        borderColor: 'rgba(204, 255, 0, 0.3)',
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        marginRight: 12,
    },
    faqChevron: {
        transform: [{ rotate: '0deg' }],
    },
    faqChevronExpanded: {
        transform: [{ rotate: '90deg' }],
    },
    faqAnswer: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 20,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },

    // Links Card
    linksCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    linkDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    linkText: {
        fontSize: 14,
        color: '#FFF',
    },

    // App Info
    appInfoCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    appName: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        marginBottom: 4,
    },
    appVersion: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
    },
    appCopyright: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
    },
});

export default HelpSupport;
