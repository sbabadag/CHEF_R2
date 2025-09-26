// AVM Grup Kitchen Order System - Clean Version with Quantity Controls
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
let orderStatusData = {}; // Current order status data

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
    log(`🔄 Attempting to show card: ${cardId}`, 'info', true);
    
    try {
        // Hide all cards
        const cards = document.querySelectorAll('.card');
        log(`Found ${cards.length} cards to hide`);
        cards.forEach(card => {
            card.classList.remove('active');
            card.style.display = 'none';
        });
        
        // Show the selected card
        const targetCard = document.getElementById(cardId + '-card');
        if (targetCard) {
            targetCard.style.display = 'block';
            targetCard.classList.add('active');
            log(`✅ Successfully showed card: ${cardId}`, 'info', true);
            
            // If showing drink selection, setup drink events
            if (cardId === 'drink-selection') {
                setTimeout(() => {
                    setupDrinkSelection();
                }, 100);
            }
        } else {
            log(`❌ Card not found: ${cardId}-card`, 'error', true);
        }
    } catch (error) {
        log(`Error in showCard: ${error.message}`, 'error', true);
    }
}

// User info submission
function handleUserInfoSubmit(e) {
    e.preventDefault();
    log('🔄 Form submission started', 'info', true);
    
    try {
        const nameInput = document.getElementById('name');
        const departmentInput = document.getElementById('department');
        
        if (!nameInput || !departmentInput) {
            log('❌ Form inputs not found', 'error', true);
            showToast('Form hatası - sayfa yenilenecek', 'error');
            setTimeout(() => location.reload(), 2000);
            return;
        }
        
        const name = nameInput.value.trim();
        const department = departmentInput.value.trim();
        
        log(`📝 Form data - Name: "${name}", Department: "${department}"`, 'info', true);
        
        if (!name || !department) {
            log('❌ Empty fields detected', 'warn', true);
            showToast('Lütfen tüm alanları doldurun', 'error');
            return;
        }
        
        // Store user info
        window.currentUser = { customerName: name, department: department };
        
        log(`✅ User info saved: ${name} - ${department}`, 'info', true);
        showToast('Bilgiler kaydedildi', 'success');
        
        // Move to drink selection
        log('🚀 Navigating to drink-selection card', 'info', true);
        showCard('drink-selection');
        
    } catch (error) {
        log(`❌ Error in handleUserInfoSubmit: ${error.message}`, 'error', true);
        showToast('Form işleminde hata oluştu', 'error');
    }
}

// Drink selection functionality
function setupDrinkSelection() {
    log('🍹 Setting up drink selection...', 'info', true);
    
    const drinkOptions = document.querySelectorAll('.drink-option');
    log(`Found ${drinkOptions.length} drink options`, 'info', true);
    
    if (drinkOptions.length === 0) {
        log('❌ No drink options found! Retrying in 500ms...', 'warn', true);
        setTimeout(setupDrinkSelection, 500);
        return;
    }
    
    drinkOptions.forEach((option, index) => {
        log(`Setting up drink option ${index + 1}: ${option.dataset.drink}`, 'info', true);
        
        // Remove any existing listeners to avoid duplicates
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
        
        newOption.addEventListener('click', (e) => {
            // If clicking on quantity buttons, let them handle it
            if (e.target.classList.contains('quantity-btn')) {
                return;
            }
            
            log(`🔥 Drink option clicked: ${newOption.dataset.drink}`, 'info', true);
            toggleDrinkSelection(newOption);
        });
        
        // Setup quantity control buttons for this option
        const plusBtn = newOption.querySelector('.quantity-btn.plus');
        const minusBtn = newOption.querySelector('.quantity-btn.minus');
        
        if (plusBtn) {
            plusBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the main drink selection
                log(`Plus button clicked for ${newOption.dataset.drink}`, 'info', true);
                adjustQuantity(newOption, 1);
            });
        }
        
        if (minusBtn) {
            minusBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the main drink selection
                log(`Minus button clicked for ${newOption.dataset.drink}`, 'info', true);
                adjustQuantity(newOption, -1);
            });
        }
    });
    
    // Order button
    const orderBtn = document.getElementById('place-order-btn');
    if (orderBtn) {
        log('✅ Order button found and configured', 'info', true);
        orderBtn.addEventListener('click', handlePlaceOrder);
    } else {
        log('❌ Order button not found', 'warn', true);
    }
    
    log('✅ Drink selection setup complete', 'info', true);
}

function toggleDrinkSelection(option) {
    log(`🔥 toggleDrinkSelection called for: ${option.dataset.drink}`, 'info', true);
    
    const drinkName = option.dataset.drink;
    const quantityElement = option.querySelector('.quantity');
    
    if (!quantityElement) {
        log('❌ Quantity element not found!', 'error', true);
        return;
    }
    
    let currentQuantity = parseInt(quantityElement.textContent) || 0;
    log(`Current quantity for ${drinkName}: ${currentQuantity}`, 'info', true);
    
    if (option.classList.contains('selected')) {
        // If already selected, do nothing on main click - let +/- buttons handle it
        log(`${drinkName} is already selected. Use +/- buttons to adjust quantity.`, 'info', true);
        return;
    } else {
        // Select and set quantity to 1
        currentQuantity = 1;
        log(`Selecting ${drinkName}`, 'info', true);
        option.classList.add('selected');
        quantityElement.textContent = currentQuantity;
        
        // Show quantity controls
        const quantityControls = option.querySelector('.quantity-controls');
        if (quantityControls) {
            quantityControls.style.display = 'flex';
            log(`Shown quantity controls for ${drinkName}`, 'info', true);
        } else {
            log(`❌ Quantity controls not found for ${drinkName}`, 'error', true);
        }
        
        selectedDrinks.push({ name: drinkName, quantity: currentQuantity });
        log(`✅ Added ${drinkName} to selection`, 'info', true);
    }
    
    log(`Total selected drinks: ${selectedDrinks.length}`, 'info', true);
    updateOrderButton();
}

