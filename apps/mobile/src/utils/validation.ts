/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: At least 8 characters, 1 uppercase letter, 1 number
 */
export const isValidPassword = (password: string): boolean => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return minLength && hasUppercase && hasNumber;
};

/**
 * Get password validation error message
 */
export const getPasswordError = (password: string): string | null => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least 1 uppercase letter';
    }
    if (!/\d/.test(password)) {
        return 'Password must contain at least 1 number';
    }
    return null;
};

/**
 * Get password strength level
 */
export const getPasswordStrength = (
    password: string
): 'weak' | 'medium' | 'strong' => {
    if (password.length < 8) return 'weak';

    let strength = 0;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 1) return 'weak';
    if (strength === 2 || strength === 3) return 'medium';
    return 'strong';
};

/**
 * Validate full name (at least 2 characters, only letters and spaces)
 */
export const isValidFullName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,}$/;
    return nameRegex.test(name.trim());
};

/**
 * Validate form field
 */
export const validateField = (
    fieldName: string,
    value: string
): string | null => {
    switch (fieldName) {
        case 'email':
            if (!value.trim()) return 'Email is required';
            if (!isValidEmail(value)) return 'Invalid email format';
            return null;

        case 'password':
            if (!value) return 'Password is required';
            const passwordError = getPasswordError(value);
            if (passwordError) return passwordError;
            return null;

        case 'fullName':
            if (!value.trim()) return 'Full name is required';
            if (!isValidFullName(value)) return 'Please enter a valid name';
            return null;

        case 'neighborhood':
            if (!value.trim()) return 'Please select a neighborhood';
            return null;

        default:
            return null;
    }
};
