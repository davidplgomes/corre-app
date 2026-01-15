import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type SettingsProps = {
    navigation: any;
};

export const Settings: React.FC<SettingsProps> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [darkMode, setDarkMode] = React.useState(true);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    const languages = [
        { code: 'pt', label: 'Português' },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backText}>← Voltar</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerLabel}>CONFIGURAÇÕES</Text>
                        <Text style={styles.headerTitle}>Preferências</Text>
                    </View>

                    {/* Notifications Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>NOTIFICAÇÕES</Text>
                        <View style={styles.settingCard}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Ativar Notificações</Text>
                                <Text style={styles.settingDescription}>
                                    Receba alertas de eventos e lembretes
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: theme.colors.gray[600], true: theme.colors.brand.primary }}
                                thumbColor={theme.colors.white}
                            />
                        </View>
                    </View>

                    {/* Appearance Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>APARÊNCIA</Text>
                        <View style={styles.settingCard}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Modo Escuro</Text>
                                <Text style={styles.settingDescription}>
                                    Interface com tema escuro
                                </Text>
                            </View>
                            <Switch
                                value={darkMode}
                                onValueChange={setDarkMode}
                                trackColor={{ false: theme.colors.gray[600], true: theme.colors.brand.primary }}
                                thumbColor={theme.colors.white}
                            />
                        </View>
                    </View>

                    {/* Language Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>IDIOMA</Text>
                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={styles.languageOption}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <Text style={styles.languageLabel}>{lang.label}</Text>
                                {i18n.language === lang.code && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Account Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CONTA</Text>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Editar Perfil</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Alterar Senha</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Privacidade</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SOBRE</Text>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Termos de Uso</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Política de Privacidade</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <View style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>Versão</Text>
                            <Text style={styles.versionText}>1.0.0</Text>
                        </View>
                    </View>
                </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // Header
    header: {
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[6],
    },
    backButton: {
        marginBottom: theme.spacing[3],
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
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

    // Section
    section: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    sectionTitle: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[3],
    },

    // Setting Card (with switch)
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    settingInfo: {
        flex: 1,
        marginRight: theme.spacing[4],
    },
    settingLabel: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    settingDescription: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },

    // Language Option
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    languageLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: theme.typography.weight.bold as any,
    },

    // Menu Item
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    menuItemLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
    },
    versionText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
    },
});
