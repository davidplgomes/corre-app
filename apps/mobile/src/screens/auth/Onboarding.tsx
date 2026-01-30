import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    NativeScrollEvent,
    NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

type OnboardingProps = {
    navigation: any;
};

export const Onboarding: React.FC<OnboardingProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const slides = [
        {
            id: '1',
            title: t('onboarding.slide1Title'),
            description: t('onboarding.slide1Desc'),
            // Using a placeholder or existing image.
            image: require('../../../assets/run_bg_club.png'),
        },
        {
            id: '2',
            title: t('onboarding.slide2Title'),
            description: t('onboarding.slide2Desc'),
            image: require('../../../assets/run_bg_club.png'), // Ideally different images
        },
        {
            id: '3',
            title: t('onboarding.slide3Title'),
            description: t('onboarding.slide3Desc'),
            image: require('../../../assets/run_bg_club.png'),
        },
    ];

    const handleNext = async () => {
        Haptics.selectionAsync();
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        Haptics.selectionAsync();
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        // Navigate to ProfileSetup
        // The onboarding status will be set to true only after Profile Setup is finished.
        navigation.navigate('ProfileSetup');
    };

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.slide}>
            <ImageBackground
                source={item.image}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title.toUpperCase()}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </ImageBackground>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={onMomentumScrollEnd}
                bounces={false}
                style={styles.flatList}
            />

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
                {slides.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentIndex === index && styles.activeDot,
                        ]}
                    />
                ))}
            </View>

            {/* Buttons */}
            <SafeAreaView style={styles.footer} edges={['bottom']}>
                <View style={styles.buttonContainer}>
                    {currentIndex < slides.length - 1 ? (
                        <>
                            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                                <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                                <Text style={styles.nextText}>{t('common.next')}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
                            <Text style={styles.getStartedText}>{t('onboarding.getStarted').toUpperCase()}</Text>
                        </TouchableOpacity>
                    )}
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
    flatList: {
        flex: 1,
    },
    slide: {
        width,
        height,
        justifyContent: 'flex-end',
    },
    backgroundImage: {
        width,
        height,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        // Add a gradient effect manually if needed, or just partial opacity
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingBottom: 180, // Space for footer
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.brand.primary,
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: '#FFF',
        textAlign: 'center',
        opacity: 0.9,
        lineHeight: 24,
        maxWidth: '90%',
    },
    paginationContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 140,
        alignSelf: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        backgroundColor: theme.colors.brand.primary,
        width: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60,
    },
    skipButton: {
        padding: 12,
    },
    skipText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    nextButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    nextText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    getStartedButton: {
        backgroundColor: theme.colors.brand.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    getStartedText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