// Adjust quantity using + and - buttons
function adjustQuantity(option, change) {
    const drinkName = option.dataset.drink;
    const quantityElement = option.querySelector('.quantity');
    let currentQuantity = parseInt(quantityElement.textContent) || 0;
    
    log(`Adjusting quantity for ${drinkName}: ${currentQuantity} ${change > 0 ? '+' : ''}${change}`, 'info', true);
    
    const newQuantity = currentQuantity + change;
    
    if (newQuantity <= 0) {
        // Remove selection completely
        option.classList.remove('selected');
        quantityElement.textContent = '0';
        
        // Hide quantity controls
        const quantityControls = option.querySelector('.quantity-controls');
        if (quantityControls) {
            quantityControls.style.display = 'none';
        }
        
        // Remove from selected drinks
        selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);
        log(`❌ Removed ${drinkName} from selection (quantity = 0)`, 'info', true);
        
    } else if (newQuantity === 1 && currentQuantity === 0) {
        // First selection
        option.classList.add('selected');
        quantityElement.textContent = '1';
        
        // Show quantity controls
        const quantityControls = option.querySelector('.quantity-controls');
        if (quantityControls) {
            quantityControls.style.display = 'flex';
        }
        
        selectedDrinks.push({ name: drinkName, quantity: 1 });
        log(`✅ Added ${drinkName} to selection`, 'info', true);
        
    } else if (newQuantity > 0) {
        // Update existing selection
        quantityElement.textContent = newQuantity;
        
        // Update in selected drinks array
        const drink = selectedDrinks.find(d => d.name === drinkName);
        if (drink) {
            drink.quantity = newQuantity;
        }
        log(`📝 Updated ${drinkName} quantity to ${newQuantity}`, 'info', true);
    }
    
    updateOrderButton();
}

function updateOrderButton() {
    const orderBtn = document.getElementById('place-order-btn');
    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);
    
    if (orderBtn) {
        if (totalItems > 0) {
            orderBtn.disabled = false;
            orderBtn.textContent = `Sipariş Ver (${totalItems} adet)`;
        } else {
            orderBtn.disabled = true;
            orderBtn.textContent = 'İçecek Seçin';
        }
    }
}

async function handlePlaceOrder() {
    if (selectedDrinks.length === 0) {
        showToast('Lütfen en az bir içecek seçin', 'error');
        return;
    }
    
    if (!window.currentUser) {
        showToast('Kullanıcı bilgileri bulunamadı', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // For now, just show success and go to confirmation
        showCard('order-confirmation');
        updateOrderSummary();
        
        showToast('Sipariş başarıyla gönderildi!', 'success');
        
    } catch (error) {
        log(`Order creation error: ${error.message}`, 'error');
        showToast(`Sipariş oluşturulurken hata: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function updateOrderSummary() {
    const orderSummary = document.getElementById('order-summary');
    if (!orderSummary) return;
    
    const { customerName, department } = window.currentUser || {};
    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);
    
    orderSummary.innerHTML = `
        <div class="order-header">
            <h3>Sipariş Özeti</h3>
            <div class="customer-info">
                <strong>${customerName}</strong> - ${department}
            </div>
        </div>
        <div class="order-items">
            ${selectedDrinks.map(drink => `
                <div class="order-item">
                    <span class="item-name">${drink.name}</span>
                    <span class="item-quantity">x${drink.quantity}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-footer">
            <p><strong>Toplam: ${totalItems} adet içecek</strong></p>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    try {
        // User info form
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', handleUserInfoSubmit);
            log('✅ User form event listener added', 'info', true);
        } else {
            log('❌ User form not found', 'warn', true);
        }
        
    } catch (error) {
        log(`Error setting up event listeners: ${error.message}`, 'error');
    }
}

// Initialize app
async function initializeApp() {
    log('🚀 Initializing AVM Kitchen Order System...', 'info', true);
    
    try {
        showLoading(true);
        
        // Setup event listeners
        setupEventListeners();
        
        // Show initial card
        showCard('user-info');
        
        log(`✅ App initialized successfully`, 'log', true);
        showToast(`Sistem hazır - İçecek sipariş sistemi aktif`, 'success');
        
    } catch (error) {
        log(`❌ App initialization failed: ${error.message}`, 'error', true);
        showToast(`Sistem başlatılamadı: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Add global test functions for debugging
window.addEventListener('load', () => {
    log('🎉 Kitchen Order System Ready!', 'info', true);
    
    // Add global test functions for debugging
    window.testDrinkButtons = function() {
        log('🧪 Manual drink button test started...', 'info', true);
        const drinkOptions = document.querySelectorAll('.drink-option');
        log(`Found ${drinkOptions.length} drink options`, 'info', true);
        
        if (drinkOptions.length > 0) {
            const firstDrink = drinkOptions[0];
            log(`Testing first drink: ${firstDrink.dataset.drink}`, 'info', true);
            firstDrink.click();
        } else {
            log('❌ No drink options found for testing', 'error', true);
        }
    };
    
    window.manualSetupDrinks = function() {
        log('🔧 Manual setup of drink selection...', 'info', true);
        setupDrinkSelection();
    };
    
    log('✅ Global test functions added: testDrinkButtons(), manualSetupDrinks()', 'info', true);
});