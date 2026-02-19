import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from './BackButton';

type HeaderProps = {
    title: string;
    onBack?: () => void;
    rightElement?: React.ReactNode;
};

export const Header: React.FC<HeaderProps> = ({ title, onBack, rightElement }) => {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.container}>
            <BackButton onPress={handleBack} style={styles.backButton} />

            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>

            <View style={styles.rightElement}>
                {rightElement || <View style={{ width: 40 }} />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    backButton: {
        minWidth: 60,
        alignItems: 'flex-start',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: theme.typography.size.h4,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    rightElement: {
        minWidth: 60,
        alignItems: 'flex-end',
    },
});
