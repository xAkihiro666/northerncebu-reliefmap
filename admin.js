// Admin Panel JavaScript
// Handles authentication and pin management

let db = null;
let auth = null;
let currentUser = null;
let allLocations = [];
let filteredLocations = [];
let unsubscribeListener = null;
let selectedLocationForDeletion = null;
let selectedLocationForDetails = null;

// Wait for Firebase to load
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        const checkFirebase = setInterval(() => {
            attempts++;
            if (window.firestoreDb && window.firebaseAuth) {
                clearInterval(checkFirebase);
                db = window.firestoreDb;
                auth = window.firebaseAuth;
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkFirebase);
                reject(new Error('Firebase failed to load'));
            }
        }, 100);
    });
}

// Initialize admin panel
async function initAdmin() {
    try {
        await waitForFirebase();
        console.log('Firebase loaded successfully');

        // Check authentication state
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                showDashboard();
                await loadAllLocations();
            } else {
                showLoginScreen();
            }
        });

        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
        showError('Failed to connect to database. Please refresh the page.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Search
    document.getElementById('searchPins').addEventListener('input', handleSearch);

    // Filters
    document.getElementById('urgencyFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        btn.disabled = true;

        await loadAllLocations();

        btn.innerHTML = originalHTML;
        btn.disabled = false;
    });

    // Delete modal
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', handleDeleteConfirm);

    // Details modal
    document.getElementById('closeDetailsModal').addEventListener('click', closeDetailsModal);
    document.getElementById('closeDetailsBtn').addEventListener('click', closeDetailsModal);
    document.getElementById('viewOnMapBtn').addEventListener('click', viewOnMap);

    // Close modals on outside click
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });
    document.getElementById('detailsModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailsModal') closeDetailsModal();
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        await signInWithEmailAndPassword(auth, email, password);
        
        // Success - onAuthStateChanged will handle the rest
        console.log('Login successful');
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        submitBtn.disabled = false;

        // Show error message
        let errorMessage = 'Login failed. Please check your credentials.';
        
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No admin account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid credentials. Please check your email and password.';
        }

        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
        await signOut(auth);
        
        // Clean up
        if (unsubscribeListener) {
            unsubscribeListener();
            unsubscribeListener = null;
        }
        
        currentUser = null;
        allLocations = [];
        filteredLocations = [];
        
        showLoginScreen();
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    
    // Clear form
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Update user email display
    if (currentUser && currentUser.email) {
        document.getElementById('adminUserEmail').textContent = currentUser.email;
    }
}

// Load all locations from Firestore
async function loadAllLocations() {
    try {
        const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

        // Set up real-time listener
        if (unsubscribeListener) {
            unsubscribeListener();
        }

        const locationsQuery = query(collection(db, 'relief-locations'), orderBy('reportedAt', 'desc'));

        unsubscribeListener = onSnapshot(locationsQuery, (snapshot) => {
            allLocations = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                data.firestoreId = doc.id;
                allLocations.push(data);
            });

            console.log(`Loaded ${allLocations.length} locations`);
            updateStats();
            applyFilters();
        }, (error) => {
            console.error('Error loading locations:', error);
            showError('Failed to load locations. Please refresh the page.');
        });

    } catch (error) {
        console.error('Error setting up listener:', error);
        showError('Failed to load locations. Please refresh the page.');
    }
}

// Update statistics
function updateStats() {
    const critical = allLocations.filter(loc => loc.urgencyLevel === 'critical').length;
    const urgent = allLocations.filter(loc => loc.urgencyLevel === 'urgent').length;
    const moderate = allLocations.filter(loc => loc.urgencyLevel === 'moderate').length;
    const total = allLocations.length;

    document.getElementById('criticalCount').textContent = critical;
    document.getElementById('urgentCount').textContent = urgent;
    document.getElementById('moderateCount').textContent = moderate;
    document.getElementById('totalCount').textContent = total;
}

// Handle search
function handleSearch() {
    applyFilters();
}

