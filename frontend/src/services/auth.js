/**
 * Authentication Utilities - COMPLETE FIX
 * Properly saves and retrieves tokens
 */

/**
 * Set authentication token
 * Saves to both 'token' and 'access_token' for compatibility
 */
export const setAuthToken = (token) => {
    if (!token) {
        console.error('❌ Attempted to set empty token');
        throw new Error('Token is required');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);

    // Verify it was saved
    const saved = localStorage.getItem('token');
    if (saved !== token) {
        console.error('❌ Token was not saved correctly');
        return false;
    }

    console.log('✅ Token saved successfully');
    return true;
};

/**
 * Get authentication token
 * Checks both 'token' and 'access_token'
 */
export const getAuthToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (token) {
        console.log('✅ Token retrieved:', token.substring(0, 20) + '...');
    } else {
        console.log('⚠️ No token found in localStorage');
    }

    return token;
};

/**
 * Remove authentication token
 */
export const removeAuthToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    console.log('✅ Token removed');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    const hasToken = !!getAuthToken();
    console.log(hasToken ? '✅ User is authenticated' : '⚠️ User is not authenticated');
    return hasToken;
};

/**
 * Validate token format
 */
export const isValidToken = (token) => {
    if (!token) return false;
    if (typeof token !== 'string') return false;
    if (token.length < 10) return false;

    // Check if it looks like a JWT (has 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length === 3) {
        console.log('✅ Token format is valid (JWT)');
        return true;
    }

    console.log('⚠️ Token format may be invalid');
    return token.length > 0;
};

/**
 * Save user data
 */
export const saveUserData = (user) => {
    if (!user) return;

    try {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ User data saved:', user.email);
    } catch (error) {
        console.error('❌ Failed to save user data:', error);
    }
};

/**
 * Get user data
 */
export const getUserData = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.log('⚠️ No user data found');
            return null;
        }

        const user = JSON.parse(userStr);
        console.log('✅ User data retrieved:', user.email);
        return user;
    } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        return null;
    }
};

/**
 * Clear all auth data
 */
export const clearAuthData = () => {
    removeAuthToken();
    localStorage.removeItem('user');
    console.log('✅ All auth data cleared');
};

/**
 * Complete login handler
 * Call this after successful login
 */
export const handleLoginSuccess = (response) => {
    try {
        const { access_token, user } = response;

        if (!access_token) {
            console.error('❌ No access_token in response');
            throw new Error('No access token received');
        }

        // Save token
        setAuthToken(access_token);

        // Save user data
        if (user) {
            saveUserData(user);
        }

        console.log('✅ Login success - Token and user data saved');
        return true;
    } catch (error) {
        console.error('❌ Login success handler failed:', error);
        return false;
    }
};

/**
 * Complete logout handler
 */
export const handleLogout = () => {
    clearAuthData();
    console.log('✅ Logout complete');

    // Redirect to login
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
};