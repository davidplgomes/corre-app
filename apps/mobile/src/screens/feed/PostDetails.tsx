import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    SafeAreaView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { FeedPost, PostComment } from '../../types';
import { getFeedPosts, getComments, addComment, getPostLikesCount } from '../../services/supabase/feed';
import { useAuth } from '../../contexts/AuthContext';
import { FeedPostItem } from '../../components/feed/FeedPostItem';
import { ChatBubbleIcon } from '../../components/common/TabIcons';
import { LoadingSpinner, BackButton } from '../../components/common';

export const PostDetails: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { profile } = useAuth();
    const { postId, post: initialPost } = route.params as { postId: string, post?: FeedPost };

    const [post, setPost] = useState<FeedPost | null>(initialPost || null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(!initialPost);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadData();
    }, [postId]);

    const loadData = async () => {
        try {
            if (!post) {
                // If we didn't pass the post object, we'd need to fetch it.
                // For now, let's assume we always pass the post object or fetch minimal details if needed.
                // In a real app we might need getPostById(postId).
                // Existing getFeedPosts doesn't support getById directly easily without modification,
                // but usually we navigate from Feed so we have the post.
                // If deep linking, we'd need logic here.
                // For this implementation, we expect 'post' in params, or we could fetch feed and find it (inefficient).
                // Let's implement a quick fetch if missing, or handle graceful error.
                setLoading(false);
            }

            await fetchComments();
        } catch (error) {
            console.error('Error loading post details:', error);
            Alert.alert(t('common.error'), t('errors.loadPost'));
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            setLoadingComments(true);
            const data = await getComments(postId);
            setComments(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim() || !profile?.id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSending(true);

        try {
            const newComment = await addComment(postId, profile.id, commentText.trim());
            setComments(prev => [...prev, newComment]);
            setCommentText('');

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

        } catch (error) {
            console.error('Error sending comment:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setSending(false);
        }
    };

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <BackButton style={styles.backButton} />
                <Text style={styles.headerTitle}>{t('feed.postDetails').toUpperCase()}</Text>
                <View style={{ width: 40 }} />
            </View>
            {post && (
                <View style={styles.postContainer}>
                    <FeedPostItem item={post} />
                </View>
            )}
            <View style={styles.divider} />
            <Text style={styles.commentsTitle}>
                {t('feed.comments')} ({comments.length})
            </Text>
        </View>
    );

    const renderComment = ({ item }: { item: PostComment }) => {
        const user = item.users as any;

        const handleProfilePress = () => {
            if (user?.id) {
                navigation.navigate('UserProfile', { userId: user.id });
            }
        };

        return (
            <View style={styles.commentItem}>
                <TouchableOpacity onPress={handleProfilePress}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{user?.full_name?.charAt(0) || 'U'}</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <TouchableOpacity onPress={handleProfilePress}>
                            <Text style={styles.commentUser}>{user?.full_name}</Text>
                        </TouchableOpacity>
                        <Text style={styles.commentTime}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
            </View>
        );
    };

    if (loading) return <LoadingSpinner />;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        !loadingComments ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{t('feed.noComments')}</Text>
                            </View>
                        ) : null
                    }
                />

                <BlurView intensity={80} tint="dark" style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder={t('feed.writeComment')}
                        placeholderTextColor={theme.colors.text.tertiary}
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!commentText.trim() || sending) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSendComment}
                        disabled={!commentText.trim() || sending}
                    >
                        <ChatBubbleIcon size={20} color={!commentText.trim() ? theme.colors.text.tertiary : "#FFF"} />
                    </TouchableOpacity>
                </BlurView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.subtle,
    },
    backButton: {
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    postContainer: {
        paddingTop: 20,
        paddingHorizontal: 10,
    },
    listContent: {
        paddingBottom: 100,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border.subtle,
        marginVertical: 10,
        marginHorizontal: 20,
    },
    commentsTitle: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    avatarInitial: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    commentUser: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    commentTime: {
        color: theme.colors.text.tertiary,
        fontSize: 12,
    },
    commentText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        lineHeight: 20,
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.text.tertiary,
        fontStyle: 'italic',
    },
    inputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.subtle,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingRight: 40,
        color: '#FFF',
        maxHeight: 100,
        minHeight: 40,
    },
    sendButton: {
        position: 'absolute',
        right: 20,
        bottom: Platform.OS === 'ios' ? 35 : 15, // Align with input
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.background.elevated,
        opacity: 0.5,
    },
});
