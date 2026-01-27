import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

interface ArrowLogoProps {
    size?: number;
    color?: string;
    backgroundColor?: string;
    style?: ViewStyle;
}

export const ArrowLogo: React.FC<ArrowLogoProps> = ({
    size = 44,
    color = '#FFFFFF',
    backgroundColor = '#000000',
    style
}) => {
    const containerStyle: ViewStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
    };

    const imageStyle: ImageStyle = {
        width: size * 0.8,
        height: size * 0.8,
        tintColor: color,
    };

    return (
        <View style={containerStyle}>
            <Image
                source={require('../../../assets/logo_transparent.png')}
                style={imageStyle}
                resizeMode="contain"
            />
        </View>
    );
};
