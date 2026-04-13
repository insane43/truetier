// Firebase configuration - Main app (user data)
const firebaseConfig = {
    apiKey: "AIzaSyAfkpbdscu8j8LrlUm6ksXwX_RsZTPWTjI",
    authDomain: "faygo-2efbf.firebaseapp.com",
    databaseURL: "https://faygo-2efbf-default-rtdb.firebaseio.com",
    projectId: "faygo-2efbf",
    storageBucket: "faygo-2efbf.firebasestorage.app",
    messagingSenderId: "735195978905",
    appId: "1:735195978905:web:a85b9c31e69ec64398ec08"
};

// Kova license database URL
const KOVA_DB_URL = "https://kova-42298-default-rtdb.firebaseio.com";

let auth;
let app;
let database;
let currentUser = null;
let licenseVerified = false;
let licenseData = null;

// LocalStorage keys for license persistence
const LICENSE_STORAGE_KEY = 'faygo_license_verified';
const LICENSE_DATA_KEY = 'faygo_license_data';

// Save license verification to localStorage
function saveLicenseToStorage() {
    try {
        localStorage.setItem(LICENSE_STORAGE_KEY, 'true');
        localStorage.setItem(LICENSE_DATA_KEY, JSON.stringify(licenseData));
    } catch (error) {
        console.error('Error saving license to localStorage:', error);
    }
}

// Load license verification from localStorage
function loadLicenseFromStorage() {
    try {
        const verified = localStorage.getItem(LICENSE_STORAGE_KEY) === 'true';
        const data = localStorage.getItem(LICENSE_DATA_KEY);
        if (verified && data) {
            return {
                verified: true,
                licenseData: JSON.parse(data)
            };
        }
    } catch (error) {
        console.error('Error loading license from localStorage:', error);
    }
    return { verified: false, licenseData: null };
}

// Clear license from localStorage (for logout or license revocation)
function clearLicenseFromStorage() {
    try {
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        localStorage.removeItem(LICENSE_DATA_KEY);
    } catch (error) {
        console.error('Error clearing license from localStorage:', error);
    }
}

// Initialize Firebase
function initFirebase() {
    if (window.firebaseApp) {
        const { initializeApp, getAuth, getDatabase } = window.firebaseApp;
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        database = getDatabase(app);
        checkAuthState();
    } else {
        console.error('Firebase not loaded yet');
        setTimeout(initFirebase, 100);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 5000);
}

