// Northern Cebu Earthquake Relief Map Guide
// Community reporting map for locations needing help

// ========================================
// GOOGLE MAPS CONFIGURATION
// ========================================
// To enable Google Maps for more accurate geocoding:
// 1. Get a Google Maps API key from: https://console.cloud.google.com/
// 2. Enable the "Geocoding API" for your project
// 3. Replace 'YOUR_GOOGLE_MAPS_API_KEY' below with your actual API key
// 4. Set USE_GOOGLE_MAPS to true
// 
// Benefits of Google Maps:
// - More accurate location data for Philippines
// - Better recognition of local place names
// - More precise coordinates for specific areas like "Simbawan, Nailon"
// ========================================

// Custom alert function to show "System says" instead of URL
function systemAlert(message) {
    // Check if there's already an alert modal to prevent stacking
    const existingAlert = document.querySelector('.system-alert-modal');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create custom modal instead of browser alert
    const alertModal = document.createElement('div');
    alertModal.className = 'system-alert-modal';
    alertModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    alertModal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
            text-align: center;
        ">
            <div style="
                font-size: 1.1rem;
                margin-bottom: 1.5rem;
                color: #333;
                line-height: 1.4;
            ">${message}</div>
            <button onclick="this.closest('.system-alert-modal').remove()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1rem;
            ">OK</button>
        </div>
    `;

    document.body.appendChild(alertModal);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (alertModal.parentElement) {
            alertModal.remove();
        }
    }, 10000);
}

// Override the default alert function
window.alert = systemAlert;

// Custom confirmation dialog
function showCustomConfirm(message, subtitle = '') {
    return new Promise((resolve) => {
        const confirmModal = document.createElement('div');
        confirmModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 100002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        confirmModal.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <div style="
                    font-size: 1.2rem;
                    margin-bottom: 1rem;
                    color: #333;
                    font-weight: 600;
                ">System says</div>
                <div style="
                    font-size: 1rem;
                    margin-bottom: ${subtitle ? '0.5rem' : '1.5rem'};
                    color: #333;
                    line-height: 1.4;
                ">${message}</div>
                ${subtitle ? `<div style="
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                    color: #666;
                    line-height: 1.4;
                ">${subtitle}</div>` : ''}
                <div style="
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                ">
                    <button id="confirmCancel" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1rem;
                    ">Cancel</button>
                    <button id="confirmOk" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1rem;
                    ">Remove</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        // Handle button clicks
        document.getElementById('confirmOk').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };

        document.getElementById('confirmCancel').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };

        // Handle click outside to cancel
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.remove();
                resolve(false);
            }
        };

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                confirmModal.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

let map;
let markerLayers = {};
let userReportedLocations = [];
let isReportingMode = false;
let pendingReportCoords = null;

// Firebase Firestore functions
let db = null;
let unsubscribeListener = null;

// Initialize Firebase connection
function initFirebase() {
    // Wait for Firebase to be loaded
    if (window.firestoreDb) {
        db = window.firestoreDb;
        updateSyncStatus('online', 'Public Server Online');

        // Check if this is admin map
        if (window.isAdminMap) {
            // Admin map - authentication already handled in admin-map.html
            window.isAdminAuthenticated = true;
        } else {
            // Public map - no delete privileges
            window.isAdminAuthenticated = false;
        }

        // Initialize simple authentication for user identification
        import('./simple-auth.js').then(authModule => {
            authModule.initSimpleAuth();
        }).catch(error => {
            console.warn('Simple auth system not available:', error);
        });

        return true;
    } else {
        updateSyncStatus('offline', 'Local only');
        return false;
    }
}

// Update sync status indicator
function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('syncStatus');
    const syncIcon = document.getElementById('syncIcon');
    const syncText = document.getElementById('syncText');

    if (!syncStatus) return;

    // Remove all status classes
    syncStatus.classList.remove('online', 'offline', 'connecting');

    // Add current status class
    syncStatus.classList.add(status);

    // Update text with public server context
    let displayMessage = message;
    if (status === 'online') {
        displayMessage = '🌐 Public Server Online - Real-time sync active';
    } else if (status === 'offline') {
        displayMessage = '📱 Local Mode - Connect to internet for sync';
    } else if (status === 'connecting') {
        displayMessage = '🔄 Connecting to public server...';
    }

    if (syncText) syncText.textContent = displayMessage;
}

// Firestore helper functions
async function saveLocationToFirestore(location) {
    if (!db) {
        console.warn('Firestore not initialized, falling back to localStorage');
        return saveToLocalStorage(location);
    }

    try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Firestore save timeout after 10 seconds')), 10000);
        });

        const savePromise = (async () => {
            const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
            const docRef = await addDoc(collection(db, 'relief-locations'), location);
            return docRef.id;
        })();

        // Race between save and timeout
        return await Promise.race([savePromise, timeoutPromise]);

    } catch (error) {
        console.error('Error saving to Firestore:', error);
        // Fallback to localStorage
        return saveToLocalStorage(location);
    }
}

async function loadLocationsFromFirestore() {
    if (!db) {
        console.warn('Firestore not initialized, loading from localStorage');
        return loadFromLocalStorage();
    }

    try {
        const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(db, 'relief-locations'));

        userReportedLocations = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            data.firestoreId = doc.id; // Store Firestore document ID
            userReportedLocations.push(data);
        });

        return userReportedLocations;
    } catch (error) {
        console.error('Error loading from Firestore:', error);
        // Fallback to localStorage
        return loadFromLocalStorage();
    }
}

async function deleteLocationFromFirestore(firestoreId) {
    if (!db || !firestoreId) {
        console.warn('Firestore not initialized or no ID provided');
        return false;
    }

    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        await deleteDoc(doc(db, 'relief-locations', firestoreId));
        return true;
    } catch (error) {
        console.error('❌ Error deleting from Firestore:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Check for specific error types
        if (error.code === 'permission-denied') {
            console.error('🔒 Permission denied - User does not have permission to delete this location');
        } else if (error.code === 'not-found') {
            console.error('📍 Location not found in Firestore');
        } else if (error.code === 'unavailable') {
            console.error('🌐 Network error - Firestore unavailable');
        }
        
        return false;
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Batch update markers for better performance
let markerUpdateQueue = [];
let isProcessingMarkers = false;

async function processMarkerQueue() {
    if (isProcessingMarkers || markerUpdateQueue.length === 0) return;
    
    isProcessingMarkers = true;
    const batch = markerUpdateQueue.splice(0, 10); // Process 10 at a time
    
    batch.forEach(item => {
        if (item.type === 'add') {
            addUserReportedMarker(item.data);
        } else if (item.type === 'remove') {
            removeMarkerFromLayers(item.coords);
        }
    });
    
    isProcessingMarkers = false;
    
    if (markerUpdateQueue.length > 0) {
        requestAnimationFrame(() => processMarkerQueue());
    }
}

// Real-time listener for new locations with performance optimization
async function setupRealtimeListener() {
    if (!db) return;

    try {
        const { onSnapshot, collection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

        unsubscribeListener = onSnapshot(collection(db, 'relief-locations'), (snapshot) => {
            const changes = snapshot.docChanges();
            
            // Batch process changes for better performance
            changes.forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    data.firestoreId = change.doc.id;

                    // Check if this location is already in our local array
                    const exists = userReportedLocations.find(loc => loc.firestoreId === data.firestoreId);
                    if (!exists) {
                        userReportedLocations.push(data);
                        markerUpdateQueue.push({ type: 'add', data: data });
                    }
                }

                if (change.type === 'modified') {
                    const modifiedId = change.doc.id;
                    const index = userReportedLocations.findIndex(loc => loc.firestoreId === modifiedId);
                    if (index > -1) {
                        const data = change.doc.data();
                        data.firestoreId = modifiedId;
                        
                        // Remove old marker and add updated one
                        markerUpdateQueue.push({ type: 'remove', coords: userReportedLocations[index].coords });
                        userReportedLocations[index] = data;
                        markerUpdateQueue.push({ type: 'add', data: data });
                    }
                }

                if (change.type === 'removed') {
                    const removedId = change.doc.id;
                    const index = userReportedLocations.findIndex(loc => loc.firestoreId === removedId);
                    if (index > -1) {
                        const removedLocation = userReportedLocations[index];
                        userReportedLocations.splice(index, 1);
                        markerUpdateQueue.push({ type: 'remove', coords: removedLocation.coords });

                        map.closePopup();
                    }
                }
            });
            
            // Process marker updates in batches
            processMarkerQueue();
            
            // Debounced list update
            debouncedListUpdate();
            
            // Update localStorage
            localStorage.setItem('userReportedLocations', JSON.stringify(userReportedLocations));
        });
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
    }
}

// Debounced list update
const debouncedListUpdate = debounce(() => {
    updatePinnedLocationsList();
}, 500);

// Fallback localStorage functions
function saveToLocalStorage(location) {
    try {
        const saved = localStorage.getItem('userReportedLocations');
        const locations = saved ? JSON.parse(saved) : [];
        locations.push(location);
        localStorage.setItem('userReportedLocations', JSON.stringify(locations));
        return location.id;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return null;
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('userReportedLocations');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return [];
    }
}

// Northern Cebu coordinates (approximate center)
const NORTHERN_CEBU_CENTER = [10.8, 124.0];

// Northern Cebu precise bounding box (land areas only)
const NORTHERN_CEBU_BOUNDS = {
    north: 11.2,   // Northern boundary (Medellin area)
    south: 10.4,   // Southern boundary (Danao/Carmen area)
    east: 124.1,   // Eastern boundary (coastal limit)
    west: 123.7    // Western boundary (mountain areas)
};

// Known land reference points for validation
const LAND_REFERENCE_POINTS = [
    { name: 'Bogo City Center', coords: [11.0508, 124.0061] },
    { name: 'Medellin Center', coords: [11.1289, 123.9597] },
    { name: 'San Remigio Center', coords: [11.0833, 123.9167] },
    { name: 'Tabuelan Center', coords: [10.8167, 123.9167] },
    { name: 'Tuburan Center', coords: [10.7333, 123.8333] },
    { name: 'Danao City Center', coords: [10.5167, 124.0167] },
    { name: 'Carmen Center', coords: [10.5833, 124.0333] },
    { name: 'Catmon Center', coords: [10.7167, 124.0167] },
    { name: 'Sogod Center', coords: [10.7500, 124.0000] },
    { name: 'Borbon Center', coords: [10.8333, 124.0333] }
];

// Function to calculate distance between two coordinates (in kilometers)
function calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to validate if a location is on land (not in the sea)
function isLocationOnLand(coords) {
    const [lat, lon] = coords;

    // First check: Must be within reasonable bounds of Northern Cebu
    if (lat < NORTHERN_CEBU_BOUNDS.south || lat > NORTHERN_CEBU_BOUNDS.north ||
        lon < NORTHERN_CEBU_BOUNDS.west || lon > NORTHERN_CEBU_BOUNDS.east) {
        return false;
    }

    // Second check: Must be within reasonable distance of known land points
    const maxDistanceFromLand = 15; // Maximum 15km from any known land point

    for (const landPoint of LAND_REFERENCE_POINTS) {
        const distance = calculateDistance(coords, landPoint.coords);
        if (distance <= maxDistanceFromLand) {
            return true;
        }
    }

    // Third check: Exclude obvious sea coordinates
    // Eastern coast limit - anything too far east is likely in the sea
    if (lon > 124.05 && lat > 10.9) {
        return false;
    }

    // Western mountain limit - anything too far west is likely in mountains/other provinces
    if (lon < 123.75) {
        return false;
    }

    return false;
}

