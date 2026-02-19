import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ChatwootWidget from '@chatwoot/react-native-widget';
import { chatwootService } from '../../services/support/ChatwootService';
import { CONFIG } from '../../constants/config';
import { theme } from '../../constants/theme';

export const ChatwootWidgetContainer = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [user, setUser] = useState<{ identifier: string; email: string; name: string } | undefined>(undefined);

    // If service is disabled or config missing, don't render anything
    if (!chatwootService.isEnabled()) return null;

    useEffect(() => {
        // Subscribe to visibility changes
        const unsubscribeVisibility = chatwootService.subscribe((visible) => {
            setIsVisible(visible);
        });

        // Subscribe to user changes
        const unsubscribeUser = chatwootService.subscribeUser((newUser) => {
            setUser(newUser);
        });

        return () => {
            unsubscribeVisibility();
            unsubscribeUser();
        };
    }, []);

    return (
        <View style={isVisible ? styles.container : styles.hidden}>
            <ChatwootWidget
                websiteToken={CONFIG.chatwoot.websiteToken || ''}
                baseUrl={CONFIG.chatwoot.baseUrl || 'https://app.chatwoot.com'}
                locale="pt-BR"
                isModalVisible={isVisible}
                closeModal={() => chatwootService.hide()}
                user={user}
            // Customization
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // The widget handles its own modal, but we need this View to mount it
        // It doesn't actually need to take up space unless the widget itself is embedded, 
        // but this library typically uses a Modal.
        // If it uses a Modal, this container might not need styles.
    },
    hidden: {
        height: 0,
        width: 0,
        overflow: 'hidden'
    }
});
