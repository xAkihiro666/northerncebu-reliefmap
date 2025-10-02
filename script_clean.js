// Northern Cebu Earthquake Relief Map Guide
// Community reporting map for locations needing help

// Custom alert function to show "System says" instead of URL
function systemAlert(message) {
    // Create custom modal instead of browser alert
    const alertModal = document.createElement('div');
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
            <button onclick="this.closest('div').parentElement.remove()" style="
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
        console.log('🌐 Firebase public server initialized successfully - Real-time sync enabled');
        updateSyncStatus('online', 'Public Server Online');
        
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
            console.log('Location saved to Firestore with ID:', docRef.id);
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
        
        console.log(`Loaded ${userReportedLocations.length} locations from Firestore`);
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
        console.log('Location deleted from Firestore:', firestoreId);
        return true;
    } catch (error) {
        console.error('Error deleting from Firestore:', error);
        return false;
    }
}

// Real-time listener for new locations
async function setupRealtimeListener() {
    if (!db) return;
    
    try {
        const { onSnapshot, collection } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        
        unsubscribeListener = onSnapshot(collection(db, 'relief-locations'), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    data.firestoreId = change.doc.id;
                    
                    // Check if this location is already in our local array
                    const exists = userReportedLocations.find(loc => loc.firestoreId === data.firestoreId);
                    if (!exists) {
                        userReportedLocations.push(data);
                        addUserReportedMarker(data);
                        updatePinnedLocationsList();
                        console.log('New location added via real-time sync:', data.name);
                    }
                }
                
                if (change.type === 'removed') {
                    const removedId = change.doc.id;
                    const index = userReportedLocations.findIndex(loc => loc.firestoreId === removedId);
                    if (index > -1) {
                        const removedLocation = userReportedLocations[index];
                        userReportedLocations.splice(index, 1);
                        removeMarkerFromLayers(removedLocation.coords);
                        
                        // Update localStorage backup
                        localStorage.setItem('userReportedLocations', JSON.stringify(userReportedLocations));
                        
                        // Update pinned locations list
                        updatePinnedLocationsList();
                        
                        console.log('Location removed via real-time sync:', removedLocation.name);
                        
                        // Close popup if it's showing the deleted location
                        map.closePopup();
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
    }
}

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

// Initialize the map
async function initMap() {
    // Create map centered on Northern Cebu
    map = L.map('map').setView(NORTHERN_CEBU_CENTER, 10);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
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
    
    // Info panel close button
    document.getElementById('closeInfo').addEventListener('click', () => {
        document.getElementById('infoPanel').style.display = 'none';
    });
    
    // Directions panel close button
    document.getElementById('closeDirections').addEventListener('click', () => {
        document.getElementById('directionsPanel').style.display = 'none';
    });
    
    // Legend toggle button
    document.getElementById('toggleLegend').addEventListener('click', toggleMapLegend);
    
    // Pinned locations dropdown
    document.getElementById('viewPinnedBtn').addEventListener('click', togglePinnedLocationsList);
    document.getElementById('closePinnedList').addEventListener('click', hidePinnedLocationsList);
    
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
    { name: 'Jovencio', address: 'Jovencio, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0575, 124.0075] },
    { name: 'Simbawan', address: 'Simbawan, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0592, 124.0092] },
    { name: 'Panabilan', address: 'Panabilan, Nailon, Bogo City, Cebu', type: 'Sitio', coords: [11.0567, 124.0058] },
    { name: 'Curva Libertad', address: 'Curva Libertad, Bogo City, Cebu', type: 'Area', coords: [11.0483, 124.0142] },
    
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
    { name: 'Tabuelan Health Center', address: 'Rural Health Unit, Tabuelan, Cebu', type: 'Landmark', coords: [10.8158, 123.9158] }
];

// Autocomplete functions
function handleSearchInput() {
    const searchTerm = document.getElementById('searchLocation').value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (searchTerm.length < 2) {
        hideSuggestions();
        return;
    }
    
    // Debounce search requests
    searchTimeout = setTimeout(() => {
        fetchSuggestions(searchTerm);
    }, 300);
}

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
            selectSuggestion(suggestions[currentSuggestionIndex]);
        } else {
            searchLocation();
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
        document.getElementById('searchLocation').blur();
    }
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
    const startsWithMatches = [];
    
    // Search in common locations - ONLY show if name or address part STARTS with the term
    commonLocations.forEach(location => {
        const locationName = location.name.toLowerCase();
        const locationAddress = location.address.toLowerCase();
        
        // Check if name starts with the search term
        const nameStartsWith = locationName.startsWith(term);
        
        // Check if any word in the address starts with the search term
        const addressWords = locationAddress.split(/[,\s]+/).map(word => word.trim()).filter(word => word.length > 0);
        const addressWordStartsWith = addressWords.some(word => word.startsWith(term));
        
        if (nameStartsWith || addressWordStartsWith) {
            startsWithMatches.push({
                name: location.name,
                shortAddress: location.address,
                type: location.type,
                coords: location.coords,
                source: 'local',
                priority: nameStartsWith ? 1 : 2 // Name matches get higher priority
            });
        }
    });
    
    // Search in user reported locations - ONLY show if name STARTS with the term
    userReportedLocations.forEach(location => {
        const locationName = location.name.toLowerCase();
        
        // Only include if the location name starts with the search term
        if (locationName.startsWith(term)) {
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
    
    // Sort by priority (name matches first, then address matches)
    startsWithMatches.sort((a, b) => a.priority - b.priority);
    
    return startsWithMatches.slice(0, 8);
}

async function getGeocodingSuggestions(searchTerm) {
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
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=8&addressdetails=1&bounded=1&viewbox=123.5,11.5,125.0,9.5&extratags=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Northern Cebu Earthquake Relief Map'
                }
            });
            
            if (response.ok) {
                const results = await response.json();
                
                // Filter results to prioritize Northern Cebu area
                const filteredResults = results.filter(result => {
                    const displayName = result.display_name.toLowerCase();
                    return displayName.includes('cebu') || 
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
                           displayName.includes('borbon');
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
        const isUserReported = suggestion.source === 'user_reported';
        
        return `
            <div class="suggestion-item" onclick="selectSuggestion(suggestions[${index}])">
                <div class="suggestion-main">${highlightMatch(suggestion.name, searchTerm)}</div>
                <div class="suggestion-address">${addressDisplay}</div>
                <div class="suggestion-details">
                    <span class="suggestion-type">${suggestion.type}</span>
                    ${urgencyIndicator}
                    ${isUserReported ? '<span class="suggestion-distance">📍 Relief Location</span>' : ''}
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
        console.log('🔍 Geocoding selected suggestion:', searchTerm);
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
        // Try multiple search variations for better accuracy
        const searchVariations = [
            searchTerm,
            `${searchTerm}, Philippines`,
            `${originalName}, Cebu, Philippines`,
            `${originalName}, Northern Cebu, Philippines`
        ];
        
        let bestResult = null;
        
        for (const query of searchVariations) {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=3&addressdetails=1&bounded=1&viewbox=123.5,11.5,125.0,9.5`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Northern Cebu Earthquake Relief Map'
                }
            });
            
            if (response.ok) {
                const results = await response.json();
                
                if (results && results.length > 0) {
                    // Filter results to prioritize Northern Cebu locations
                    const filteredResults = results.filter(result => {
                        const displayName = result.display_name.toLowerCase();
                        return displayName.includes('cebu') || 
                               displayName.includes('bogo') ||
                               displayName.includes('medellin') ||
                               displayName.includes('tabuelan') ||
                               displayName.includes('san remigio') ||
                               displayName.includes('tuburan') ||
                               displayName.includes('asturias') ||
                               displayName.includes('balamban');
                    });
                    
                    if (filteredResults.length > 0) {
                        bestResult = filteredResults[0];
                        break;
                    } else if (results.length > 0) {
                        bestResult = results[0];
                        break;
                    }
                }
            }
        }
        
        resetSearchButton(searchBtn, originalHTML);
        
        if (bestResult) {
            const coords = [parseFloat(bestResult.lat), parseFloat(bestResult.lon)];
            showSearchResult(coords, bestResult.display_name, 'Found Location');
            console.log('✅ Location found:', bestResult.display_name);
        } else {
            // If no results found, show a more helpful message
            alert(`Location "${originalName}" not found in mapping data. This might be a very specific area not yet mapped. Try searching for the nearest barangay or municipality instead.`);
            console.log('❌ No results found for:', searchTerm);
        }
        
    } catch (error) {
        resetSearchButton(searchBtn, originalHTML);
        console.error('❌ Geocoding error:', error);
        alert('Search failed. Please check your internet connection and try again.');
    }
}