// Initialize the map
async function initMap() {
    // Create map centered on Northern Cebu with performance options
    map = L.map('map', {
        preferCanvas: true, // Use Canvas renderer for better performance
        zoomControl: true,
        attributionControl: true,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
    }).setView(NORTHERN_CEBU_CENTER, 10);

    // Add tile layer with performance optimizations
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 8,
        updateWhenIdle: false, // Update tiles while panning
        updateWhenZooming: false, // Don't update while zooming
        keepBuffer: 2 // Keep tiles in buffer for smoother panning
    }).addTo(map);

    // Initialize layer groups - only user reported locations
    markerLayers = {
        userReported: L.layerGroup().addTo(map)
    };

    // Initialize Firebase
    initFirebase();

    // Load user reported locations from Firestore/localStorage
    await loadUserReportedLocations();

    // Set up real-time listener for new locations
    setupRealtimeListener();

    // Set up event listeners
    setupEventListeners();
}

// Event listeners
function setupEventListeners() {
    // Report location button
    document.getElementById('reportLocation').addEventListener('click', startReportingMode);

    // Modal event listeners
    document.getElementById('closeReportModal').addEventListener('click', closeReportModal);
    document.getElementById('cancelReport').addEventListener('click', closeReportModal);
    document.getElementById('reportForm').addEventListener('submit', submitLocationReport);

    // Close modal when clicking outside
    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target.id === 'reportModal') {
            closeReportModal();
        }
    });

    // Search functionality with autocomplete
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    const searchInput = document.getElementById('searchLocation');

    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('blur', () => {
        // Delay hiding suggestions to allow clicks
        setTimeout(() => hideSuggestions(), 150);
    });
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            handleSearchInput();
        }
    });

    // Clear search functionality (no clear button in new design)

    // Welcome guide functionality
    document.getElementById('startUsingMap').addEventListener('click', hideWelcomeGuide);

    // Directions panel close button
    document.getElementById('closeDirections').addEventListener('click', () => {
        document.getElementById('directionsPanel').style.display = 'none';
    });

    // Legend toggle button
    document.getElementById('toggleLegend').addEventListener('click', toggleMapLegend);

    // Pinned locations dropdown
    document.getElementById('viewPinnedBtn').addEventListener('click', togglePinnedLocationsList);
    document.getElementById('closePinnedList').addEventListener('click', hidePinnedLocationsList);
    
    // Pinned locations search and filter
    document.getElementById('pinnedSearchInput').addEventListener('input', filterPinnedLocations);
    document.querySelectorAll('.urgency-filter').forEach(filter => {
        filter.addEventListener('click', handleUrgencyFilter);
    });

    // Close pinned list when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.pinned-locations-dropdown');
        const pinnedList = document.getElementById('pinnedLocationsList');

        if (!dropdown.contains(e.target) && pinnedList.style.display === 'block') {
            hidePinnedLocationsList();
        }
    });
}

// Legend toggle functionality
function toggleMapLegend() {
    const legend = document.getElementById('mapLegend');
    const toggleBtn = document.getElementById('toggleLegend');
    const icon = toggleBtn.querySelector('i');

    if (legend.classList.contains('collapsed')) {
        // Show legend
        legend.classList.remove('collapsed');
        icon.className = 'fas fa-eye-slash';
        toggleBtn.title = 'Hide legend';
    } else {
        // Hide legend
        legend.classList.add('collapsed');
        icon.className = 'fas fa-eye';
        toggleBtn.title = 'Show legend';
    }
}

// Search functionality with geocoding and autocomplete
let searchMarker = null;
let searchCache = new Map();
let searchTimeout = null;
let currentSuggestionIndex = -1;
let suggestions = [];

