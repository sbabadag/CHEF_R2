// AVM Grup Kitchen Order System - Enhanced Multiple Drink Support
// Supabase Configuration
const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

// Configuration
const TEST_MODE = false; // Set to true for offline testing
const DEBUG_MODE = true; // Set to true for detailed logging

// Global variables
let supabase = null;
let supabaseInitialized = false;
let selectedDrinks = []; // Array for multiple drink orders
let currentOrderIds = []; // Array for order tracking
let statusCheckInterval = null;
let previousOrderStatus = {}; // Track previous status for change detection

// Safe logging function
const log = (message, type = 'log', force = false) => {
    if (DEBUG_MODE || force) {
        try {
            console[type](`[AVM Kitchen] ${message}`);
        } catch (e) {
            // Fallback for environments where console is restricted
        }
    }
};

// Simple CYD Alert Popup
function showCydAlert(message, status = 'info') {
    log(`🚨 CYD Alert: ${message}`, 'info', true);
    
    // Remove existing alerts
    const existing = document.querySelectorAll('.cyd-alert');
    existing.forEach(el => el.remove());
    
    // Create alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'cyd-alert';
    alertDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">
                ${status === 'alindi' ? '👨‍🍳' : status === 'hazirlandi' ? '🍹' : '✅'}
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px;">
                CYD Güncellemesi
            </div>
            <div style="font-size: 18px; color: #333;">
                ${message}
            </div>
        </div>
    `;
    
    // Style the alert
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 4px solid #667eea;
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 99999;
        min-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation CSS if not exists
    if (!document.querySelector('#cyd-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'cyd-alert-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(alertDiv);
    
    // Click to dismiss
    alertDiv.addEventListener('click', () => alertDiv.remove());
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
    
    // Try to vibrate
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
    
    log('✅ CYD Alert displayed');
}

// Initialize Supabase client
async function initializeSupabase() {
    if (supabaseInitialized && supabase) return supabase;
    
    try {
        // Wait for Supabase library to load
        let retries = 0;
        while (typeof window.supabase === 'undefined' && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library failed to load after 5 seconds');
        }
        
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseInitialized = true;
        log('✅ Supabase client initialized successfully', 'log', true);
        
        return supabase;
    } catch (error) {
        log(`❌ Supabase initialization failed: ${error.message}`, 'error', true);
        return null;
    }
}

// Show toast notifications
function showToast(message, type = 'info', duration = 4000) {
    log(`Toast: ${message} (${type})`, 'info');
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

// Show/hide loading overlay
function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Card navigation
function showCard(cardId) {
    log(`Showing card: ${cardId}`);
    
    // Hide all cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('active');
        card.style.display = 'none';
    });
    
    // Show the selected card
    const targetCard = document.getElementById(cardId + '-card');
    if (targetCard) {
        targetCard.style.display = 'block';
        targetCard.classList.add('active');
    } else {
        log(`❌ Card not found: ${cardId}`, 'error');
    }
}

// User info submission
function handleUserInfoSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('customer-name').value.trim();
    const department = document.getElementById('customer-department').value.trim();
    
    if (!name || !department) {
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }
    
    // Store user info
    window.currentUser = { customerName: name, department: department };
    
    log(`User info saved: ${name} - ${department}`);
    showToast('Bilgiler kaydedildi', 'success');
    
    // Move to drink selection
    showCard('drink-selection');
}

// Initialize app
async function initializeApp() {
    log('🚀 Initializing AVM Kitchen Order System...', 'info', true);
    
    try {
        showLoading(true);
        
        if (!TEST_MODE) {
            // Initialize Supabase
            await initializeSupabase();
        } else {
            log('🧪 Running in TEST MODE', 'info', true);
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Show initial card
        showCard('user-info');
        
        const mode = TEST_MODE ? 'Test Mode' : 'Production';
        log(`✅ App initialized successfully (${mode})`, 'log', true);
        showToast(`Sistem hazır (${mode})`, 'success');
        
        // Add test function
        window.testCydAlert = function(status = 'alindi') {
            const messages = {
                'alindi': 'Siparişiniz mutfakta alındı! 👨‍🍳',
                'hazirlandi': 'Siparişiniz hazırlandı! 🍹'
            };
            showCydAlert(messages[status] || 'Test message', status);
        };
        
    } catch (error) {
        log(`❌ App initialization failed: ${error.message}`, 'error', true);
        showToast(`Sistem başlatılamadı: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // User info form
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserInfoSubmit);
    }
    
    log('Event listeners set up');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Add global test function
window.addEventListener('load', () => {
    log('Page loaded - CYD Alert system ready. Try testCydAlert() in console.', 'info', true);
});