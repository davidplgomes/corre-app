import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const changeLanguage = async (languageCode: string) => {
        try {
            await i18n.changeLanguage(languageCode);
            await AsyncStorage.setItem('userLanguage', languageCode);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    return (
        <View style={styles.container}>
            {LANGUAGES.map((language) => (
                <TouchableOpacity
                    key={language.code}
                    style={[
                        styles.languageButton,
                        i18n.language === language.code && styles.languageButtonActive,
                    ]}
                    onPress={() => changeLanguage(language.code)}
                >
                    <Text style={styles.flag}>{language.flag}</Text>
                    <Text
                        style={[
                            styles.languageName,
                            i18n.language === language.code && styles.languageNameActive,
                        ]}
                    >
                        {language.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    languageButtonActive: {
        backgroundColor: '#EDE9FE',
        borderColor: '#7C3AED',
    },
    flag: {
        fontSize: 24,
        marginRight: 12,
    },
    languageName: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    languageNameActive: {
        color: '#7C3AED',
        fontWeight: '600',
    },
});