// Northern Cebu comprehensive location database with geocoded coordinates
const commonLocations = [
    // Major Cities/Municipalities
    { name: 'Bogo City', address: 'Bogo City, Cebu', type: 'City', coords: [11.0508, 124.0061] },
    { name: 'Medellin', address: 'Medellin, Cebu', type: 'Municipality', coords: [11.1289, 123.9597] },
    { name: 'San Remigio', address: 'San Remigio, Cebu', type: 'Municipality', coords: [11.0833, 123.9167] },
    { name: 'Tabuelan', address: 'Tabuelan, Cebu', type: 'Municipality', coords: [10.8167, 123.9167] },
    { name: 'Tuburan', address: 'Tuburan, Cebu', type: 'Municipality', coords: [10.7333, 123.8333] },
    { name: 'Asturias', address: 'Asturias, Cebu', type: 'Municipality', coords: [10.5667, 123.7167] },
    { name: 'Balamban', address: 'Balamban, Cebu', type: 'Municipality', coords: [10.5000, 123.7167] },
    { name: 'Danao City', address: 'Danao City, Cebu', type: 'City', coords: [10.5167, 124.0167] },
    { name: 'Carmen', address: 'Carmen, Cebu', type: 'Municipality', coords: [10.5833, 124.0333] },
    { name: 'Catmon', address: 'Catmon, Cebu', type: 'Municipality', coords: [10.7167, 124.0167] },
    { name: 'Sogod', address: 'Sogod, Cebu', type: 'Municipality', coords: [10.7500, 124.0000] },
    { name: 'Borbon', address: 'Borbon, Cebu', type: 'Municipality', coords: [10.8333, 124.0333] },

    // Bogo City Barangays (detailed coordinates)
    { name: 'Dakit', address: 'Dakit, Bogo City, Cebu', type: 'Barangay', coords: [11.0667, 124.0167] },
    { name: 'Pandan', address: 'Pandan, Bogo City, Cebu', type: 'Barangay', coords: [11.0500, 124.0000] },
    { name: 'Sudlonon', address: 'Sudlonon, Bogo City, Cebu', type: 'Barangay', coords: [11.0333, 124.0167] },
    { name: 'Nailon', address: 'Nailon, Bogo City, Cebu', type: 'Barangay', coords: [11.0583, 124.0083] },
    { name: 'Banban', address: 'Banban, Bogo City, Cebu', type: 'Barangay', coords: [11.0417, 124.0250] },
    { name: 'La Paz', address: 'La Paz, Bogo City, Cebu', type: 'Barangay', coords: [11.0458, 124.0125] },
    { name: 'Siocon', address: 'Siocon, Bogo City, Cebu', type: 'Barangay', coords: [11.0625, 124.0042] },
    { name: 'Lambusan', address: 'Lambusan, Bogo City, Cebu', type: 'Barangay', coords: [11.0375, 124.0208] },
    { name: 'Calcalan', address: 'Calcalan, Bogo City, Cebu', type: 'Barangay', coords: [11.0542, 124.0292] },
    { name: 'Gawaygaway', address: 'Gawaygaway, Bogo City, Cebu', type: 'Barangay', coords: [11.0708, 124.0125] },
    { name: 'Anapog', address: 'Anapog, Bogo City, Cebu', type: 'Barangay', coords: [11.0292, 124.0042] },
    { name: 'Batad', address: 'Batad, Bogo City, Cebu', type: 'Barangay', coords: [11.0458, 124.0375] },
    { name: 'Bangcasan', address: 'Bangcasan, Bogo City, Cebu', type: 'Barangay', coords: [11.0750, 124.0208] },

    // Medellin Barangays (detailed coordinates)
    { name: 'Canhabagat', address: 'Canhabagat, Medellin, Cebu', type: 'Barangay', coords: [11.1333, 123.9583] },
    { name: 'Daanglungsod', address: 'Daanglungsod, Medellin, Cebu', type: 'Barangay', coords: [11.1250, 123.9500] },
    { name: 'Upper Mahawak', address: 'Upper Mahawak, Medellin, Cebu', type: 'Barangay', coords: [11.1417, 123.9667] },
    { name: 'Lamintak', address: 'Lamintak, Medellin, Cebu', type: 'Barangay', coords: [11.1167, 123.9417] },
    { name: 'Mafio', address: 'Mafio, Medellin, Cebu', type: 'Barangay', coords: [11.1375, 123.9750] },
    { name: 'Bagtik', address: 'Bagtik, Medellin, Cebu', type: 'Barangay', coords: [11.1208, 123.9625] },

    // San Remigio Barangays
    { name: 'San Rem Luyang', address: 'San Rem Luyang, San Remigio, Cebu', type: 'Barangay', coords: [11.0917, 123.9083] },
    { name: 'Kinawahan', address: 'Kinawahan, San Remigio, Cebu', type: 'Barangay', coords: [11.0750, 123.9250] },
    { name: 'Sanrem Guyong', address: 'Sanrem Guyong, San Remigio, Cebu', type: 'Barangay', coords: [11.0833, 123.9000] },
    { name: 'Sanmig', address: 'Sanmig, San Remigio, Cebu', type: 'Barangay', coords: [11.0958, 123.9167] },

    // Tabuelan Barangays
    { name: 'Argawanon Bancal', address: 'Argawanon Bancal, Tabuelan, Cebu', type: 'Barangay', coords: [10.8083, 123.9250] },
    { name: 'Kanluhangon', address: 'Kanluhangon, Tabuelan, Cebu', type: 'Barangay', coords: [10.8250, 123.9083] },

    // Tuburan Barangays
    { name: 'Tacup', address: 'Tacup, Tuburan, Cebu', type: 'Barangay', coords: [10.7417, 123.8417] },

    // Borbon Barangays
    { name: 'Cogon Victoria', address: 'Cogon Victoria, Borbon, Cebu', type: 'Barangay', coords: [10.8417, 124.0417] },

    // Specific Puroks and Small Areas (precise coordinates)
    { name: 'Purok 4 Argawanon Bancal', address: 'Purok 4, Argawanon Bancal, Tabuelan, Cebu', type: 'Purok', coords: [10.8075, 123.9242] },

    // Nailon Barangay - Detailed Sitios and Areas (CORRECTED COORDINATES)
    { name: 'Jovencio', address: 'Jovencio, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0575, 124.0075] },
    { name: 'Simbawan', address: 'Simbawan, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0598, 124.0088] }, // More precise
    { name: 'Panabilan', address: 'Panabilan, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0567, 124.0058] },
    { name: 'Nailon Center', address: 'Nailon Center, Bogo City, Cebu', type: 'Barangay Center', coords: [11.0583, 124.0083] },
    { name: 'Nailon Elementary School', address: 'Nailon Elementary School, Bogo City, Cebu', type: 'School', coords: [11.0580, 124.0080] },
    { name: 'Nailon Chapel', address: 'Nailon Chapel, Bogo City, Cebu', type: 'Religious', coords: [11.0585, 124.0085] },

    // More Bogo City Sitios and Specific Areas
    { name: 'Curva Libertad', address: 'Curva Libertad, Bogo City, Cebu', type: 'Area', coords: [11.0483, 124.0142] },
    { name: 'Libertad Proper', address: 'Libertad Proper, Bogo City, Cebu', type: 'Area', coords: [11.0475, 124.0135] },
    { name: 'Crossing Libertad', address: 'Crossing Libertad, Bogo City, Cebu', type: 'Area', coords: [11.0490, 124.0150] },

    // Dakit Barangay Sitios
    { name: 'Dakit Proper', address: 'Dakit Proper, Bogo City, Cebu', type: 'Barangay Center', coords: [11.0667, 124.0167] },
    { name: 'Sitio Riverside', address: 'Sitio Riverside, Dakit, Bogo City, Cebu', type: 'Sitio', coords: [11.0675, 124.0175] },
    { name: 'Sitio Hillside', address: 'Sitio Hillside, Dakit, Bogo City, Cebu', type: 'Sitio', coords: [11.0660, 124.0160] },

    // Pandan Barangay Areas
    { name: 'Pandan Proper', address: 'Pandan Proper, Bogo City, Cebu', type: 'Barangay Center', coords: [11.0500, 124.0000] },
    { name: 'Pandan Beach Area', address: 'Pandan Beach Area, Bogo City, Cebu', type: 'Coastal Area', coords: [11.0510, 124.0010] },

    // Sudlonon Barangay Areas
    { name: 'Sudlonon Proper', address: 'Sudlonon Proper, Bogo City, Cebu', type: 'Barangay Center', coords: [11.0333, 124.0167] },
    { name: 'Upper Sudlonon', address: 'Upper Sudlonon, Bogo City, Cebu', type: 'Area', coords: [11.0325, 124.0175] },
    { name: 'Lower Sudlonon', address: 'Lower Sudlonon, Bogo City, Cebu', type: 'Area', coords: [11.0340, 124.0160] },

    // Important landmarks and areas
    { name: 'Bogo Airport Area', address: 'Airport Area, Bogo City, Cebu', type: 'Area', coords: [11.0517, 124.0033] },
    { name: 'Medellin Airport Area', address: 'Airport Area, Canhabagat, Medellin, Cebu', type: 'Area', coords: [11.1342, 123.9575] },
    { name: 'Bogo Public Market', address: 'Public Market, Bogo City, Cebu', type: 'Landmark', coords: [11.0508, 124.0067] },
    { name: 'Bogo City Hall', address: 'City Hall, Bogo City, Cebu', type: 'Landmark', coords: [11.0500, 124.0058] },
    { name: 'Medellin Town Center', address: 'Town Center, Medellin, Cebu', type: 'Area', coords: [11.1289, 123.9597] },
    { name: 'Bogo Port Area', address: 'Port Area, Bogo City, Cebu', type: 'Area', coords: [11.0525, 124.0083] },
    { name: 'Medellin Public Market', address: 'Public Market, Medellin, Cebu', type: 'Landmark', coords: [11.1283, 123.9592] },

    // Additional relief-critical areas
    { name: 'Bogo Hospital', address: 'Bogo District Hospital, Bogo City, Cebu', type: 'Landmark', coords: [11.0492, 124.0075] },
    { name: 'Medellin Health Center', address: 'Rural Health Unit, Medellin, Cebu', type: 'Landmark', coords: [11.1275, 123.9583] },
    { name: 'San Remigio Health Center', address: 'Rural Health Unit, San Remigio, Cebu', type: 'Landmark', coords: [11.0825, 123.9158] },
    { name: 'Tabuelan Health Center', address: 'Rural Health Unit, Tabuelan, Cebu', type: 'Landmark', coords: [10.8158, 123.9158] },

    // More Medellin Specific Areas
    { name: 'Medellin Proper', address: 'Medellin Proper, Medellin, Cebu', type: 'Town Center', coords: [11.1289, 123.9597] },
    { name: 'Canhabagat Proper', address: 'Canhabagat Proper, Medellin, Cebu', type: 'Barangay Center', coords: [11.1333, 123.9583] },
    { name: 'Daanglungsod Proper', address: 'Daanglungsod Proper, Medellin, Cebu', type: 'Barangay Center', coords: [11.1250, 123.9500] },
    { name: 'Medellin Elementary School', address: 'Medellin Elementary School, Medellin, Cebu', type: 'School', coords: [11.1285, 123.9590] },
    { name: 'Medellin Church', address: 'Medellin Church, Medellin, Cebu', type: 'Religious', coords: [11.1290, 123.9595] },

    // San Remigio Specific Areas
    { name: 'San Remigio Proper', address: 'San Remigio Proper, San Remigio, Cebu', type: 'Town Center', coords: [11.0833, 123.9167] },
    { name: 'San Remigio Elementary School', address: 'San Remigio Elementary School, San Remigio, Cebu', type: 'School', coords: [11.0830, 123.9165] },
    { name: 'San Remigio Church', address: 'San Remigio Church, San Remigio, Cebu', type: 'Religious', coords: [11.0835, 123.9170] },

    // Tabuelan Specific Areas  
    { name: 'Tabuelan Proper', address: 'Tabuelan Proper, Tabuelan, Cebu', type: 'Town Center', coords: [10.8167, 123.9167] },
    { name: 'Tabuelan Elementary School', address: 'Tabuelan Elementary School, Tabuelan, Cebu', type: 'School', coords: [10.8165, 123.9165] },
    { name: 'Tabuelan Church', address: 'Tabuelan Church, Tabuelan, Cebu', type: 'Religious', coords: [10.8170, 123.9170] },

    // Common Sitio Names (that might exist in multiple barangays)
    { name: 'Sitio Mahogany', address: 'Sitio Mahogany, Bogo City, Cebu', type: 'Sitio', coords: [11.0520, 124.0070] },
    { name: 'Sitio Bamboo', address: 'Sitio Bamboo, Bogo City, Cebu', type: 'Sitio', coords: [11.0530, 124.0060] },
    { name: 'Sitio Coconut', address: 'Sitio Coconut, Bogo City, Cebu', type: 'Sitio', coords: [11.0540, 124.0050] },
    { name: 'Sitio Mango', address: 'Sitio Mango, Bogo City, Cebu', type: 'Sitio', coords: [11.0550, 124.0040] }
];

// Search suggestion handling
let searchDebounceTimer = null;

function clearSearchMarker() {
    if (currentSearchMarker) {
        map.removeLayer(currentSearchMarker);
        currentSearchMarker = null;
    }
}

function handleSearchInput(e) {
    // Handle cases where event might not have target
    let query = '';
    if (e && e.target && e.target.value) {
        query = e.target.value.trim();
    } else {
        // Fallback to getting value directly from search input
        const searchInput = document.getElementById('searchLocation');
        if (searchInput && searchInput.value) {
            query = searchInput.value.trim();
        }
    }
    
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!suggestionsContainer) {
        console.warn('Search suggestions container not found');
        return;
    }

    clearTimeout(searchDebounceTimer);
    
    if (!query) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.classList.remove('show');
        // Clear search marker when search is cleared
        clearSearchMarker();
        return;
    }
    
    searchDebounceTimer = setTimeout(() => {
        try {
            const results = searchCommonLocations(query);
            renderSearchSuggestions(results);
        } catch (error) {
            console.error('Search suggestions error:', error);
        }
    }, 300);
}

function searchCommonLocations(query) {
    const searchLower = query.toLowerCase();
    
    // Define priority areas (higher priority locations)
    const priorityAreas = [
        'Bogo City', 'Medellin', 'San Remigio', 'Tabuelan', 'Tuburan', 'Asturias', 
        'Balamban', 'Danao City', 'Carmen', 'Catmon', 'Sogod', 'Borbon',
        'Dakit', 'Pandan', 'Sudlonon', 'Nailon', 'Banban', 'La Paz', 'Siocon', 
        'Lambusan', 'Calcalan', 'Gawaygaway', 'Anapog', 'Batad', 'Bangcasan',
        'Canhabagat', 'Daanglungsod', 'Upper Mahawak', 'Lamintak', 'Mafio', 'Bagtik',
        'San Rem Luyang', 'Kinawahan', 'Sanrem Guyong', 'Sanmig',
        'Argawanon Bancal', 'Kanluhangon', 'Tacup', 'Cogon Victoria',
        'Purok 4 Argawanon Bancal', 'Jovencio', 'Simbawan', 'Panabilan', 
        'Nailon Center', 'Nailon Elementary School', 'Nailon Chapel'
    ];
    
    // Filter locations that match the search query
    const filteredLocations = commonLocations.filter(location => 
        location.name.toLowerCase().includes(searchLower) ||
        location.address.toLowerCase().includes(searchLower) ||
        location.type.toLowerCase().includes(searchLower)
    );
    
    // Sort by priority and relevance
    filteredLocations.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().startsWith(searchLower);
        const bNameMatch = b.name.toLowerCase().startsWith(searchLower);
        const aIsPriority = priorityAreas.includes(a.name);
        const bIsPriority = priorityAreas.includes(b.name);
        
        // Priority 1: Exact name matches from priority areas
        if (aNameMatch && aIsPriority && !(bNameMatch && bIsPriority)) return -1;
        if (bNameMatch && bIsPriority && !(aNameMatch && aIsPriority)) return 1;
        
        // Priority 2: Any exact name matches
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Priority 3: Priority areas (even partial matches)
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        
        // Priority 4: Sort by location type importance
        const typeOrder = ['City', 'Municipality', 'Barangay', 'Barangay Center', 'Town Center', 
                          'Landmark', 'School', 'Religious', 'Area', 'Sitio', 'Purok', 'Coastal Area'];
        const aTypeIndex = typeOrder.indexOf(a.type);
        const bTypeIndex = typeOrder.indexOf(b.type);
        
        if (aTypeIndex !== bTypeIndex) {
            return (aTypeIndex === -1 ? 999 : aTypeIndex) - (bTypeIndex === -1 ? 999 : bTypeIndex);
        }
        
        // Final: Sort alphabetically
        return a.name.localeCompare(b.name);
    });
    
    // Return in the format expected by renderSearchSuggestions
    const results = filteredLocations.map(location => ({
        lat: location.coords[0],
        lon: location.coords[1],
        display_name: location.address,
        name: location.name,
        type: location.type
    }));
    
    return results;
}

function renderSearchSuggestions(results) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!suggestionsContainer) {
        return;
    }
    
    if (!results || results.length === 0) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">No results found</div>';
        suggestionsContainer.classList.add('show');
        return;
    }
    
    const limitedResults = results.slice(0, 8);
    suggestionsContainer.innerHTML = limitedResults.map((result) => {
        const safeDisplay = result.display_name.replace(/"/g, '&quot;');
        const typeIcon = getLocationTypeIcon(result.type);
        return `
            <div class="suggestion-item" data-lat="${result.lat}" data-lon="${result.lon}" data-display="${safeDisplay}">
                <div class="suggestion-main">
                    <i class="${typeIcon}"></i>
                    ${result.name}
                </div>
                <div class="suggestion-address">${result.display_name}</div>
                <div class="suggestion-details">
                    <span class="suggestion-type">${result.type}</span>
                </div>
            </div>
        `;
    }).join('');
    
    suggestionsContainer.classList.add('show');
    
    // Add click event listeners to suggestions
    Array.from(suggestionsContainer.querySelectorAll('.suggestion-item')).forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.getAttribute('data-lat'));
            const lon = parseFloat(item.getAttribute('data-lon'));
            const displayName = item.getAttribute('data-display');
            const locationName = item.querySelector('.suggestion-main').textContent.trim();
            
            suggestionsContainer.classList.remove('show');
            document.getElementById('searchLocation').value = locationName;
            showSearchResult([lat, lon], displayName, locationName);
        });
    });
}

function getLocationTypeIcon(type) {
    const icons = {
        'City': 'fas fa-city',
        'Municipality': 'fas fa-building',
        'Barangay': 'fas fa-home',
        'Sitio': 'fas fa-map-pin',
        'Purok': 'fas fa-map-marker-alt',
        'School': 'fas fa-school',
        'Landmark': 'fas fa-landmark',
        'Religious': 'fas fa-church',
        'Area': 'fas fa-map',
        'Barangay Center': 'fas fa-dot-circle',
        'Town Center': 'fas fa-city',
        'Coastal Area': 'fas fa-water'
    };
    return icons[type] || 'fas fa-map-marker-alt';
}

// Global variable to track current search result marker
let currentSearchMarker = null;

// Autocomplete functions (using enhanced search suggestion handling above)

