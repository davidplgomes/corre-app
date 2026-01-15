import React from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    StatusBar,
    Platform,
    ScrollView,
    RefreshControl
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

interface ScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    // 'scroll' uses ScrollView, 'fixed' uses View, 'auto' is smart (not implemented yet, defaults to fixed)
    preset?: 'fixed' | 'scroll';
    // Background color override
    backgroundColor?: string;
    // Status bar style
    statusBarStyle?: 'light-content' | 'dark-content' | 'auto';
    // Edges to apply safe area padding to (default: all)
    safeAreaEdges?: Edge[];
    // Pull to refresh support
    onRefresh?: () => void;
    refreshing?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
    children,
    style,
    contentContainerStyle,
    preset = 'fixed',
    backgroundColor = theme.colors.background.primary,
    statusBarStyle = 'light-content',
    safeAreaEdges = ['top', 'left', 'right'], // Bottom is usually handled by content padding or tab bar
    onRefresh,
    refreshing = false,
}) => {
    const insets = useSafeAreaInsets();

    const containerStyle = [
        styles.container,
        { backgroundColor },
        {
            paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
            paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
            paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
            // We consciously don't add full bottom inset here because many screens have sticky footers
            // or the tab bar. It's better to handle bottom spacing via contentContainerStyle or specific footer components.
        },
        style,
    ];

    if (preset === 'scroll') {
        return (
            <View style={styles.outerContainer}>
                <StatusBar barStyle={statusBarStyle as any} backgroundColor={backgroundColor} />
                <ScrollView
                    style={[containerStyle, styles.scrollContainer]}
                    contentContainerStyle={[
                        styles.scrollContent,
                        // Add some default bottom padding for scroll views to ensure content isn't flush with edge
                        { paddingBottom: (safeAreaEdges.includes('bottom') ? insets.bottom : 0) + theme.spacing[8] },
                        contentContainerStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={theme.colors.brand.primary}
                            />
                        ) : undefined
                    }
                >
                    {children}
                </ScrollView>
            </View>
        );
    }

    // Fixed preset
    return (
        <View style={[styles.outerContainer, { backgroundColor }]}>
            <StatusBar barStyle={statusBarStyle as any} backgroundColor={backgroundColor} />
            <View style={containerStyle}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
});
