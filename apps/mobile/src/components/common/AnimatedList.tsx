import React, { useCallback } from 'react';
import { FlatList, FlatListProps, ListRenderItem, ViewStyle } from 'react-native';
import Animated, {
    FadeInUp,
    FadeInDown,
    FadeInLeft,
    FadeInRight,
    SlideInUp,
    ZoomIn,
    Easing,
} from 'react-native-reanimated';

type AnimationType = 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'slideUp' | 'zoom';

interface AnimatedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
    renderItem: ListRenderItem<T>;
    /** Animation type for list items */
    animationType?: AnimationType;
    /** Delay between each item animation in ms */
    staggerDelay?: number;
    /** Duration of each item's animation in ms */
    animationDuration?: number;
    /** Maximum number of items to animate (rest appear instantly) */
    maxAnimatedItems?: number;
    /** Style for the animated item wrapper */
    itemContainerStyle?: ViewStyle;
}

const getEnteringAnimation = (
    type: AnimationType,
    index: number,
    staggerDelay: number,
    duration: number
) => {
    const delay = index * staggerDelay;
    // Use smooth easing for professional feel - no bouncy springs
    const easing = Easing.out(Easing.cubic);

    switch (type) {
        case 'fadeUp':
            return FadeInUp.delay(delay).duration(duration).easing(easing);
        case 'fadeDown':
            return FadeInDown.delay(delay).duration(duration).easing(easing);
        case 'fadeLeft':
            return FadeInLeft.delay(delay).duration(duration).easing(easing);
        case 'fadeRight':
            return FadeInRight.delay(delay).duration(duration).easing(easing);
        case 'slideUp':
            return SlideInUp.delay(delay).duration(duration).easing(easing);
        case 'zoom':
            return ZoomIn.delay(delay).duration(duration).easing(easing);
        default:
            return FadeInUp.delay(delay).duration(duration).easing(easing);
    }
};

export function AnimatedList<T>({
    renderItem,
    animationType = 'fadeUp',
    staggerDelay = 50,
    animationDuration = 400,
    maxAnimatedItems = 15,
    itemContainerStyle,
    ...flatListProps
}: AnimatedListProps<T>) {
    const animatedRenderItem: ListRenderItem<T> = useCallback(
        ({ item, index, separators }) => {
            // Only animate first N items to avoid performance issues
            const shouldAnimate = index < maxAnimatedItems;

            if (!shouldAnimate) {
                return renderItem({ item, index, separators });
            }

            return (
                <Animated.View
                    entering={getEnteringAnimation(
                        animationType,
                        index,
                        staggerDelay,
                        animationDuration
                    )}
                    style={itemContainerStyle}
                >
                    {renderItem({ item, index, separators })}
                </Animated.View>
            );
        },
        [renderItem, animationType, staggerDelay, animationDuration, maxAnimatedItems, itemContainerStyle]
    );

    return <FlatList {...flatListProps} renderItem={animatedRenderItem} />;
}

/** Hook to wrap individual items with entrance animation */
export const useAnimatedItem = (
    index: number,
    options?: {
        animationType?: AnimationType;
        staggerDelay?: number;
        animationDuration?: number;
        maxAnimatedItems?: number;
    }
) => {
    const {
        animationType = 'fadeUp',
        staggerDelay = 50,
        animationDuration = 400,
        maxAnimatedItems = 15,
    } = options || {};

    const shouldAnimate = index < maxAnimatedItems;

    if (!shouldAnimate) {
        return { entering: undefined };
    }

    return {
        entering: getEnteringAnimation(animationType, index, staggerDelay, animationDuration),
    };
};

/** Wrapper component for animated list items */
export const AnimatedListItem: React.FC<{
    index: number;
    children: React.ReactNode;
    animationType?: AnimationType;
    staggerDelay?: number;
    animationDuration?: number;
    maxAnimatedItems?: number;
    style?: ViewStyle;
}> = ({
    index,
    children,
    animationType = 'fadeUp',
    staggerDelay = 50,
    animationDuration = 400,
    maxAnimatedItems = 15,
    style,
}) => {
    const shouldAnimate = index < maxAnimatedItems;

    if (!shouldAnimate) {
        return <>{children}</>;
    }

    return (
        <Animated.View
            entering={getEnteringAnimation(animationType, index, staggerDelay, animationDuration)}
            style={style}
        >
            {children}
        </Animated.View>
    );
};
