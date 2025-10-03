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
            console.log('User authenticated:', user.uid, user.displayName || user.email);
            updateAuthStatus('connected');
        } else {
            currentUser = null;
            console.log('User not authenticated');
            updateAuthStatus('anonymous');
            
            // Only sign in anonymously if not on admin map
            if (!window.isAdminMap) {
                // Auto sign-in anonymously to get a user ID for pin ownership
                signInAnonymously(auth).catch(error => {
                    console.warn('Anonymous sign-in failed:', error);
                    // Generate a local user ID as fallback
                    currentUser = { uid: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
                    localStorage.setItem('localUserId', currentUser.uid);
                    updateAuthStatus('local');
                });
            }
        }
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
    const userStatus = document.getElementById('userStatus');
    const adminLink = document.querySelector('.admin-link');
    
    if (authIndicator) {
        // Don't update if this is admin map
        if (window.isAdminMap) {
            return; // Admin map handles its own auth indicator
        }
        
        // Check if user is logged in
        if (currentUser && currentUser.displayName) {
            // User is logged in - show their name
            if (userStatus) {
                userStatus.textContent = currentUser.displayName;
            }
            authIndicator.className = 'auth-indicator connected';
            authIndicator.href = '#'; // Disable link when logged in
            authIndicator.style.cursor = 'default';
            authIndicator.title = 'Logged in as ' + currentUser.displayName;
            
            // Change "Admin" button to "Dashboard" for logged-in users
            if (adminLink) {
                adminLink.innerHTML = '<i class="fas fa-th-large"></i> Dashboard';
                adminLink.title = 'Go to your dashboard';
            }
            
            // Show user admin banner
            const banner = document.getElementById('userAdminBanner');
            if (banner && !sessionStorage.getItem('bannerClosed')) {
                banner.style.display = 'flex';
            }
        } else {
            // Not logged in - show public user
            if (userStatus) {
                userStatus.textContent = 'Public User';
            }
            authIndicator.className = 'auth-indicator anonymous';
            authIndicator.href = 'user-login.html'; // Enable link to login
            authIndicator.style.cursor = 'pointer';
            authIndicator.title = 'Click to login or sign up';
            
            // Show "Admin" button for non-logged-in users
            if (adminLink) {
                adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
                adminLink.title = 'Admin panel login';
            }
        }
    }
}

// Make functions globally available
window.getCurrentUserId = getCurrentUserId;
window.canDeleteLocation = canDeleteLocation;
