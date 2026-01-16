import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/common';
import { supabase } from '../../services/supabase/client';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type EditProfileProps = {
    navigation: any;
};

export const EditProfile: React.FC<EditProfileProps> = ({ navigation }) => {
    const { profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [neighborhood, setNeighborhood] = useState(profile?.neighborhood || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim() || !neighborhood.trim()) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: fullName,
                    neighborhood: neighborhood,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile?.id);

            if (error) throw error;

            await refreshProfile();
            Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← Voltar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Editar Perfil</Text>
                    {/* Placeholder for right side to balance header */}
                    <View style={{ width: 60 }} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.formContainer}>
                        <Input
                            label="Nome Completo"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Seu nome completo"
                            autoCapitalize="words"
                        />

                        <View style={styles.spacer} />

                        <Input
                            label="Bairro"
                            value={neighborhood}
                            onChangeText={setNeighborhood}
                            placeholder="Seu bairro"
                        />

                        {/* Future: Avatar Upload could go here */}

                        <View style={styles.spacerLarge} />

                        <Button
                            title="Salvar Alterações"
                            onPress={handleSave}
                            loading={loading}
                        />
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    backButton: {
        paddingVertical: theme.spacing[2],
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
    },
    headerTitle: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    content: {
        flex: 1,
    },
    formContainer: {
        padding: theme.spacing[6],
    },
    spacer: {
        height: theme.spacing[4],
    },
    spacerLarge: {
        height: theme.spacing[8],
    },
});