// Apply filters and sorting
function applyFilters() {
    const searchTerm = document.getElementById('searchPins').value.toLowerCase().trim();
    const urgencyFilter = document.getElementById('urgencyFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    // Filter locations
    filteredLocations = allLocations.filter(location => {
        // Search filter
        const matchesSearch = !searchTerm || 
            location.name.toLowerCase().includes(searchTerm) ||
            location.source.toLowerCase().includes(searchTerm) ||
            (location.reporterName && location.reporterName.toLowerCase().includes(searchTerm)) ||
            (location.additionalInfo && location.additionalInfo.toLowerCase().includes(searchTerm)) ||
            location.reliefNeeds.some(need => need.toLowerCase().includes(searchTerm));

        // Urgency filter
        const matchesUrgency = urgencyFilter === 'all' || location.urgencyLevel === urgencyFilter;

        return matchesSearch && matchesUrgency;
    });

    // Sort locations
    filteredLocations.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.reportedAt) - new Date(a.reportedAt);
            case 'date-asc':
                return new Date(a.reportedAt) - new Date(b.reportedAt);
            case 'urgency':
                const urgencyOrder = { 'critical': 3, 'urgent': 2, 'moderate': 1 };
                return (urgencyOrder[b.urgencyLevel] || 0) - (urgencyOrder[a.urgencyLevel] || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    renderTable();
}

// Render pins table
function renderTable() {
    const tbody = document.getElementById('pinsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filteredLocations.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    const html = filteredLocations.map(location => {
        const urgencyColor = getUrgencyColor(location.urgencyLevel);
        const urgencyText = location.urgencyLevel.charAt(0).toUpperCase() + location.urgencyLevel.slice(1);
        const date = new Date(location.reportedAt).toLocaleString();
        const reliefNeeds = location.reliefNeeds.join(', ');
        const reporter = location.reporterName || 'Anonymous';

        return `
            <tr data-id="${location.firestoreId}">
                <td>
                    <strong>${escapeHtml(location.name)}</strong>
                    <br>
                    <small class="text-muted">${location.coords[0].toFixed(4)}, ${location.coords[1].toFixed(4)}</small>
                </td>
                <td>
                    <span class="urgency-badge" style="background-color: ${urgencyColor};">
                        ${urgencyText}
                    </span>
                </td>
                <td>
                    <span class="source-badge">${escapeHtml(location.source.toUpperCase())}</span>
                </td>
                <td>
                    <div class="relief-needs-cell">${escapeHtml(reliefNeeds)}</div>
                </td>
                <td>${escapeHtml(reporter)}</td>
                <td>
                    <small>${date}</small>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon btn-info" onclick="viewDetails('${location.firestoreId}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="showDeleteModal('${location.firestoreId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

// Get urgency color
function getUrgencyColor(urgency) {
    switch (urgency) {
        case 'critical':
            return '#dc3545';
        case 'urgent':
            return '#fd7e14';
        case 'moderate':
            return '#ffc107';
        default:
            return '#6c757d';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show delete modal
function showDeleteModal(firestoreId) {
    const location = allLocations.find(loc => loc.firestoreId === firestoreId);
    if (!location) return;

    selectedLocationForDeletion = location;

    const infoDiv = document.getElementById('deleteLocationInfo');
    infoDiv.innerHTML = `
        <div class="delete-location-preview">
            <p><strong>Location:</strong> ${escapeHtml(location.name)}</p>
            <p><strong>Urgency:</strong> <span style="color: ${getUrgencyColor(location.urgencyLevel)};">${location.urgencyLevel.toUpperCase()}</span></p>
            <p><strong>Source:</strong> ${escapeHtml(location.source)}</p>
            <p><strong>Reporter:</strong> ${escapeHtml(location.reporterName || 'Anonymous')}</p>
            <p><strong>Reported:</strong> ${new Date(location.reportedAt).toLocaleString()}</p>
        </div>
    `;

    document.getElementById('deleteModal').style.display = 'flex';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    selectedLocationForDeletion = null;
}

// Handle delete confirmation
async function handleDeleteConfirm() {
    if (!selectedLocationForDeletion) return;

    const confirmBtn = document.getElementById('confirmDelete');
    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    confirmBtn.disabled = true;

    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        
        await deleteDoc(doc(db, 'relief-locations', selectedLocationForDeletion.firestoreId));
        
        console.log('Location deleted successfully:', selectedLocationForDeletion.name);
        showSuccess(`Successfully deleted "${selectedLocationForDeletion.name}"`);
        
        closeDeleteModal();
        
    } catch (error) {
        console.error('Error deleting location:', error);
        showError('Failed to delete location. Please try again.');
        
        // Reset button
        confirmBtn.innerHTML = originalHTML;
        confirmBtn.disabled = false;
    }
}

// View details
function viewDetails(firestoreId) {
    const location = allLocations.find(loc => loc.firestoreId === firestoreId);
    if (!location) return;

    selectedLocationForDetails = location;

    const detailsDiv = document.getElementById('locationDetails');
    const urgencyColor = getUrgencyColor(location.urgencyLevel);

    detailsDiv.innerHTML = `
        <div class="location-details-content">
            <div class="detail-section">
                <h4><i class="fas fa-map-marker-alt"></i> Location Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${escapeHtml(location.name)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Coordinates:</label>
                        <span>${location.coords[0].toFixed(6)}, ${location.coords[1].toFixed(6)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Urgency Level:</label>
                        <span class="urgency-badge" style="background-color: ${urgencyColor};">
                            ${location.urgencyLevel.toUpperCase()}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Source:</label>
                        <span class="source-badge">${escapeHtml(location.source.toUpperCase())}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-hands-helping"></i> Relief Needs</h4>
                <div class="relief-needs-list">
                    ${location.reliefNeeds.map(need => `
                        <span class="relief-need-tag">${escapeHtml(need)}</span>
                    `).join('')}
                </div>
            </div>

            ${location.additionalInfo ? `
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Additional Information</h4>
                    <p class="additional-info">${escapeHtml(location.additionalInfo)}</p>
                </div>
            ` : ''}

            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Reporter Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${escapeHtml(location.reporterName || 'Anonymous')}</span>
                    </div>
                    ${location.reporterContact ? `
                        <div class="detail-item">
                            <label>Contact:</label>
                            <span>${escapeHtml(location.reporterContact)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <label>Reported At:</label>
                        <span>${new Date(location.reportedAt).toLocaleString()}</span>
                    </div>
                    ${location.userId ? `
                        <div class="detail-item">
                            <label>User ID:</label>
                            <span class="text-muted" style="font-size: 0.85rem;">${location.userId}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-database"></i> Database Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Document ID:</label>
                        <span class="text-muted" style="font-size: 0.85rem;">${location.firestoreId}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('detailsModal').style.display = 'flex';
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
    selectedLocationForDetails = null;
}

// View on map
function viewOnMap() {
    if (!selectedLocationForDetails) return;
    
    const coords = selectedLocationForDetails.coords;
    window.open(`index.html#${coords[0]},${coords[1]},15`, '_blank');
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'toast toast-success';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
        successDiv.classList.remove('show');
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'toast toast-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.classList.add('show');
    }, 10);

    setTimeout(() => {
        errorDiv.classList.remove('show');
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// Make functions globally accessible
window.showDeleteModal = showDeleteModal;
window.viewDetails = viewDetails;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdmin);
