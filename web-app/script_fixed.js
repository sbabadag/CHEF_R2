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
    console.log(`🚨 CYD Alert: ${message}`);
    
    // Remove existing alerts
    const existing = document.querySelectorAll('.cyd-alert');
    existing.forEach(el => el.remove());
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = 'cyd-alert';
    alert.innerHTML = `
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
    alert.style.cssText = `
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
    document.body.appendChild(alert);
    
    // Click to dismiss
    alert.addEventListener('click', () => alert.remove());
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
    
    // Try to vibrate
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
    
    console.log('CYD Alert displayed');
}

// Test function
window.testCydAlert = function(status = 'alindi') {
    const messages = {
        'alindi': 'Siparişiniz mutfakta alındı! 👨‍🍳',
        'hazirlandi': 'Siparişiniz hazırlandı! 🍹'
    };
    showCydAlert(messages[status] || 'Test message', status);
};

// Show test alert on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Script loaded - try testCydAlert() in console');
});