// Set button loading state
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Check authentication state
function checkAuthState() {
    const { onAuthStateChanged, ref, get, child, update } = window.firebaseApp;
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (!user.emailVerified) {
                showNotification('Please verify your email first.', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            currentUser = user;
            
            // Update email verified status in database
            try {
                await update(ref(database, 'users/' + user.uid), {
                    emailVerified: true
                });
            } catch (error) {
                console.error('Error updating verification status:', error);
            }
            
            // Load user data
            loadUserData(user);
            
            // Check if user has a stored license, otherwise show modal
            checkUserLicense(user);
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Check if user already has a valid license
async function checkUserLicense(user) {
    const { ref, get, child } = window.firebaseApp;
    
    // First check localStorage for previously verified license
    const storedLicense = loadLicenseFromStorage();
    if (storedLicense.verified && storedLicense.licenseData) {
        licenseVerified = true;
        licenseData = storedLicense.licenseData;
        updateLicenseDisplay();
        // Still validate with server in background, but don't block user
        validateLicenseInBackground(user);
        return;
    }
    
    try {
        const userSnapshot = await get(child(ref(database), 'users/' + user.uid));
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            
            if (userData.licenseKey) {
                // User has a stored license, validate it
                const result = await validateLicenseKey(userData.licenseKey, true);
                
                if (result.valid) {
                    licenseVerified = true;
                    licenseData = result.licenseData;
                    saveLicenseToStorage();
                    updateLicenseDisplay();
                    return;
                }
            }
        }
        
        // No valid license found, show modal
        showLicenseModal();
        
    } catch (error) {
        console.error('Error checking user license:', error);
        showLicenseModal();
    }
}

// Validate license in background without blocking user
async function validateLicenseInBackground(user) {
    const { ref, get, child } = window.firebaseApp;
    
    try {
        const userSnapshot = await get(child(ref(database), 'users/' + user.uid));
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            
            if (userData.licenseKey) {
                const result = await validateLicenseKey(userData.licenseKey, true);
                
                if (result.valid) {
                    licenseData = result.licenseData;
                    saveLicenseToStorage();
                    updateLicenseDisplay();
                } else {
                    // License is no longer valid, clear storage and show modal
                    clearLicenseFromStorage();
                    licenseVerified = false;
                    licenseData = null;
                    showLicenseModal();
                }
            }
        }
    } catch (error) {
        console.error('Error validating license in background:', error);
    }
}

// Show license modal
function showLicenseModal() {
    const licenseModal = document.getElementById('license-modal');
    licenseModal.classList.add('show');
}

// Unlock the app content
function unlockApp() {
    const app = document.getElementById('app');
    app.classList.remove('locked');
}

// Update license display in stats
function updateLicenseDisplay() {
    const licenseStatus = document.getElementById('license-status');
    const licenseExpiryDivider = document.getElementById('license-expiry-divider');
    const licenseExpiryItem = document.getElementById('license-expiry-item');
    const licenseExpiry = document.getElementById('license-expiry');
    
    if (licenseVerified && licenseData) {
        licenseStatus.textContent = 'Active';
        licenseStatus.classList.add('verified');
        
        // Unlock the app
        unlockApp();
        
        if (licenseData.expiryDate && licenseData.expiryDate > 0) {
            const expiryDate = new Date(licenseData.expiryDate);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            licenseExpiry.textContent = expiryDate.toLocaleDateString('en-US', options);
            licenseExpiryDivider.style.display = '';
            licenseExpiryItem.style.display = '';
        } else {
            licenseExpiry.textContent = 'Lifetime';
            licenseExpiryDivider.style.display = '';
            licenseExpiryItem.style.display = '';
        }
    } else {
        licenseStatus.textContent = 'Not Verified';
        licenseStatus.style.color = '#ef4444';
    }
}

// Load user data from database
async function loadUserData(user) {
    const { ref, get, child } = window.firebaseApp;
    
    try {
        const snapshot = await get(child(ref(database), 'users/' + user.uid));
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const username = userData.username || 'User';
            document.getElementById('user-name').textContent = username;
            document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
            
            // Format member since date - use createdAt or Firebase account creation time
            let memberDate = null;
            if (userData.createdAt) {
                memberDate = new Date(userData.createdAt);
            } else if (user.metadata && user.metadata.creationTime) {
                memberDate = new Date(user.metadata.creationTime);
            }
            
            if (memberDate && !isNaN(memberDate.getTime())) {
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                document.getElementById('member-since').textContent = memberDate.toLocaleDateString('en-US', options);
            } else {
                document.getElementById('member-since').textContent = 'N/A';
            }
        } else {
            document.getElementById('user-name').textContent = 'User';
            document.getElementById('user-avatar').textContent = 'U';
            
            // Use Firebase account creation time as fallback
            if (user.metadata && user.metadata.creationTime) {
                const memberDate = new Date(user.metadata.creationTime);
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                document.getElementById('member-since').textContent = memberDate.toLocaleDateString('en-US', options);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        document.getElementById('user-name').textContent = 'User';
        document.getElementById('user-avatar').textContent = 'U';
    }
}

// Validate license key against Kova database
async function validateLicenseKey(licenseKey, silent = false) {
    const { ref, update } = window.firebaseApp;
    
    try {
        // Fetch all licenses from Kova database using REST API
        const response = await fetch(`${KOVA_DB_URL}/licenses.json`);
        
        if (!response.ok) {
            return { valid: false, message: 'Error connecting to license server.' };
        }
        
        const allAppsLicenses = await response.json();
        
        if (!allAppsLicenses) {
            return { valid: false, message: 'No licenses found in database.' };
        }
        
        // Search through all apps' licenses
        for (const [appId, licensesData] of Object.entries(allAppsLicenses)) {
            if (!licensesData || typeof licensesData !== 'object') continue;
            
            for (const [licId, licData] of Object.entries(licensesData)) {
                if (!licData || typeof licData !== 'object') continue;
                if (licData.key !== licenseKey) continue;
                
                // Found matching key - store appId for updates
                const foundAppId = appId;
                const foundLicId = licId;
                // Check if banned
                if (licData.banned === true) {
                    const reason = licData.banReason || 'No reason provided';
                    return { valid: false, message: `License banned: ${reason}` };
                }
                
                // Check expiry
                const now = Date.now();
                if (licData.expiryDate && licData.expiryDate > 0 && licData.expiryDate < now) {
                    return { valid: false, message: 'License has expired.' };
                }
                
                // Check status and HWID
                const status = licData.status || 'Not used';
                const storedHwid = licData.hwid || '';
                
                // Generate a simple browser-based identifier
                const currentHwid = generateBrowserId();
                
                if (status === 'Not used') {
                    // First activation - update Kova database via REST
                    const updateData = {
                        status: 'Used',
                        hwid: currentHwid,
                        activatedAt: now,
                        activatedBy: currentUser ? currentUser.uid : 'unknown'
                    };
                    
                    await fetch(`${KOVA_DB_URL}/licenses/${foundAppId}/${foundLicId}.json`, {
                        method: 'PATCH',
                        body: JSON.stringify(updateData)
                    });
                    
                    // Store license key in user profile (Faygo database)
                    if (currentUser) {
                        await update(ref(database, 'users/' + currentUser.uid), {
                            licenseKey: licenseKey
                        });
                    }
                    
                    return { 
                        valid: true, 
                        message: 'License activated successfully!',
                        licenseData: { ...licData, ...updateData }
                    };
                } else if (status === 'Used') {
                    // License is already activated - allow access for web
                    // The C++ loader handles strict HWID checking
                    // For web, we just verify the key exists and is active
                    return { 
                        valid: true, 
                        message: 'License verified!',
                        licenseData: licData
                    };
                }
                
                return { valid: false, message: 'Unknown license status.' };
            }
        }
        
        return { valid: false, message: 'Invalid license key.' };
    } catch (error) {
        console.error('License validation error:', error);
        return { valid: false, message: 'Error validating license. Please try again.' };
    }
}

// Generate a simple browser-based identifier
function generateBrowserId() {
    const nav = window.navigator;
    const screen = window.screen;
    
    let id = '';
    id += nav.userAgent || '';
    id += screen.width + 'x' + screen.height;
    id += screen.colorDepth || '';
    id += nav.language || '';
    id += new Date().getTimezoneOffset();
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
}

// Modal elements
const licenseModal = document.getElementById('license-modal');
const closeLicenseModalBtn = document.getElementById('close-license-modal');
const licenseForm = document.getElementById('license-form');

// Close modal - only if license is verified
closeLicenseModalBtn.addEventListener('click', () => {
    if (licenseVerified) {
        licenseModal.classList.remove('show');
    } else {
        showNotification('Please verify your license to continue.', 'error');
    }
});

// Close modal when clicking outside - only if license is verified
licenseModal.addEventListener('click', (e) => {
    if (e.target === licenseModal && licenseVerified) {
        licenseModal.classList.remove('show');
    }
});

// Close modal with Escape key - only if license is verified
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && licenseModal.classList.contains('show') && licenseVerified) {
        licenseModal.classList.remove('show');
    }
});