function handleSearchKeydown(e) {
    const suggestionsDiv = document.getElementById('searchSuggestions');
    const suggestionItems = suggestionsDiv.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestionItems.length - 1);
        highlightSuggestion();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
        highlightSuggestion();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSuggestionIndex >= 0 && suggestionItems[currentSuggestionIndex]) {
            // Trigger click on the highlighted suggestion
            suggestionItems[currentSuggestionIndex].click();
        } else if (!isSearching) {
            searchLocation();
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
        document.getElementById('searchLocation').blur();
    }
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.remove('show');
        suggestionsContainer.innerHTML = '';
    }
    currentSuggestionIndex = -1;
}

function highlightSuggestion() {
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    suggestionItems.forEach((item, index) => {
        if (index === currentSuggestionIndex) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}

async function fetchSuggestions(searchTerm) {
    try {
        // Check cache first
        const cacheKey = searchTerm.toLowerCase();
        if (searchCache.has(cacheKey)) {
            displaySuggestions(searchCache.get(cacheKey), searchTerm);
            return;
        }

        // Combine local suggestions with geocoding
        const localSuggestions = getLocalSuggestions(searchTerm);
        const geocodingSuggestions = await getGeocodingSuggestions(searchTerm);

        // Merge and deduplicate
        const allSuggestions = [...localSuggestions, ...geocodingSuggestions];
        const uniqueSuggestions = deduplicateSuggestions(allSuggestions);

        // Cache results
        searchCache.set(cacheKey, uniqueSuggestions);

        displaySuggestions(uniqueSuggestions, searchTerm);

    } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Show local suggestions only
        const localSuggestions = getLocalSuggestions(searchTerm);
        displaySuggestions(localSuggestions, searchTerm);
    }
}

function getLocalSuggestions(searchTerm) {
    const term = searchTerm.toLowerCase();
    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];

    // Search in common locations with improved matching
    commonLocations.forEach(location => {
        const locationName = location.name.toLowerCase();
        const locationAddress = location.address.toLowerCase();

        // Exact name match gets highest priority
        if (locationName === term) {
            exactMatches.push({
                name: location.name,
                shortAddress: location.address,
                type: location.type,
                coords: location.coords,
                source: 'local_exact',
                priority: 0
            });
            return;
        }

        // Check if name starts with the search term
        const nameStartsWith = locationName.startsWith(term);

        // Check if any word in the address starts with the search term
        const addressWords = locationAddress.split(/[,\s]+/).map(word => word.trim()).filter(word => word.length > 0);
        const addressWordStartsWith = addressWords.some(word => word.startsWith(term));

        // Check if name contains the term (for partial matches)
        const nameContains = locationName.includes(term);

        if (nameStartsWith || addressWordStartsWith) {
            startsWithMatches.push({
                name: location.name,
                shortAddress: location.address,
                type: location.type,
                coords: location.coords,
                source: 'local',
                priority: nameStartsWith ? 1 : 2
            });
        } else if (nameContains && term.length >= 3) {
            // Only include contains matches for longer search terms
            containsMatches.push({
                name: location.name,
                shortAddress: location.address,
                type: location.type,
                coords: location.coords,
                source: 'local_partial',
                priority: 3
            });
        }
    });

    // Search in user reported locations
    userReportedLocations.forEach(location => {
        const locationName = location.name.toLowerCase();

        if (locationName === term) {
            exactMatches.push({
                name: location.name,
                shortAddress: location.name,
                type: 'Reported Location',
                coords: location.coords,
                source: 'user_reported_exact',
                urgency: location.urgencyLevel,
                priority: 0
            });
        } else if (locationName.startsWith(term)) {
            startsWithMatches.push({
                name: location.name,
                shortAddress: location.name,
                type: 'Reported Location',
                coords: location.coords,
                source: 'user_reported',
                urgency: location.urgencyLevel,
                priority: 1
            });
        }
    });

    // Combine all matches with priority order: exact -> starts with -> contains
    const allMatches = [...exactMatches, ...startsWithMatches, ...containsMatches];

    // Sort by priority, then by name length (shorter names first for same priority)
    allMatches.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.name.length - b.name.length;
    });

    return allMatches.slice(0, 8);
}

// Use only free geocoding services - no Google Maps needed
const USE_GOOGLE_MAPS = false; // Disabled - using free alternatives only

