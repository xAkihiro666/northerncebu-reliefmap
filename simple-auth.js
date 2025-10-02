// Simple user identification system for pin ownership
// Uses anonymous authentication to track who created each pin

import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

let auth = null;
let currentUser = null;

// Initialize simple authentication
export function initSimpleAuth() {
    if (!window.firebaseApp) {
        console.warn('Firebase not initialized');
        return false;
    }
    
    auth = getAuth(window.firebaseApp);
    
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log('User identified:', user.uid);
            updateAuthStatus('connected');
        } else {
            currentUser = null;
            console.log('User not identified');
            updateAuthStatus('anonymous');
        }
    });
    
    // Auto sign-in anonymously to get a user ID
    signInAnonymously(auth).catch(error => {
        console.warn('Anonymous sign-in failed:', error);
        // Generate a local user ID as fallback
        currentUser = { uid: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
        localStorage.setItem('localUserId', currentUser.uid);
        updateAuthStatus('local');
    });
    
    return true;
}

// Get current user ID
export function getCurrentUserId() {
    if (currentUser) {
        return currentUser.uid;
    }
    
    // Fallback to localStorage for offline users
    let localId = localStorage.getItem('localUserId');
    if (!localId) {
        localId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('localUserId', localId);
    }
    return localId;
}

// Check if current user owns a location
export function canDeleteLocation(location) {
    const currentUserId = getCurrentUserId();
    return location.createdBy === currentUserId;
}

// Update UI based on auth status
function updateAuthStatus(status) {
    const authIndicator = document.getElementById('authIndicator');
    if (authIndicator) {
        switch(status) {
            case 'connected':
                authIndicator.innerHTML = '<i class="fas fa-user-check"></i> Connected';
                authIndicator.className = 'auth-indicator connected';
                break;
            case 'local':
                authIndicator.innerHTML = '<i class="fas fa-user"></i> Local User';
                authIndicator.className = 'auth-indicator local';
                break;
            default:
                authIndicator.innerHTML = '<i class="fas fa-user-times"></i> Anonymous';
                authIndicator.className = 'auth-indicator anonymous';
        }
    }
}

// Make functions globally available
window.getCurrentUserId = getCurrentUserId;
window.canDeleteLocation = canDeleteLocation;
