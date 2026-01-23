import { supabase } from './client';

const AVATAR_BUCKET = 'avatars';

/**
 * Upload avatar image for a user using fetch/blob approach (no expo-file-system needed)
 * @param userId - The user's ID
 * @param imageUri - Local URI of the image to upload
 * @returns Public URL of the uploaded avatar
 */
export const uploadAvatar = async (userId: string, imageUri: string): Promise<string> => {
    try {
        // Fetch the image as a blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const filePath = `${userId}.jpg`;
        const contentType = 'image/jpeg';

        // Convert blob to ArrayBuffer for Supabase
        const arrayBuffer = await new Response(blob).arrayBuffer();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(filePath, arrayBuffer, {
                contentType,
                upsert: true, // Overwrite if exists
            });

        if (error) {
            console.error('Upload error:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
};

/**
 * Get avatar URL for a user
 * @param userId - The user's ID
 * @returns Public URL of the avatar
 */
export const getAvatarUrl = (userId: string): string => {
    const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(`${userId}.jpg`);

    return data.publicUrl;
};

/**
 * Update user's avatar_url in the database
 * @param userId - The user's ID
 * @param avatarUrl - The public URL of the avatar
 */
export const updateUserAvatarUrl = async (userId: string, avatarUrl: string): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

    if (error) {
        console.error('Error updating avatar URL:', error);
        throw error;
    }
};
