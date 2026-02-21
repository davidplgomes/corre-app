import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../services/i18n';
import { theme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

type Language = 'en' | 'pt' | 'es';

interface LanguageOption {
    code: Language;
    flag: string;
    label: string;
}

const languages: LanguageOption[] = [
    { code: 'en', flag: '🇺🇸', label: 'EN' },
    { code: 'pt', flag: '🇧🇷', label: 'PT' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
];

export const LanguageSelector: React.FC = () => {
    const { i18n } = useTranslation();
    const currentLanguage = getCurrentLanguage();

    const handleLanguageChange = async (lang: Language) => {
        if (lang === currentLanguage) return;
        Haptics.selectionAsync();
        await changeLanguage(lang);
    };

    return (
        <View style={styles.container}>
            {languages.map((lang) => {
                const isActive = currentLanguage === lang.code;
                return (
                    <TouchableOpacity
                        key={lang.code}
                        style={[styles.button, isActive && styles.buttonActive]}
                        onPress={() => handleLanguageChange(lang.code)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.flag}>{lang.flag}</Text>
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {lang.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 6,
    },
    buttonActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: theme.colors.brand.primary,
    },
    flag: {
        fontSize: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 1,
    },
    labelActive: {
        color: theme.colors.brand.primary,
    },
});