async function getGeocodingSuggestions(searchTerm) {
    try {
        // Use Google Maps if API key is configured, otherwise fallback to OpenStreetMap
        if (USE_GOOGLE_MAPS && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
            return await getGoogleMapsGeocodingSuggestions(searchTerm);
        } else {
            return await getOpenStreetMapGeocodingSuggestions(searchTerm);
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

async function getGoogleMapsGeocodingSuggestions(searchTerm) {
    try {
        // Try multiple search strategies for better precision
        const searches = [
            // Exact search with Northern Cebu context
            `${searchTerm}, Northern Cebu, Philippines`,
            // Search with Cebu context
            `${searchTerm}, Cebu, Philippines`,
            // Search with specific municipalities
            `${searchTerm}, Bogo City, Cebu, Philippines`,
            `${searchTerm}, Medellin, Cebu, Philippines`
        ];

        let allResults = [];

        for (const query of searches) {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&bounds=${NORTHERN_CEBU_BOUNDS.south},${NORTHERN_CEBU_BOUNDS.west}|${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east}&region=ph&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'OK' && data.results) {
                    // Filter results to Northern Cebu area and exclude water locations
                    const filteredResults = data.results.filter(result => {
                        const location = result.geometry.location;
                        const lat = location.lat;
                        const lng = location.lng;
                        const formattedAddress = result.formatted_address.toLowerCase();

                        // Check if coordinates are within Northern Cebu bounds
                        const withinBounds = lat >= NORTHERN_CEBU_BOUNDS.south &&
                            lat <= NORTHERN_CEBU_BOUNDS.north &&
                            lng >= NORTHERN_CEBU_BOUNDS.west &&
                            lng <= NORTHERN_CEBU_BOUNDS.east;

                        // Exclude water/sea locations
                        const isWaterLocation = formattedAddress.includes('sea') ||
                            formattedAddress.includes('ocean') ||
                            formattedAddress.includes('strait') ||
                            formattedAddress.includes('channel') ||
                            formattedAddress.includes('bay') ||
                            formattedAddress.includes('reef') ||
                            result.types.includes('natural_feature') &&
                            (formattedAddress.includes('water') || formattedAddress.includes('coast'));

                        // Check if it's a valid land location
                        const isValidLandLocation = isLocationOnLand([lat, lng]);

                        // Must be within bounds, not water, on land, and in Northern Cebu area
                        return withinBounds && !isWaterLocation && isValidLandLocation && (
                            formattedAddress.includes('cebu') ||
                            formattedAddress.includes('bogo') ||
                            formattedAddress.includes('medellin') ||
                            formattedAddress.includes('tabuelan') ||
                            formattedAddress.includes('san remigio') ||
                            formattedAddress.includes('tuburan') ||
                            formattedAddress.includes('asturias') ||
                            formattedAddress.includes('balamban') ||
                            formattedAddress.includes('danao') ||
                            formattedAddress.includes('carmen') ||
                            formattedAddress.includes('catmon') ||
                            formattedAddress.includes('sogod') ||
                            formattedAddress.includes('borbon')
                        );
                    });

                    const mappedResults = filteredResults.map(result => ({
                        name: getGoogleMapsLocationName(result, searchTerm),
                        fullName: result.formatted_address,
                        shortAddress: getGoogleMapsShortAddress(result.formatted_address),
                        type: getGoogleMapsPlaceType(result.types),
                        coords: [result.geometry.location.lat, result.geometry.location.lng],
                        source: 'google_maps',
                        relevance: calculateGoogleMapsRelevance(result, searchTerm)
                    }));

                    allResults = allResults.concat(mappedResults);
                }
            }

            // If we found good results in the first search, don't need to continue
            if (allResults.length >= 5) break;
        }

        // Remove duplicates and sort by relevance
        const uniqueResults = deduplicateByCoords(allResults);
        uniqueResults.sort((a, b) => b.relevance - a.relevance);

        return uniqueResults.slice(0, 5);

    } catch (error) {
        console.error('Google Maps geocoding error:', error);
        // Fallback to OpenStreetMap
        return await getOpenStreetMapGeocodingSuggestions(searchTerm);
    }
}

async function getOpenStreetMapGeocodingSuggestions(searchTerm) {
    try {
        // Try multiple search strategies for better precision
        const searches = [
            // Exact search with Northern Cebu context
            `${searchTerm}, Northern Cebu, Philippines`,
            // Search with Cebu context
            `${searchTerm}, Cebu, Philippines`,
            // Original search term
            searchTerm
        ];

        let allResults = [];

        for (const query of searches) {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=8&addressdetails=1&bounded=1&viewbox=${NORTHERN_CEBU_BOUNDS.west},${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east},${NORTHERN_CEBU_BOUNDS.south}&extratags=1&exclude_place_ids=&layer=address,poi,railway,natural,manmade`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Northern Cebu Earthquake Relief Map'
                }
            });

            if (response.ok) {
                const results = await response.json();

                // Filter results to prioritize Northern Cebu area and exclude water/sea locations
                const filteredResults = results.filter(result => {
                    const displayName = result.display_name.toLowerCase();
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);

                    // Check if coordinates are within Northern Cebu bounds
                    const withinBounds = lat >= NORTHERN_CEBU_BOUNDS.south &&
                        lat <= NORTHERN_CEBU_BOUNDS.north &&
                        lon >= NORTHERN_CEBU_BOUNDS.west &&
                        lon <= NORTHERN_CEBU_BOUNDS.east;

                    // Exclude water/sea locations
                    const isWaterLocation = displayName.includes('sea') ||
                        displayName.includes('ocean') ||
                        displayName.includes('strait') ||
                        displayName.includes('channel') ||
                        displayName.includes('bay') ||
                        displayName.includes('reef') ||
                        displayName.includes('island') && !displayName.includes('cebu') ||
                        result.class === 'natural' && (result.type === 'water' || result.type === 'coastline');

                    // Check if it's a valid land location
                    const isValidLandLocation = isLocationOnLand([lat, lon]);

                    // Must be within bounds, not water, on land, and in Northern Cebu area
                    return withinBounds && !isWaterLocation && isValidLandLocation && (
                        displayName.includes('cebu') ||
                        displayName.includes('bogo') ||
                        displayName.includes('medellin') ||
                        displayName.includes('tabuelan') ||
                        displayName.includes('san remigio') ||
                        displayName.includes('tuburan') ||
                        displayName.includes('asturias') ||
                        displayName.includes('balamban') ||
                        displayName.includes('danao') ||
                        displayName.includes('carmen') ||
                        displayName.includes('catmon') ||
                        displayName.includes('sogod') ||
                        displayName.includes('borbon')
                    );
                });

                const mappedResults = filteredResults.map(result => ({
                    name: getLocationName(result.display_name, searchTerm),
                    fullName: result.display_name,
                    shortAddress: getShortAddress(result.display_name),
                    type: getPlaceType(result.type, result.class),
                    coords: [parseFloat(result.lat), parseFloat(result.lon)],
                    source: 'geocoding',
                    relevance: calculateRelevance(result.display_name, searchTerm)
                }));

                allResults = allResults.concat(mappedResults);
            }

            // If we found good results in the first search, don't need to continue
            if (allResults.length >= 5) break;
        }

        // Remove duplicates and sort by relevance
        const uniqueResults = deduplicateByCoords(allResults);
        uniqueResults.sort((a, b) => b.relevance - a.relevance);

        return uniqueResults.slice(0, 5);

    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

function getLocationName(displayName, searchTerm) {
    // Try to extract the most relevant part of the name
    const parts = displayName.split(',');
    const searchLower = searchTerm.toLowerCase();

    // Find the part that best matches the search term
    for (const part of parts) {
        const partTrimmed = part.trim();
        if (partTrimmed.toLowerCase().includes(searchLower)) {
            return partTrimmed;
        }
    }

    // Fallback to first part
    return parts[0].trim();
}

function calculateRelevance(displayName, searchTerm) {
    const nameLower = displayName.toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (nameLower.includes(searchLower)) score += 10;

    // Northern Cebu locations get bonus points
    if (nameLower.includes('bogo')) score += 5;
    if (nameLower.includes('medellin')) score += 5;
    if (nameLower.includes('tabuelan')) score += 4;
    if (nameLower.includes('san remigio')) score += 4;
    if (nameLower.includes('cebu')) score += 2;

    // Specific area types get bonus
    if (nameLower.includes('purok')) score += 3;
    if (nameLower.includes('sitio')) score += 3;
    if (nameLower.includes('barangay')) score += 2;

    return score;
}

function deduplicateByCoords(results) {
    const seen = new Map();
    return results.filter(result => {
        const key = `${result.coords[0].toFixed(4)},${result.coords[1].toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
    });
}

function getPlaceType(type, placeClass) {
    if (type === 'city' || type === 'town') return 'City/Town';
    if (type === 'village' || type === 'hamlet') return 'Barangay';
    if (placeClass === 'place') return 'Place';
    if (placeClass === 'highway') return 'Road';
    return 'Location';
}

// Google Maps helper functions
function getGoogleMapsLocationName(result, searchTerm) {
    // Try to extract the most relevant part of the name from Google Maps result
    const addressComponents = result.address_components;
    const searchLower = searchTerm.toLowerCase();

    // Look for the component that best matches the search term
    for (const component of addressComponents) {
        const longName = component.long_name.toLowerCase();
        const shortName = component.short_name.toLowerCase();

        if (longName.includes(searchLower) || shortName.includes(searchLower)) {
            return component.long_name;
        }
    }

    // Fallback to the first address component (usually the most specific)
    if (addressComponents.length > 0) {
        return addressComponents[0].long_name;
    }

    // Final fallback to formatted address first part
    return result.formatted_address.split(',')[0].trim();
}

function getGoogleMapsShortAddress(formattedAddress) {
    // Extract meaningful address parts for Northern Cebu from Google Maps
    const parts = formattedAddress.split(',').map(part => part.trim());

    // Remove "Philippines" if present
    const filtered = parts.filter(part =>
        !part.toLowerCase().includes('philippines') &&
        part.length > 0
    );

    // Take first 3 meaningful parts
    if (filtered.length <= 3) {
        return filtered.join(', ');
    } else {
        // For longer addresses, prioritize: Place, Municipality, Province
        return filtered.slice(0, 3).join(', ');
    }
}

function getGoogleMapsPlaceType(types) {
    // Map Google Maps place types to our categories
    if (types.includes('locality') || types.includes('administrative_area_level_2')) return 'City/Municipality';
    if (types.includes('sublocality') || types.includes('administrative_area_level_3')) return 'Barangay';
    if (types.includes('neighborhood') || types.includes('sublocality_level_1')) return 'Area';
    if (types.includes('establishment') || types.includes('point_of_interest')) return 'Landmark';
    if (types.includes('route')) return 'Road';
    if (types.includes('premise') || types.includes('street_address')) return 'Address';
    return 'Location';
}

function calculateGoogleMapsRelevance(result, searchTerm) {
    const formattedAddress = result.formatted_address.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const types = result.types;

    let score = 0;

    // Exact match gets highest score
    if (formattedAddress.includes(searchLower)) score += 10;

    // Northern Cebu locations get bonus points
    if (formattedAddress.includes('bogo')) score += 5;
    if (formattedAddress.includes('medellin')) score += 5;
    if (formattedAddress.includes('tabuelan')) score += 4;
    if (formattedAddress.includes('san remigio')) score += 4;
    if (formattedAddress.includes('cebu')) score += 2;

    // Place type bonuses
    if (types.includes('locality')) score += 4;
    if (types.includes('sublocality')) score += 3;
    if (types.includes('establishment')) score += 2;

    // Specific area types get bonus
    if (formattedAddress.includes('purok')) score += 3;
    if (formattedAddress.includes('sitio')) score += 3;
    if (formattedAddress.includes('barangay')) score += 2;

    return score;
}

function getShortAddress(fullAddress) {
    // Extract meaningful address parts for Northern Cebu
    const parts = fullAddress.split(',').map(part => part.trim());

    // Remove "Philippines" and "Central Visayas" if present
    const filtered = parts.filter(part =>
        !part.toLowerCase().includes('philippines') &&
        !part.toLowerCase().includes('central visayas') &&
        !part.toLowerCase().includes('region vii') &&
        part.length > 0
    );

    // Take first 3-4 meaningful parts
    if (filtered.length <= 3) {
        return filtered.join(', ');
    } else {
        // For longer addresses, prioritize: Place, Municipality, Province
        return filtered.slice(0, 3).join(', ');
    }
}

function deduplicateSuggestions(suggestions) {
    const seen = new Set();
    return suggestions.filter(suggestion => {
        const key = suggestion.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function displaySuggestions(suggestionList, searchTerm) {
    suggestions = suggestionList;
    currentSuggestionIndex = -1;

    const suggestionsDiv = document.getElementById('searchSuggestions');

    if (suggestions.length === 0) {
        suggestionsDiv.innerHTML = '<div class="no-suggestions">No locations found</div>';
        suggestionsDiv.style.display = 'block';
        return;
    }

    const html = suggestions.map((suggestion, index) => {
        const urgencyColor = suggestion.urgency ? getUrgencyColor(suggestion.urgency) : '';
        const urgencyIndicator = suggestion.urgency ?
            `<span class="suggestion-distance" style="color: ${urgencyColor}">⚠️ ${suggestion.urgency}</span>` : '';

        // Show complete address to distinguish between similar names
        const addressDisplay = suggestion.shortAddress || suggestion.fullName || suggestion.name;
        const isUserReported = suggestion.source === 'user_reported' || suggestion.source === 'user_reported_exact';
        const isLocalExact = suggestion.source === 'local_exact';

        // Add accuracy indicator
        let accuracyIndicator = '';
        if (isLocalExact) {
            accuracyIndicator = '<span class="suggestion-distance" style="color: #28a745;">📍 Precise Location</span>';
        } else if (suggestion.source === 'local' || suggestion.source === 'local_partial') {
            accuracyIndicator = '<span class="suggestion-distance" style="color: #17a2b8;">📍 Local Database</span>';
        } else if (isUserReported) {
            accuracyIndicator = '<span class="suggestion-distance" style="color: #dc3545;">📍 Relief Location</span>';
        }

        return `
            <div class="suggestion-item" onclick="selectSuggestion(suggestions[${index}])">
                <div class="suggestion-main">${highlightMatch(suggestion.name, searchTerm)}</div>
                <div class="suggestion-address">${addressDisplay}</div>
                <div class="suggestion-details">
                    <span class="suggestion-type">${suggestion.type}</span>
                    ${urgencyIndicator}
                    ${accuracyIndicator}
                </div>
            </div>
        `;
    }).join('');

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';
}

function highlightMatch(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

function selectSuggestion(suggestion) {
    document.getElementById('searchLocation').value = suggestion.name;
    hideSuggestions();

    if (suggestion.coords) {
        // Use existing coordinates
        showSearchResult(suggestion.coords, suggestion.fullName || suggestion.name, suggestion.type);
    } else {
        // Need to geocode - use the full address for better results
        const searchTerm = suggestion.shortAddress || suggestion.name;
        performGeocodingSearch(searchTerm, suggestion.name);
    }
}

async function performGeocodingSearch(searchTerm, originalName) {
    // Show loading state
    const searchBtn = document.getElementById('searchBtn');
    const originalHTML = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;

    try {
        let bestResult = null;

        // Use Google Maps if available, otherwise fallback to OpenStreetMap
        if (USE_GOOGLE_MAPS && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
            bestResult = await performGoogleMapsGeocodingSearch(searchTerm, originalName);
        } else {
            bestResult = await performOpenStreetMapGeocodingSearch(searchTerm, originalName);
        }

        resetSearchButton(searchBtn, originalHTML);

        if (bestResult) {
            // Handle both Google Maps and OpenStreetMap coordinate formats
            const coords = bestResult.geometry ?
                [bestResult.geometry.location.lat, bestResult.geometry.location.lng] :
                [parseFloat(bestResult.lat), parseFloat(bestResult.lon)];
            const displayName = bestResult.formatted_address || bestResult.display_name;
            showSearchResult(coords, displayName, 'Found Location');
        } else {
            // If no results found, show a more helpful message
            alert(`Location "${originalName}" not found in mapping data. This might be a very specific area not yet mapped. Try searching for the nearest barangay or municipality instead.`);
        }

    } catch (error) {
        resetSearchButton(searchBtn, originalHTML);
        console.error('❌ Geocoding error:', error);
        alert('Search failed. Please check your internet connection and try again.');
    }
}

async function performGoogleMapsGeocodingSearch(searchTerm, originalName) {
    try {
        // Try multiple search variations for better accuracy
        const searchVariations = [
            `${originalName}, Northern Cebu, Philippines`,
            `${originalName}, Cebu, Philippines`,
            `${searchTerm}, Bogo City, Cebu, Philippines`,
            `${searchTerm}, Medellin, Cebu, Philippines`,
            searchTerm
        ];

        for (const query of searchVariations) {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&bounds=${NORTHERN_CEBU_BOUNDS.south},${NORTHERN_CEBU_BOUNDS.west}|${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east}&region=ph&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'OK' && data.results && data.results.length > 0) {
                    // Filter results to Northern Cebu area and exclude water locations
                    const filteredResults = data.results.filter(result => {
                        const location = result.geometry.location;
                        const lat = location.lat;
                        const lng = location.lng;
                        const formattedAddress = result.formatted_address.toLowerCase();

                        // Check bounds and land validation
                        const withinBounds = lat >= NORTHERN_CEBU_BOUNDS.south &&
                            lat <= NORTHERN_CEBU_BOUNDS.north &&
                            lng >= NORTHERN_CEBU_BOUNDS.west &&
                            lng <= NORTHERN_CEBU_BOUNDS.east;

                        const isWaterLocation = formattedAddress.includes('sea') ||
                            formattedAddress.includes('ocean') ||
                            formattedAddress.includes('strait') ||
                            formattedAddress.includes('channel') ||
                            formattedAddress.includes('bay') ||
                            formattedAddress.includes('reef') ||
                            result.types.includes('natural_feature');

                        const isValidLandLocation = isLocationOnLand([lat, lng]);

                        return withinBounds && !isWaterLocation && isValidLandLocation && (
                            formattedAddress.includes('cebu') ||
                            formattedAddress.includes('bogo') ||
                            formattedAddress.includes('medellin') ||
                            formattedAddress.includes('tabuelan') ||
                            formattedAddress.includes('san remigio') ||
                            formattedAddress.includes('tuburan') ||
                            formattedAddress.includes('asturias') ||
                            formattedAddress.includes('balamban')
                        );
                    });

                    if (filteredResults.length > 0) {
                        return filteredResults[0];
                    }
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Google Maps geocoding error:', error);
        // Fallback to OpenStreetMap
        return await performOpenStreetMapGeocodingSearch(searchTerm, originalName);
    }
}

async function performOpenStreetMapGeocodingSearch(searchTerm, originalName) {
    try {
        // Try multiple search variations for better accuracy
        const searchVariations = [
            searchTerm,
            `${searchTerm}, Philippines`,
            `${originalName}, Cebu, Philippines`,
            `${originalName}, Northern Cebu, Philippines`
        ];

        for (const query of searchVariations) {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=3&addressdetails=1&bounded=1&viewbox=${NORTHERN_CEBU_BOUNDS.west},${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east},${NORTHERN_CEBU_BOUNDS.south}&layer=address,poi,railway,natural,manmade`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Northern Cebu Earthquake Relief Map'
                }
            });

            if (response.ok) {
                const results = await response.json();

                if (results && results.length > 0) {
                    // Filter results to prioritize Northern Cebu locations and exclude water areas
                    const filteredResults = results.filter(result => {
                        const displayName = result.display_name.toLowerCase();
                        const lat = parseFloat(result.lat);
                        const lon = parseFloat(result.lon);

                        // Check bounds and land validation
                        const withinBounds = lat >= NORTHERN_CEBU_BOUNDS.south &&
                            lat <= NORTHERN_CEBU_BOUNDS.north &&
                            lon >= NORTHERN_CEBU_BOUNDS.west &&
                            lon <= NORTHERN_CEBU_BOUNDS.east;

                        const isWaterLocation = displayName.includes('sea') ||
                            displayName.includes('ocean') ||
                            displayName.includes('strait') ||
                            displayName.includes('channel') ||
                            displayName.includes('bay') ||
                            displayName.includes('reef') ||
                            result.class === 'natural' && result.type === 'water';

                        const isValidLandLocation = isLocationOnLand([lat, lon]);

                        return withinBounds && !isWaterLocation && isValidLandLocation && (
                            displayName.includes('cebu') ||
                            displayName.includes('bogo') ||
                            displayName.includes('medellin') ||
                            displayName.includes('tabuelan') ||
                            displayName.includes('san remigio') ||
                            displayName.includes('tuburan') ||
                            displayName.includes('asturias') ||
                            displayName.includes('balamban')
                        );
                    });

                    if (filteredResults.length > 0) {
                        return filteredResults[0];
                    } else if (results.length > 0) {
                        return results[0];
                    }
                }
            }
        }

        return null;
    } catch (error) {
        console.error('OpenStreetMap geocoding error:', error);
        return null;
    }
}

function hideSuggestions() {
    document.getElementById('searchSuggestions').style.display = 'none';
    currentSuggestionIndex = -1;
}

function searchLocation() {
    // Prevent multiple simultaneous searches
    if (isSearching) {
        return;
    }

    const searchTerm = document.getElementById('searchLocation').value.trim();

    if (!searchTerm) {
        alert('Please enter a location to search for.');
        return;
    }

    // Set search state
    isSearching = true;
    hideSuggestions();

    // Show loading state
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchLocation');
    const originalHTML = searchBtn.innerHTML;
    
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;
    searchInput.disabled = true;

    // First, search in local common locations (highest priority)
    const localResults = searchCommonLocations(searchTerm);
    if (localResults && localResults.length > 0) {
        const bestResult = localResults[0]; // Use first (best) result
        showSearchResult([bestResult.lat, bestResult.lon], bestResult.display_name, bestResult.name);
        resetSearchButton(searchBtn, originalHTML);
        return;
    }

    // Second, search in user reported locations
    const userReported = userReportedLocations.find(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (userReported) {
        showSearchResult(userReported.coords, userReported.name, 'User Reported Location');
        resetSearchButton(searchBtn, originalHTML);
        return;
    }

    // Last resort: use geocoding API
    geocodeLocation(searchTerm)
        .then(results => {
            resetSearchButton(searchBtn, originalHTML);

            if (results && results.length > 0) {
                // Filter results to prioritize Northern Cebu locations and exclude water areas
                const validResults = results.filter(result => {
                    const displayName = result.display_name.toLowerCase();
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);

                    // Check if it's in Northern Cebu area
                    const isNorthernCebu = displayName.includes('cebu') ||
                        displayName.includes('bogo') ||
                        displayName.includes('medellin') ||
                        displayName.includes('tabuelan') ||
                        displayName.includes('san remigio') ||
                        displayName.includes('tuburan') ||
                        displayName.includes('danao') ||
                        displayName.includes('carmen') ||
                        displayName.includes('catmon') ||
                        displayName.includes('sogod') ||
                        displayName.includes('borbon');

                    // Check if it's not a water location
                    const isWaterLocation = displayName.includes('sea') ||
                        displayName.includes('ocean') ||
                        displayName.includes('strait') ||
                        displayName.includes('channel') ||
                        displayName.includes('bay') ||
                        displayName.includes('reef') ||
                        result.class === 'natural' && result.type === 'water';

                    // Check if it's on land
                    const isValidLandLocation = isLocationOnLand([lat, lon]);

                    return isNorthernCebu && !isWaterLocation && isValidLandLocation;
                });

                // Use filtered results if available, otherwise fall back to original results
                const bestResult = validResults.length > 0 ? validResults[0] :
                    (results.filter(r => r.display_name.toLowerCase().includes('philippines'))[0] || results[0]);
                const coords = [parseFloat(bestResult.lat), parseFloat(bestResult.lon)];

                // Final validation before showing result
                if (isLocationOnLand(coords)) {
                    showSearchResult(coords, bestResult.display_name, 'Found Location');
                } else {
                    systemAlert(`Location "${searchTerm}" appears to be in water or outside the Northern Cebu area. Please try searching for a nearby barangay or municipality instead.`);
                }
            } else {
                systemAlert('Location not found. Please try a different search term or check the spelling.');
            }
        })
        .catch(error => {
            resetSearchButton(searchBtn, originalHTML);
            console.error('Geocoding error:', error);
            systemAlert('Search failed. Please check your internet connection and try again.');
        });
}

async function geocodeLocation(query) {
    // Use Google Maps if available, otherwise fallback to OpenStreetMap
    if (USE_GOOGLE_MAPS && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
        return await geocodeLocationWithGoogleMaps(query);
    } else {
        return await geocodeLocationWithOpenStreetMap(query);
    }
}

async function geocodeLocationWithGoogleMaps(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&bounds=${NORTHERN_CEBU_BOUNDS.south},${NORTHERN_CEBU_BOUNDS.west}|${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east}&region=ph&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.status === 'OK' && data.results) {
            // Convert Google Maps format to match OpenStreetMap format for compatibility
            return data.results.map(result => ({
                lat: result.geometry.location.lat.toString(),
                lon: result.geometry.location.lng.toString(),
                display_name: result.formatted_address,
                type: result.types[0] || 'location',
                class: result.types.includes('establishment') ? 'amenity' : 'place'
            }));
        } else {
            // Fallback to OpenStreetMap if Google Maps fails
            return await geocodeLocationWithOpenStreetMap(query);
        }
    } catch (error) {
        console.error('Google Maps geocoding error:', error);
        // Fallback to OpenStreetMap
        return await geocodeLocationWithOpenStreetMap(query);
    }
}

async function geocodeLocationWithOpenStreetMap(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=5&addressdetails=1&bounded=1&viewbox=${NORTHERN_CEBU_BOUNDS.west},${NORTHERN_CEBU_BOUNDS.north},${NORTHERN_CEBU_BOUNDS.east},${NORTHERN_CEBU_BOUNDS.south}&layer=address,poi,railway,natural,manmade`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Northern Cebu Earthquake Relief Map'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('OpenStreetMap geocoding error:', error);
        throw error;
    }
}

function showSearchResult(coords, displayName, resultType) {
    // Remove previous search marker if exists
    if (currentSearchMarker) {
        map.removeLayer(currentSearchMarker);
        currentSearchMarker = null;
    }

    // Center map on the location
    map.setView(coords, 14);

    // Add search result marker
    currentSearchMarker = L.marker(coords, {
        icon: L.divIcon({
            className: 'search-result-marker',
            html: '<i class="fas fa-search" style="color: #007bff; font-size: 20px; background: white; padding: 5px; border-radius: 50%; border: 2px solid #007bff;"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);

    // Store search data for potential help reporting
    window.currentSearchResult = {
        coords: coords,
        displayName: displayName,
        resultType: resultType
    };

    // Create popup content
    const popupContent = `
        <div class="popup-content">
            <h4><i class="fas fa-map-marker-alt"></i> Search Result</h4>
            <p><strong>Location:</strong> ${displayName}</p>
            <p><strong>Type:</strong> ${resultType}</p>
            <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
                <button onclick="pinHelpFromSearch()" class="btn btn-success btn-sm">
                    <i class="fas fa-plus-circle"></i> Pin Help
                </button>
                <button onclick="clearSearchResult()" class="btn btn-secondary btn-sm">
                    <i class="fas fa-times"></i> Clear
                </button>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                <i class="fas fa-info-circle"></i> Click "Pin Help" to report this location needs assistance
            </div>
        </div>
    `;

    currentSearchMarker.bindPopup(popupContent).openPopup();

    // Auto-remove the marker after 30 seconds
    setTimeout(() => {
        if (currentSearchMarker) {
            map.removeLayer(currentSearchMarker);
            currentSearchMarker = null;
        }
    }, 30000);
}

function clearSearchResult() {
    if (currentSearchMarker) {
        map.removeLayer(currentSearchMarker);
        currentSearchMarker = null;
    }
    window.currentSearchResult = null;
    map.closePopup();
}

function pinHelpFromSearch() {
    if (!window.currentSearchResult) {
        alert('No search result available. Please search for a location first.');
        return;
    }

    const searchData = window.currentSearchResult;

    // Set pending coordinates from search result
    pendingReportCoords = {
        lat: searchData.coords[0],
        lng: searchData.coords[1]
    };

    // Clear the search marker since we're now reporting it
    clearSearchResult();

    // Add temporary marker at search location
    const tempMarker = L.marker(searchData.coords, {
        icon: L.divIcon({
            className: 'temp-report-marker',
            html: '<i class="fas fa-map-marker-alt" style="color: #28a745; font-size: 20px; animation: bounce 1s infinite;"></i>',
            iconSize: [25, 25],
            iconAnchor: [12, 25]
        })
    }).addTo(map);

    window.tempReportMarker = tempMarker;

    // Pre-populate the form with search data
    document.getElementById('locationName').value = extractLocationName(searchData.displayName);

    // Open report modal
    document.getElementById('reportModal').style.display = 'flex';
}

function extractLocationName(displayName) {
    // Extract a clean location name from the full display name
    // Example: "Bogo, Cebu, Central Visayas, Philippines" -> "Bogo, Cebu"
    const parts = displayName.split(',');

    if (parts.length >= 2) {
        // Take first two parts (usually city/barangay and province)
        return parts.slice(0, 2).map(part => part.trim()).join(', ');
    } else {
        // If only one part, return as is
        return parts[0].trim();
    }
}

function resetSearchButton(button, originalHTML) {
    button.innerHTML = originalHTML;
    button.disabled = false;
    
    // Re-enable search input and reset search state
    const searchInput = document.getElementById('searchLocation');
    if (searchInput) {
        searchInput.disabled = false;
    }
    isSearching = false;
}

// User reporting functions
function startReportingMode() {
    isReportingMode = true;
    
    // Add reporting mode class for enhanced cursor styling
    document.body.classList.add('reporting-mode');

    // Show instruction overlay with improved design
    const instruction = document.createElement('div');
    instruction.id = 'clickInstruction';
    instruction.className = 'click-to-mark-instruction';
    instruction.innerHTML = `
        <h4><i class="fas fa-map-marker-alt"></i> Pin Relief Location</h4>
        <p>Click anywhere on the map to mark a location that needs assistance. The pin will help relief teams identify areas requiring help.</p>
        <div class="instruction-actions">
            <button onclick="cancelReportingMode()" class="btn btn-secondary btn-sm">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
        <div class="esc-hint">
            <i class="fas fa-keyboard"></i> Press ESC to cancel
        </div>
    `;
    document.body.appendChild(instruction);

    // Set up map click handler
    map.once('click', handleMapClickForReport);
    
    // Add ESC key listener for cancellation
    document.addEventListener('keydown', handleReportingModeKeydown);
}

function cancelReportingMode() {
    isReportingMode = false;
    
    // Remove reporting mode class and reset cursor
    document.body.classList.remove('reporting-mode');
    document.body.style.cursor = 'default';
    
    // Remove instruction overlay
    const instruction = document.getElementById('clickInstruction');
    if (instruction) {
        instruction.remove();
    }
    
    // Clean up event listeners
    map.off('click', handleMapClickForReport);
    document.removeEventListener('keydown', handleReportingModeKeydown);
}

// Handle keyboard events during reporting mode
function handleReportingModeKeydown(e) {
    if (e.key === 'Escape' && isReportingMode) {
        e.preventDefault();
        cancelReportingMode();
    }
}

function handleMapClickForReport(e) {
    pendingReportCoords = e.latlng;
    cancelReportingMode();

    // Add temporary marker
    const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
            className: 'temp-report-marker',
            html: '<i class="fas fa-map-marker-alt" style="color: #28a745; font-size: 20px; animation: bounce 1s infinite;"></i>',
            iconSize: [25, 25],
            iconAnchor: [12, 25]
        })
    }).addTo(map);

    window.tempReportMarker = tempMarker;

    // Open report modal
    document.getElementById('reportModal').style.display = 'flex';
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    const form = document.getElementById('reportForm');

    if (modal) {
        modal.style.display = 'none';
    }

    if (form) {
        form.reset();

        // Re-enable submit button if it was disabled
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Report';
        }
    }

    // Remove temporary marker
    if (window.tempReportMarker) {
        map.removeLayer(window.tempReportMarker);
        window.tempReportMarker = null;
    }

    // Clear search result data
    window.currentSearchResult = null;

    pendingReportCoords = null;
}

async function submitLocationReport(e) {
    e.preventDefault();

    if (!pendingReportCoords) {
        systemAlert('No location selected. Please try again.');
        return;
    }

    // Get form data
    const reliefNeeds = [];
    document.querySelectorAll('#reportForm input[type="checkbox"]:checked').forEach(checkbox => {
        reliefNeeds.push(checkbox.value);
    });

    if (reliefNeeds.length === 0) {
        systemAlert('Please select at least one type of help needed.');
        return;
    }

    // Disable submit button to prevent double submission
    const submitButton = document.querySelector('#reportForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        // Get user ID for ownership tracking
        let userId = null;
        let sessionId = localStorage.getItem('anonymousSessionId');
        
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            // Authenticated user
            userId = window.firebaseAuth.currentUser.uid;
        } else if (window.getCurrentUserId) {
            userId = window.getCurrentUserId();
        } else {
            // Anonymous user - create/use session ID
            if (!sessionId) {
                sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('anonymousSessionId', sessionId);
            }
            userId = sessionId;
        }

        // Create user report object
        const userReport = {
            id: 'user_' + Date.now(),
            userId: userId, // Track who created this pin (authenticated or session ID)
            createdBy: userId,
            isAnonymous: !window.firebaseAuth || !window.firebaseAuth.currentUser,
            name: document.getElementById('locationName').value,
            coords: [pendingReportCoords.lat, pendingReportCoords.lng],
            source: document.getElementById('locationSource').value,
            reliefNeeds: reliefNeeds,
            urgencyLevel: document.getElementById('urgencyLevel').value,
            additionalInfo: document.getElementById('additionalInfo').value,
            reporterName: document.getElementById('reporterName').value,
            reporterContact: document.getElementById('reporterContact').value,
            reportedAt: new Date().toISOString(),
            status: 'user_reported',
            reliefStatus: 'needs_help',
            verified: false
        };

        let savedId = null;
        let saveMethod = 'unknown';

        // Check if Firebase is properly configured (not placeholder values)
        const isFirebaseConfigured = db &&
            window.firebaseApp &&
            !window.location.hostname.includes('localhost') ||
            confirm('Firebase may not be configured. Save locally only? (Click Cancel to try Firebase anyway)');

        if (isFirebaseConfigured) {
            try {
                // Save to Firestore (with localStorage fallback) - with timeout
                savedId = await Promise.race([
                    saveLocationToFirestore(userReport),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Overall submission timeout')), 15000)
                    )
                ]);
                saveMethod = 'firestore';
            } catch (error) {
                console.warn('Firestore save failed, using localStorage:', error);
                savedId = saveToLocalStorage(userReport);
                saveMethod = 'localStorage';
            }
        } else {
            // Skip Firebase, save directly to localStorage
            savedId = saveToLocalStorage(userReport);
            saveMethod = 'localStorage';
        }

        // Always add to local array and map regardless of save method
        if (savedId) {
            userReport.firestoreId = savedId;
        }

        userReportedLocations.push(userReport);
        addUserReportedMarker(userReport);

        // Update localStorage as backup
        localStorage.setItem('userReportedLocations', JSON.stringify(userReportedLocations));

        // Update pinned locations list
        updatePinnedLocationsList();

        // Remove temporary marker
        if (window.tempReportMarker) {
            map.removeLayer(window.tempReportMarker);
            window.tempReportMarker = null;
        }

        // Show success message
        showSuccessMessage('Location reported successfully! 🌐 Now visible to all users on the public server. Thank you for helping the relief efforts!');

    } catch (error) {
        console.error('❌ Error during form submission:', error);
        alert('Error submitting report: ' + error.message + '. Please try again.');

        // Re-enable submit button on error
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Report';
        }
        return; // Don't close modal on error
    }

    // Close modal
    closeReportModal();

    // Re-enable submit button
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Report';
    }
}

function addUserReportedMarker(report) {
    // If location is reached, use green color; otherwise use urgency color
    const isReached = report.reached || false;
    const markerColor = isReached ? '#28a745' : getUrgencyColor(report.urgencyLevel);
    const badgeText = isReached ? '✓' : 'U';
    const badgeColor = isReached ? '#28a745' : '#17a2b8';

    const icon = L.divIcon({
        className: 'user-reported-marker',
        html: `
            <div style="position: relative;">
                <i class="fas fa-map-marker-alt" style="color: ${markerColor}; font-size: 18px;"></i>
                <div class="user-reported-badge" style="background-color: ${badgeColor};">${badgeText}</div>
            </div>
        `,
        iconSize: [25, 25],
        iconAnchor: [12, 25]
    });

    const marker = L.marker(report.coords, { icon })
        .bindPopup(createUserReportPopup(report));

    markerLayers.userReported.addLayer(marker);
}

function getUrgencyColor(urgencyLevel) {
    switch (urgencyLevel) {
        case 'critical': return '#dc3545'; // Red
        case 'urgent': return '#fd7e14'; // Orange
        case 'moderate': return '#ffc107'; // Yellow
        default: return '#6c757d'; // Gray
    }
}

function createUserReportPopup(report) {
    const urgencyBadge = `<span class="status-badge" style="background-color: ${getUrgencyColor(report.urgencyLevel)}; color: white;">${report.urgencyLevel.toUpperCase()}</span>`;
    const sourceBadge = `<span class="relief-badge relief-needs-help">${report.source.toUpperCase()}</span>`;

    // Use a unique identifier that works for both local and Firestore items
    const uniqueId = report.firestoreId || report.id || `temp_${Date.now()}`;

    // Check if current user can delete this location
    let canDelete = false;
    let deleteReason = '';
    
    // Get current user ID (authenticated or session)
    let currentUserId = null;
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        currentUserId = window.firebaseAuth.currentUser.uid;
    } else if (window.getCurrentUserId) {
        currentUserId = window.getCurrentUserId();
    } else {
        // Check anonymous session ID
        currentUserId = localStorage.getItem('anonymousSessionId');
    }
    
    // Master admin can delete everything
    if (window.isAdminAuthenticated && window.adminUser && window.adminUser.email === 'charleszoiyana@gmail.com') {
        canDelete = true;
        deleteReason = 'Master Admin';
    }
    // Users can delete their own pins (authenticated or same session)
    else if (currentUserId && report.userId && report.userId === currentUserId) {
        canDelete = true;
        deleteReason = 'Your pin';
    }

    // Create appropriate action button
    const actionButton = canDelete ?
        `<button onclick="removeUserReportedLocation('${uniqueId}')" class="btn btn-danger btn-sm" title="Remove this location">
            <i class="fas fa-trash"></i> Remove
        </button>` :
        `<span class="text-muted" style="font-size: 0.8rem; padding: 0.5rem;">
            <i class="fas fa-lock"></i> Only the creator or master admin can remove this
        </span>`;

    // Check if location has been reached
    const isReached = report.reached || false;
    const reachedBadge = isReached ? `
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px;">
            <p style="margin: 0; color: #155724; font-weight: 600;">
                <i class="fas fa-check-circle"></i> Response Status: Reached
            </p>
            ${report.reachedByTeam ? `<p style="margin: 0.25rem 0 0 0; color: #155724; font-size: 0.9rem;">
                <strong>Team Responding:</strong> ${report.reachedByTeam}
            </p>` : ''}
        </div>
    ` : '';

    return `
        <div class="popup-content">
            <h4><i class="fas fa-map-marker-alt"></i> ${report.name} <span style="font-size: 12px; color: #17a2b8;">[USER REPORTED]</span></h4>
            ${reachedBadge}
            <p><strong>Source:</strong> ${sourceBadge}</p>
            <p><strong>Urgency:</strong> ${urgencyBadge}</p>
            <p><strong>Relief Needs:</strong> ${report.reliefNeeds.join(', ')}</p>
            ${report.additionalInfo ? `<p><strong>Details:</strong> ${report.additionalInfo}</p>` : ''}
            <p><strong>Reported:</strong> ${new Date(report.reportedAt).toLocaleDateString()}</p>
            ${report.reporterName ? `<p><strong>Reporter:</strong> ${report.reporterName}</p>` : ''}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                <i class="fas fa-info-circle"></i> This location was reported by a community member and needs verification.
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="openWazeNavigation(${report.coords[0]}, ${report.coords[1]}, '${report.name.replace(/'/g, "\\'")}');" class="waze-btn popup-waze-btn" title="Navigate to this location with Waze">
                    <i class="fas fa-route"></i> Navigate with Waze
                </button>
                ${actionButton}
            </div>
        </div>
    `;
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 5px; margin: 1rem; border: 1px solid #c3e6cb; position: fixed; top: 20px; right: 20px; z-index: 3000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <i class="fas fa-check-circle"></i> ${message}
        </div>
    `;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Load user reported locations from Firestore/localStorage on page load
async function loadUserReportedLocations() {
    try {
        // Try to load from Firestore first
        const locations = await loadLocationsFromFirestore();

        // Add markers for all loaded locations
        locations.forEach(report => {
            addUserReportedMarker(report);
        });

    } catch (error) {
        console.error('Error loading locations:', error);

        // Fallback to localStorage
        const saved = localStorage.getItem('userReportedLocations');
        if (saved) {
            userReportedLocations = JSON.parse(saved);
            userReportedLocations.forEach(report => {
                addUserReportedMarker(report);
            });
        }
    }
}

// Remove user reported location
async function removeUserReportedLocation(identifier) {
    // Show custom confirmation dialog instead of browser confirm
    const confirmed = await showCustomConfirm(
        'Are you sure you want to remove this reported location?',
        'This action cannot be undone.'
    );

    if (!confirmed) {
        return;
    }

    // Find the report in the array - check both firestoreId and local id
    let reportIndex = -1;
    let report = null;

    // First try to find by firestoreId (for items loaded from Firestore)
    reportIndex = userReportedLocations.findIndex(report => report.firestoreId === identifier);

    // If not found, try to find by local id (for locally created items)
    if (reportIndex === -1) {
        reportIndex = userReportedLocations.findIndex(report => report.id === identifier);
    }

    // If still not found, try to find by coordinates match (fallback)
    if (reportIndex === -1) {
        // This is a fallback - not ideal but helps with edge cases
        reportIndex = userReportedLocations.findIndex(report => {
            // Convert identifier back to check if it's a coordinate-based temp ID
            return report.id === identifier || report.firestoreId === identifier;
        });
    }

    if (reportIndex === -1) {
        systemAlert('Location not found. It may have already been removed by another user.');
        return;
    }

    report = userReportedLocations[reportIndex];

    // Try to delete from Firestore first
    let deletedFromFirestore = false;
    
    if (report.firestoreId) {
        deletedFromFirestore = await deleteLocationFromFirestore(report.firestoreId);
        
        if (!deletedFromFirestore) {
            // Deletion failed - show error
            systemAlert('Failed to delete location. You may not have permission to delete this pin, or there was a connection error.');
            return;
        }
    }

    // Only proceed with local deletion if Firestore deletion succeeded
    // Remove from local array
    userReportedLocations.splice(reportIndex, 1);

    // Update localStorage as backup
    localStorage.setItem('userReportedLocations', JSON.stringify(userReportedLocations));

    // Remove from map layers
    removeMarkerFromLayers(report.coords);

    // Show success message
    const message = deletedFromFirestore ?
        '✅ Location removed successfully from all devices.' :
        '✅ Location removed locally.';
    showSuccessMessage(message);

    // Close any open popups
    map.closePopup();

    // Update pinned locations list
    updatePinnedLocationsList();
}

// Pinned locations dropdown functions
function togglePinnedLocationsList() {
    const pinnedList = document.getElementById('pinnedLocationsList');

    if (pinnedList.style.display === 'none' || pinnedList.style.display === '') {
        showPinnedLocationsList();
    } else {
        hidePinnedLocationsList();
    }
}

function showPinnedLocationsList() {
    updatePinnedLocationsList();
    document.getElementById('pinnedLocationsList').style.display = 'block';
}

function hidePinnedLocationsList() {
    document.getElementById('pinnedLocationsList').style.display = 'none';
}

// Global variables for filtering
let currentSearchQuery = '';
let currentUrgencyFilter = 'all';

// Search state management
let isSearching = false;

function updatePinnedLocationsList() {
    const pinnedCount = document.getElementById('pinnedCount');
    
    // Update count
    pinnedCount.textContent = userReportedLocations.length;
    
    // Apply current filters
    filterPinnedLocations();
}

function filterPinnedLocations() {
    const pinnedListContent = document.getElementById('pinnedListContent');
    const searchInput = document.getElementById('pinnedSearchInput');
    
    // Get current search query
    currentSearchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Clear existing content
    pinnedListContent.innerHTML = '';

    if (userReportedLocations.length === 0) {
        pinnedListContent.innerHTML = '<p class="no-pins">No locations pinned yet. Click "Report Location" to add one.</p>';
        return;
    }

    // Filter locations based on search and urgency
    let filteredLocations = userReportedLocations.filter(location => {
        // Search filter
        const matchesSearch = !currentSearchQuery || 
            location.name.toLowerCase().includes(currentSearchQuery) ||
            location.reliefNeeds.some(need => need.toLowerCase().includes(currentSearchQuery)) ||
            location.additionalInfo?.toLowerCase().includes(currentSearchQuery);
        
        // Urgency filter
        const matchesUrgency = currentUrgencyFilter === 'all' || 
            location.urgencyLevel === currentUrgencyFilter;
        
        return matchesSearch && matchesUrgency;
    });

    if (filteredLocations.length === 0) {
        const noResultsMsg = currentSearchQuery || currentUrgencyFilter !== 'all' 
            ? 'No locations match your search criteria.' 
            : 'No locations pinned yet.';
        pinnedListContent.innerHTML = `<p class="no-pins">${noResultsMsg}</p>`;
        return;
    }

    // Sort filtered locations by urgency and date
    const sortedLocations = [...filteredLocations].sort((a, b) => {
        const urgencyOrder = { 'critical': 3, 'urgent': 2, 'moderate': 1 };
        const urgencyA = urgencyOrder[a.urgencyLevel] || 0;
        const urgencyB = urgencyOrder[b.urgencyLevel] || 0;

        if (urgencyA !== urgencyB) {
            return urgencyB - urgencyA; // Higher urgency first
        }

        // If same urgency, sort by date (newest first)
        return new Date(b.reportedAt) - new Date(a.reportedAt);
    });

    // Create list items
    sortedLocations.forEach((location, index) => {
        const urgencyColor = getUrgencyColor(location.urgencyLevel);
        const urgencyText = location.urgencyLevel.charAt(0).toUpperCase() + location.urgencyLevel.slice(1);

        const listItem = document.createElement('div');
        listItem.className = 'pinned-item';
        listItem.onclick = () => {
            // Zoom to location on map
            map.setView(location.coords, 15);

            // Find and open the marker popup
            markerLayers.userReported.eachLayer((layer) => {
                if (layer.getLatLng().lat === location.coords[0] &&
                    layer.getLatLng().lng === location.coords[1]) {
                    layer.openPopup();
                }
            });

            // Hide the dropdown
            hidePinnedLocationsList();
        };

        // Bold search terms without adding spaces
        let displayName = location.name;
        if (currentSearchQuery) {
            const regex = new RegExp(`(${currentSearchQuery})`, 'gi');
            displayName = displayName.replace(regex, '<strong>$1</strong>');
        }

        listItem.innerHTML = `
            <div class="pinned-item-name">${displayName}</div>
            <div class="pinned-item-details">
                <span class="pinned-item-urgency" style="background-color: ${urgencyColor};">${urgencyText}</span>
                <span class="pinned-item-source">${location.source.toUpperCase()}</span>
                <span style="color: #666; font-size: 0.8rem;">${new Date(location.reportedAt).toLocaleDateString()}</span>
            </div>
            <div class="pinned-item-needs">${location.reliefNeeds.join(', ')}</div>
            <div class="pinned-item-actions">
                <button class="waze-btn" onclick="event.stopPropagation(); openWazeNavigation(${location.coords[0]}, ${location.coords[1]}, '${location.name.replace(/'/g, "\\'")}');">
                    <i class="fas fa-route"></i>
                    Navigate with Waze
                </button>
            </div>
        `;

        pinnedListContent.appendChild(listItem);
    });
}

function handleUrgencyFilter(e) {
    // Remove active class from all filters
    document.querySelectorAll('.urgency-filter').forEach(filter => {
        filter.classList.remove('active');
    });
    
    // Add active class to clicked filter
    e.target.closest('.urgency-filter').classList.add('active');
    
    // Update current filter
    currentUrgencyFilter = e.target.closest('.urgency-filter').dataset.urgency;
    
    // Apply filter
    filterPinnedLocations();
}

// Helper function to remove marker from all layers
function removeMarkerFromLayers(coords) {
    markerLayers.userReported.eachLayer(marker => {
        const markerCoords = marker.getLatLng();
        // Check if coordinates match (with small tolerance for floating point comparison)
        if (Math.abs(markerCoords.lat - coords[0]) < 0.0001 &&
            Math.abs(markerCoords.lng - coords[1]) < 0.0001) {
            markerLayers.userReported.removeLayer(marker);
        }
    });
}

// Function to open Waze navigation
function openWazeNavigation(lat, lng, locationName) {
    // Waze deep link format: https://waze.com/ul?ll=lat,lng&navigate=yes&zoom=17
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`;

    // Try to open Waze app first, fallback to web version
    const wazeAppUrl = `waze://?ll=${lat},${lng}&navigate=yes`;

    // Create a temporary link to test if Waze app is available
    const tempLink = document.createElement('a');
    tempLink.href = wazeAppUrl;
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);

    // Try to open the app
    try {
        tempLink.click();
        // If app doesn't open within 2 seconds, open web version
        setTimeout(() => {
            window.open(wazeUrl, '_blank');
        }, 2000);
    } catch (error) {
        // Fallback to web version
        window.open(wazeUrl, '_blank');
    } finally {
        document.body.removeChild(tempLink);
    }

}

