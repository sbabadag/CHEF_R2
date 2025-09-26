// PRODUCTION ONLY - NO TEST MODE - COMPLETELY NEW FILE
// Supabase Configuration
const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

// PRODUCTION MODE ONLY
const TEST_MODE = false;

// Initialize Supabase client
let supabase = null;
let supabaseInitialized = false;

// Global variables
let selectedDrinks = [];
let currentOrderIds = [];
let statusCheckInterval = null;

// DOM Elements
let userInfoCard, drinkSelectionCard, orderConfirmationCard, successCard, loadingOverlay;

// Safe console logging
const safeLog = (message, type = 'log') => {
    try {
        console[type](`[PRODUCTION] ${message}`);
    } catch (e) {
        // Fallback if console is not available
    }
};

// Initialize Supabase
function initializeSupabase() {
    try {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseInitialized = true;
            safeLog('✅ PRODUCTION Supabase initialized');
            return supabase;
        }
    } catch (error) {
        safeLog('❌ Supabase error: ' + error.message, 'error');
    }
    return null;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    safeLog('🔥 PRODUCTION APP LOADING - NO TEST MODE');
    
    // Initialize DOM elements
    userInfoCard = document.getElementById('user-info-card');
    drinkSelectionCard = document.getElementById('drink-selection-card');
    orderConfirmationCard = document.getElementById('order-confirmation-card');
    successCard = document.getElementById('success-card');
    loadingOverlay = document.getElementById('loading-overlay');
    
    // Wait for Supabase then initialize
    setTimeout(() => {
        if (typeof window.supabase !== 'undefined') {
            supabase = initializeSupabase();
        }
        setupEventListeners();
        setupQuantityControls();
    }, 2000);
});

// PRODUCTION ONLY - CONFIRM ORDER
async function confirmOrder() {
    safeLog('🔥 PRODUCTION ORDER - NO SIMULATION');
    
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    
    if (!userData.name || !userData.department || !selectedDrinks || selectedDrinks.length === 0) {
        showToast('Lütfen tüm bilgileri doldurun!', 'error');
        return;
    }
    
    showLoading('PRODUCTION: Creating real orders...');
    
    // Force Supabase if not ready
    if (!supabase && typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    
    if (!supabase) {
        hideLoading();
        showToast('❌ PRODUCTION ERROR: No database connection', 'error');
        return;
    }
    
    try {
        currentOrderIds = [];
        
        // Create each order individually  
        for (const drink of selectedDrinks) {
            for (let i = 0; i < drink.quantity; i++) {
                const { data, error } = await supabase
                    .from('drink_orders')
                    .insert({
                        customer_name: userData.name,
                        department: userData.department,
                        drink_type: drink.name,
                        status: 'new',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                
                if (data) {
                    currentOrderIds.push(data.id);
                    safeLog(`✅ PRODUCTION Order ID: ${data.id}`);
                }
            }
        }
        
        hideLoading();
        showCard('success');
        
        // Update success message
        const successTitle = document.querySelector('.success-card h2');
        const successText = document.querySelector('.success-card p');
        if (successTitle) successTitle.textContent = '🔥 PRODUCTION: Orders Created!';
        if (successText) {
            successText.textContent = `PRODUCTION: ${currentOrderIds.length} real database entries created. IDs: ${currentOrderIds.join(', ')}`;
        }
        
        showToast(`🔥 PRODUCTION: ${currentOrderIds.length} orders in database!`, 'success');
        
    } catch (error) {
        hideLoading();
        safeLog('❌ PRODUCTION ERROR: ' + error.message);
        showToast('PRODUCTION ERROR: ' + error.message, 'error');
    }
}

// Rest of the functions (basic versions)
function setupEventListeners() {
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserInfoSubmit);
    }
    
    const drinkOptions = document.querySelectorAll('.drink-option');
    drinkOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                return;
            }
            toggleDrinkSelection(option);
        });
    });
    
    const confirmBtn = document.getElementById('confirm-order');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmOrder);
    }
}

function setupQuantityControls() {
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    
    quantityButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const drinkOption = btn.closest('.drink-option');
            const drinkName = drinkOption.dataset.drink;
            const isPlus = btn.classList.contains('plus');
            
            safeLog(`🔥 Quantity button clicked: ${isPlus ? 'plus' : 'minus'}`);
            
            let currentQuantity = parseInt(drinkOption.querySelector('.quantity-display').textContent) || 0;
            
            if (isPlus) {
                currentQuantity++;
            } else {
                if (currentQuantity > 0) currentQuantity--;
            }
            
            drinkOption.querySelector('.quantity-display').textContent = currentQuantity;
            safeLog(`Current quantity for ${drinkName}: ${currentQuantity}`);
            
            updateSelectedDrink(drinkName, currentQuantity);
        });
    });
    
    safeLog('✅ Quantity controls setup complete');
}

function updateSelectedDrink(drinkName, quantity) {
    const existingIndex = selectedDrinks.findIndex(drink => drink.name === drinkName);
    
    if (quantity === 0) {
        if (existingIndex !== -1) {
            selectedDrinks.splice(existingIndex, 1);
        }
    } else {
        if (existingIndex !== -1) {
            selectedDrinks[existingIndex].quantity = quantity;
        } else {
            selectedDrinks.push({ name: drinkName, quantity: quantity });
        }
    }
    
    safeLog(`Updated quantity for ${drinkName} to: ${quantity}`);
    safeLog(`Selected drinks count: ${selectedDrinks.length}`);
    
    updateDrinkSummary();
}

function toggleDrinkSelection(option) {
    const drinkName = option.dataset.drink;
    safeLog(`🔥 toggleDrinkSelection called for: ${drinkName}`);
    safeLog(`Selecting ${drinkName}`);
    
    const currentQuantity = parseInt(option.querySelector('.quantity-display').textContent) || 0;
    const newQuantity = currentQuantity === 0 ? 1 : currentQuantity;
    
    option.querySelector('.quantity-display').textContent = newQuantity;
    updateSelectedDrink(drinkName, newQuantity);
}

function updateDrinkSummary() {
    // Basic implementation
    safeLog('Updating drink summary...');
}

function handleUserInfoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        department: formData.get('department')
    };
    
    sessionStorage.setItem('userData', JSON.stringify(userData));
    showCard('drink-selection');
    
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.innerHTML = `<i class="fas fa-user"></i><span>${userData.name} - ${userData.department}</span>`;
    }
}

function showCard(cardId) {
    [userInfoCard, drinkSelectionCard, orderConfirmationCard, successCard].forEach(card => {
        if (card) card.style.display = 'none';
    });
    
    const targetCard = document.getElementById(cardId + '-card') || document.getElementById(cardId);
    if (targetCard) {
        targetCard.style.display = 'block';
    }
}

function showLoading(message) {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = message;
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    safeLog(`TOAST: ${message}`);
    // Basic toast implementation
    alert(message);
}