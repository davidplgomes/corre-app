import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeftIcon } from './TabIcons';

interface BackButtonProps {
    onPress?: () => void;
    color?: string;
    size?: number;
    style?: ViewStyle;
}

/**
 * Back button component used across screens.
 * Renders as a clean chevron-left icon.
 */
export const BackButton: React.FC<BackButtonProps> = ({
    onPress,
    color = '#FFF',
    size = 24,
    style,
}) => {
    const navigation = useNavigation();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <TouchableOpacity
            style={[styles.backButton, style]}
            onPress={handlePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <ChevronLeftIcon size={size} color={color} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    backButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