// Welcome Guide Functions
function showWelcomeGuide() {
    const welcomeGuide = document.getElementById('welcomeGuide');
    if (welcomeGuide) {
        welcomeGuide.classList.add('show');
        // Disable interaction with the rest of the page
        document.body.style.overflow = 'hidden';
    }
}

function hideWelcomeGuide() {
    const welcomeGuide = document.getElementById('welcomeGuide');
    if (welcomeGuide) {
        welcomeGuide.classList.remove('show');
        // Re-enable interaction with the rest of the page
        document.body.style.overflow = 'auto';
        // Mark as completed so it doesn't show again
        localStorage.setItem('welcomeGuideCompleted', 'true');
        localStorage.setItem('welcomeGuideCompletedDate', new Date().toISOString());
    }
}

function shouldShowWelcomeGuide() {
    // Check if user has completed the welcome guide before
    const completed = localStorage.getItem('welcomeGuideCompleted');
    
    // Only show if user has NOT completed it yet
    return !completed;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Set initial status
    updateSyncStatus('connecting', 'Connecting...');

    // Show welcome guide on first visit
    if (shouldShowWelcomeGuide()) {
        showWelcomeGuide();
    }

    // Wait a bit for Firebase to load
    setTimeout(async () => {
        await initMap();
        
        // Check for URL hash to zoom to specific location
        // checkUrlHash();
    }, 1000);
    
    // Banner close functionality
    const closeBanner = document.getElementById('closeBanner');
    if (closeBanner) {
        closeBanner.addEventListener('click', () => {
            const banner = document.getElementById('userAdminBanner');
            if (banner) {
                banner.style.display = 'none';
                sessionStorage.setItem('bannerClosed', 'true');
            }
        });
    }
});

// Utility functions for external use
window.cancelReportingMode = cancelReportingMode;
window.removeUserReportedLocation = removeUserReportedLocation;
window.clearSearchResult = clearSearchResult;
window.pinHelpFromSearch = pinHelpFromSearch;

// Debug functions for testing
window.testModalClose = function () {
    closeReportModal();
};

window.testModalOpen = function () {
    document.getElementById('reportModal').style.display = 'flex';
};

window.testSearchSuggestions = function () {
    const container = document.getElementById('searchSuggestions');
    if (container) {
        container.innerHTML = `
            <div class="suggestion-item">
                <div class="suggestion-main">
                    <i class="fas fa-city"></i>
                    Test Location
                </div>
                <div class="suggestion-address">Test Address, Cebu</div>
                <div class="suggestion-details">
                    <span class="suggestion-type">Test</span>
                </div>
            </div>
        `;
        container.classList.add('show');
    }
};

// Emergency bypass function - use this if form is stuck
window.forceLocalMode = function () {
    window.firestoreDb = null;
    db = null;
    updateSyncStatus('offline', '📱 Local Mode - Firebase bypassed');
    alert('Switched to local-only mode. Form submissions will work but won\'t sync across devices.');
};