// Handle license form submission
licenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const licenseKeyInput = document.getElementById('license-key-input');
    const submitBtn = document.getElementById('verify-license-btn');
    const licenseKey = licenseKeyInput.value.trim();
    
    if (!licenseKey) {
        showNotification('Please enter a license key.', 'error');
        return;
    }
    
    setButtonLoading(submitBtn, true);
    
    const result = await validateLicenseKey(licenseKey);
    
    setButtonLoading(submitBtn, false);
    
    if (result.valid) {
        licenseVerified = true;
        licenseData = result.licenseData;
        saveLicenseToStorage();
        
        showNotification(result.message, 'success');
        licenseModal.classList.remove('show');
        licenseForm.reset();
        
        // Update license display
        updateLicenseDisplay();
    } else {
        showNotification(result.message, 'error');
    }
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const { signOut } = window.firebaseApp;
        clearLicenseFromStorage();
        await signOut(auth);
        showNotification('Logged out successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out. Please try again.', 'error');
    }
});

// Periodic license check to prevent tampering
function startLicenseCheck() {
    setInterval(() => {
        const app = document.getElementById('app');
        
        // If app is unlocked but license not verified, re-lock it
        if (!app.classList.contains('locked') && !licenseVerified) {
            app.classList.add('locked');
            showLicenseModal();
        }
        
        // If modal was removed from DOM, redirect to login
        const modal = document.getElementById('license-modal');
        if (!modal && !licenseVerified) {
            window.location.href = 'login.html';
        }
    }, 1000);
}

// Initialize on page load
window.addEventListener('load', () => {
    setTimeout(initFirebase, 300);
    startLicenseCheck();
});