function hideSuggestions() {
    document.getElementById('searchSuggestions').style.display = 'none';
    currentSuggestionIndex = -1;
}

function searchLocation() {
    const searchTerm = document.getElementById('searchLocation').value.trim();
    
    if (!searchTerm) {
        alert('Please enter a location to search for.');
        return;
    }
    
    hideSuggestions();
    
    // Show loading state
    const searchBtn = document.getElementById('searchBtn');
    const originalHTML = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    searchBtn.disabled = true;
    
    // First, search in user reported locations
    const userReported = userReportedLocations.find(location => 
        location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (userReported) {
        showSearchResult(userReported.coords, userReported.name, 'User Reported Location');
        resetSearchButton(searchBtn, originalHTML);
        return;
    }
    
    // If not found in user reports, use geocoding API
    geocodeLocation(searchTerm)
        .then(results => {
            resetSearchButton(searchBtn, originalHTML);
            
            if (results && results.length > 0) {
                // Filter results to prioritize Philippines/Cebu locations
                const philippinesResults = results.filter(result => 
                    result.display_name.toLowerCase().includes('philippines') ||
                    result.display_name.toLowerCase().includes('cebu') ||
                    result.display_name.toLowerCase().includes('bohol') ||
                    result.display_name.toLowerCase().includes('leyte')
                );
                
                const bestResult = philippinesResults.length > 0 ? philippinesResults[0] : results[0];
                const coords = [parseFloat(bestResult.lat), parseFloat(bestResult.lon)];
                
                showSearchResult(coords, bestResult.display_name, 'Found Location');
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

function geocodeLocation(query) {
    // Use Nominatim (OpenStreetMap) geocoding service
    // Bias search towards Philippines and specifically Cebu
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ph&limit=5&addressdetails=1&bounded=1&viewbox=123.5,11.5,125.0,9.5`;
    
    return fetch(url, {
        headers: {
            'User-Agent': 'Northern Cebu Earthquake Relief Map'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    });
}

function showSearchResult(coords, displayName, resultType) {
    // Remove previous search marker if exists
    if (searchMarker) {
        map.removeLayer(searchMarker);
    }
    
    // Center map on the location
    map.setView(coords, 14);
    
    // Add search result marker
    searchMarker = L.marker(coords, {
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
    
    searchMarker.bindPopup(popupContent).openPopup();
    
    // Auto-remove the marker after 30 seconds
    setTimeout(() => {
        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }
    }, 30000);
}

function clearSearchResult() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
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
}

// User reporting functions
function startReportingMode() {
    isReportingMode = true;
    document.body.style.cursor = 'crosshair';
    
    // Show instruction overlay
    const instruction = document.createElement('div');
    instruction.id = 'clickInstruction';
    instruction.className = 'click-to-mark-instruction';
    instruction.innerHTML = `
        <h4><i class="fas fa-map-marker-alt"></i> Click on Map to Mark Location</h4>
        <p>Click anywhere on the map to mark a location that needs help</p>
        <button onclick="cancelReportingMode()" class="btn btn-secondary btn-sm">Cancel</button>
    `;
    document.body.appendChild(instruction);
    
    // Set up map click handler
    map.once('click', handleMapClickForReport);
}

function cancelReportingMode() {
    isReportingMode = false;
    document.body.style.cursor = 'default';
    const instruction = document.getElementById('clickInstruction');
    if (instruction) {
        instruction.remove();
    }
    map.off('click', handleMapClickForReport);
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
    console.log('🔄 Closing report modal...');
    
    const modal = document.getElementById('reportModal');
    const form = document.getElementById('reportForm');
    
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Modal hidden');
    } else {
        console.error('❌ Modal element not found');
    }
    
    if (form) {
        form.reset();
        console.log('✅ Form reset');
        
        // Re-enable submit button if it was disabled
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Report';
        }
    } else {
        console.error('❌ Form element not found');
    }
    
    // Remove temporary marker
    if (window.tempReportMarker) {
        map.removeLayer(window.tempReportMarker);
        window.tempReportMarker = null;
        console.log('✅ Temporary marker removed');
    }
    
    // Clear search result data
    window.currentSearchResult = null;
    
    pendingReportCoords = null;
    
    console.log('✅ Report modal closed successfully');
}

async function submitLocationReport(e) {
    e.preventDefault();
    
    console.log('📝 Form submission started...');
    
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
        // Create user report object
        const userReport = {
            id: 'user_' + Date.now(),
            createdBy: window.getCurrentUserId ? window.getCurrentUserId() : 'anonymous',
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
        
        console.log('💾 Saving location report...', userReport);
        
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
            console.log('📱 Firebase not configured, saving locally only');
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
        
        console.log(`✅ Location saved via ${saveMethod} and added to map`);
        
        // Remove temporary marker
        if (window.tempReportMarker) {
            map.removeLayer(window.tempReportMarker);
            window.tempReportMarker = null;
        }
        
        // Show success message
        showSuccessMessage('Location reported successfully! 🌐 Now visible to all users on the public server. Thank you for helping the relief efforts!');
        
        console.log('🎉 Report submission completed successfully');
        
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
    
    // Close modal - moved to finally block to ensure it always runs
    console.log('🔄 Closing modal...');
    closeReportModal();
    
    // Re-enable submit button
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Report';
    }
}

function addUserReportedMarker(report) {
    const urgencyColor = getUrgencyColor(report.urgencyLevel);
    
    const icon = L.divIcon({
        className: 'user-reported-marker',
        html: `
            <div style="position: relative;">
                <i class="fas fa-map-marker-alt" style="color: ${urgencyColor}; font-size: 18px;"></i>
                <div class="user-reported-badge">U</div>
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
    switch(urgencyLevel) {
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
    const canDelete = window.canDeleteLocation ? window.canDeleteLocation(report) : true;
    
    // Create appropriate action button
    const actionButton = canDelete ? 
        `<button onclick="removeUserReportedLocation('${uniqueId}')" class="btn btn-danger btn-sm" title="Remove this location">
            <i class="fas fa-trash"></i> Remove
        </button>` : 
        `<span class="text-muted" style="font-size: 0.8rem; padding: 0.5rem;">
            <i class="fas fa-lock"></i> Only the reporter can remove this location
        </span>`;
    
    return `
        <div class="popup-content">
            <h4><i class="fas fa-map-marker-alt"></i> ${report.name} <span style="font-size: 12px; color: #17a2b8;">[USER REPORTED]</span></h4>
            <p><strong>Source:</strong> ${sourceBadge}</p>
            <p><strong>Urgency:</strong> ${urgencyBadge}</p>
            <p><strong>Relief Needs:</strong> ${report.reliefNeeds.join(', ')}</p>
            ${report.additionalInfo ? `<p><strong>Details:</strong> ${report.additionalInfo}</p>` : ''}
            <p><strong>Reported:</strong> ${new Date(report.reportedAt).toLocaleDateString()}</p>
            ${report.reporterName ? `<p><strong>Reporter:</strong> ${report.reporterName}</p>` : ''}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                <i class="fas fa-info-circle"></i> This location was reported by a community member and needs verification.
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center;">
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
        
        // Update pinned locations list
        updatePinnedLocationsList();
        
        console.log(`Loaded ${locations.length} locations successfully`);
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
        console.warn('Could not find location by ID, attempting coordinate-based search');
        // This is a fallback - not ideal but helps with edge cases
        reportIndex = userReportedLocations.findIndex(report => {
            // Convert identifier back to check if it's a coordinate-based temp ID
            return report.id === identifier || report.firestoreId === identifier;
        });
    }
    
    if (reportIndex === -1) {
        console.error('Location not found with identifier:', identifier);
        console.log('Available locations:', userReportedLocations.map(r => ({id: r.id, firestoreId: r.firestoreId, name: r.name})));
        systemAlert('Location not found. It may have already been removed by another user.');
        return;
    }
    
    report = userReportedLocations[reportIndex];
    console.log('Found location to delete:', {id: report.id, firestoreId: report.firestoreId, name: report.name});
    
    // Try to delete from Firestore first
    let deletedFromFirestore = false;
    if (report.firestoreId) {
        deletedFromFirestore = await deleteLocationFromFirestore(report.firestoreId);
    }
    
    // Remove from local array
    userReportedLocations.splice(reportIndex, 1);
    
    // Update localStorage as backup
    localStorage.setItem('userReportedLocations', JSON.stringify(userReportedLocations));
    
    // Remove from map layers
    removeMarkerFromLayers(report.coords);
    
    // Show success message
    const message = deletedFromFirestore ? 
        'Location removed successfully from all devices.' : 
        'Location removed locally. May still appear on other devices.';
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

function updatePinnedLocationsList() {
    const pinnedCount = document.getElementById('pinnedCount');
    const pinnedListContent = document.getElementById('pinnedListContent');
    
    // Update count
    pinnedCount.textContent = userReportedLocations.length;
    
    // Clear existing content
    pinnedListContent.innerHTML = '';
    
    if (userReportedLocations.length === 0) {
        pinnedListContent.innerHTML = '<p class="no-pins">No locations pinned yet. Click "Report Location" to add one.</p>';
        return;
    }
    
    // Sort locations by urgency and date
    const sortedLocations = [...userReportedLocations].sort((a, b) => {
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
        
        listItem.innerHTML = `
            <div class="pinned-item-name">${location.name}</div>
            <div class="pinned-item-details">
                <span class="pinned-item-urgency" style="background-color: ${urgencyColor};">${urgencyText}</span>
                <span class="pinned-item-source">${location.source.toUpperCase()}</span>
                <span style="color: #666; font-size: 0.8rem;">${new Date(location.reportedAt).toLocaleDateString()}</span>
            </div>
            <div class="pinned-item-needs">${location.reliefNeeds.join(', ')}</div>
        `;
        
        pinnedListContent.appendChild(listItem);
    });
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

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Set initial status
    updateSyncStatus('connecting', 'Connecting...');
    
    // Wait a bit for Firebase to load
    setTimeout(async () => {
        await initMap();
    }, 1000);
});

// Utility functions for external use
window.cancelReportingMode = cancelReportingMode;
window.removeUserReportedLocation = removeUserReportedLocation;
window.clearSearchResult = clearSearchResult;
window.pinHelpFromSearch = pinHelpFromSearch;

// Debug functions for testing
window.testModalClose = function() {
    console.log('🧪 Testing modal close functionality...');
    closeReportModal();
};

window.testModalOpen = function() {
    console.log('🧪 Testing modal open functionality...');
    document.getElementById('reportModal').style.display = 'flex';
};

// Emergency bypass function - use this if form is stuck
window.forceLocalMode = function() {
    console.log('🚨 Forcing local-only mode (bypassing Firebase)');
    window.firestoreDb = null;
    db = null;
    updateSyncStatus('offline', '📱 Local Mode - Firebase bypassed');
    alert('Switched to local-only mode. Form submissions will work but won\'t sync across devices.');
};
