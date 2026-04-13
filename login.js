const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const eyeIcons = document.querySelectorAll('.eye-icon');

// Firebase configuration - UPDATE THESE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAfkpbdscu8j8LrlUm6ksXwX_RsZTPWTjI",
    authDomain: "faygo-2efbf.firebaseapp.com",
    databaseURL: "https://faygo-2efbf-default-rtdb.firebaseio.com",
    projectId: "faygo-2efbf",
    storageBucket: "faygo-2efbf.firebasestorage.app",
    messagingSenderId: "735195978905",
    appId: "1:735195978905:web:a85b9c31e69ec64398ec08"
};

let auth;
let app;
let database;

// Initialize Firebase when window.firebaseApp is available
function initFirebase() {
    if (window.firebaseApp) {
        const { initializeApp, getAuth, getDatabase } = window.firebaseApp;
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        database = getDatabase(app);
        console.log('Firebase initialized successfully');
    } else {
        console.error('Firebase not loaded yet');
    }
}

// Show notification message
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

// Eye icon toggle for password visibility
eyeIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        const input = icon.previousElementSibling;
        icon.classList.add('animating');
        setTimeout(() => {
            icon.classList.remove('animating');
        }, 300);
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            input.type = 'password';
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    });
});

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.dataset.tab;
        
        if (tabName === 'login') {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            loginForm.style.animation = 'none';
            loginForm.offsetHeight;
            loginForm.style.animation = 'fadeInForm 0.4s ease-out';
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            signupForm.style.animation = 'none';
            signupForm.offsetHeight;
            signupForm.style.animation = 'fadeInForm 0.4s ease-out';
        }
    });
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth) {
        initFirebase();
        if (!auth) {
            showNotification('Firebase not initialized. Please refresh the page.', 'error');
            return;
        }
    }

    const submitBtn = loginForm.querySelector('.submit-btn');
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    setButtonLoading(submitBtn, true);

    try {
        const { signInWithEmailAndPassword } = window.firebaseApp;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user.emailVerified) {
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showNotification('Please verify your email before logging in. Check your inbox and spam folder.', 'error');
            await auth.signOut();
            setButtonLoading(submitBtn, false);
        }
    } catch (error) {
        console.error('Login error:', error);
        setButtonLoading(submitBtn, false);
        
        if (error.code === 'auth/user-not-found') {
            showNotification('No account found with this email. Please sign up.', 'error');
        } else if (error.code === 'auth/wrong-password') {
            showNotification('Incorrect password.', 'error');
        } else if (error.code === 'auth/invalid-credential') {
            showNotification('Invalid email or password.', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            showNotification('Too many failed attempts. Please try again later.', 'error');
        } else {
            showNotification(error.message, 'error');
        }
    }
});

// Signup form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth) {
        initFirebase();
        if (!auth) {
            showNotification('Firebase not initialized. Please refresh the page.', 'error');
            return;
        }
    }

    const submitBtn = signupForm.querySelector('.submit-btn');
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validation
    if (username.length < 3) {
        showNotification('Username must be at least 3 characters.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters.', 'error');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const { createUserWithEmailAndPassword, sendEmailVerification, ref, set } = window.firebaseApp;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user data to Realtime Database
        await set(ref(database, 'users/' + user.uid), {
            username: username,
            email: email,
            createdAt: new Date().toISOString(),
            emailVerified: false
        });

        // Send verification email
        await sendEmailVerification(user);
        
        showNotification('Account created! Please check your email (including spam folder) to verify your account before logging in.', 'success');
        
        signupForm.reset();
        
        // Switch to login tab
        tabs.forEach(t => t.classList.remove('active'));
        tabs[0].classList.add('active');
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        loginForm.style.animation = 'none';
        loginForm.offsetHeight;
        loginForm.style.animation = 'fadeInForm 0.4s ease-out';
        
        await auth.signOut();
        setButtonLoading(submitBtn, false);
    } catch (error) {
        console.error('Signup error:', error);
        setButtonLoading(submitBtn, false);
        
        if (error.code === 'auth/email-already-in-use') {
            showNotification('An account with this email already exists.', 'error');
        } else if (error.code === 'auth/weak-password') {
            showNotification('Password should be at least 6 characters.', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showNotification('Invalid email address.', 'error');
        } else {
            showNotification(error.message, 'error');
        }
    }
});

// Resend verification email functionality
const resendVerificationLink = document.getElementById('resend-verification-link');
if (resendVerificationLink) {
    resendVerificationLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!auth) {
            initFirebase();
            if (!auth) {
                showNotification('Firebase not initialized. Please refresh the page.', 'error');
                return;
            }
        }

        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        if (!email || !password) {
            showNotification('Please enter your email and password to resend verification email.', 'error');
            return;
        }

        try {
            const { signInWithEmailAndPassword, sendEmailVerification } = window.firebaseApp;
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                showNotification('Your email is already verified! You can now log in.', 'success');
                await auth.signOut();
                return;
            }

            await sendEmailVerification(user);
            showNotification('Verification email sent! Please check your inbox and spam folder.', 'success');
            await auth.signOut();
        } catch (error) {
            console.error('Resend verification error:', error);
            if (error.code === 'auth/user-not-found') {
                showNotification('No account found with this email. Please sign up.', 'error');
            } else if (error.code === 'auth/wrong-password') {
                showNotification('Incorrect password.', 'error');
            } else {
                showNotification(error.message, 'error');
            }
        }
    });
}

// Password reset functionality
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordResetModal = document.getElementById('password-reset-modal');
const closeModalBtn = document.getElementById('close-modal');
const passwordResetForm = document.getElementById('password-reset-form');

// Open modal
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        passwordResetModal.classList.add('show');
    });
}

// Close modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        passwordResetModal.classList.remove('show');
    });
}

// Close modal when clicking outside
if (passwordResetModal) {
    passwordResetModal.addEventListener('click', (e) => {
        if (e.target === passwordResetModal) {
            passwordResetModal.classList.remove('show');
        }
    });
}

// Handle password reset form submission
if (passwordResetForm) {
    passwordResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!auth) {
            initFirebase();
            if (!auth) {
                showNotification('Firebase not initialized. Please refresh the page.', 'error');
                return;
            }
        }

        const submitBtn = passwordResetForm.querySelector('.submit-btn');
        const email = document.getElementById('reset-email').value;

        setButtonLoading(submitBtn, true);

        try {
            const { sendPasswordResetEmail } = window.firebaseApp;
            await sendPasswordResetEmail(auth, email);
            
            showNotification('Password reset email sent! Please check your inbox and spam folder.', 'success');
            passwordResetModal.classList.remove('show');
            passwordResetForm.reset();
            setButtonLoading(submitBtn, false);
        } catch (error) {
            console.error('Password reset error:', error);
            setButtonLoading(submitBtn, false);
            
            if (error.code === 'auth/user-not-found') {
                showNotification('No account found with this email. Please sign up.', 'error');
            } else if (error.code === 'auth/invalid-email') {
                showNotification('Invalid email address.', 'error');
            } else {
                showNotification(error.message, 'error');
            }
        }
    });
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && passwordResetModal.classList.contains('show')) {
        passwordResetModal.classList.remove('show');
    }
});

// Initialize Firebase on page load
window.addEventListener('load', () => {
    setTimeout(initFirebase, 500);
});

// Add input focus animations
document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.classList.remove('focused');
    });
});
