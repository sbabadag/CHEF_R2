// AVM Grup Kitchen Order System - Enhanced with Debugging
// Version: Stable with Form Debugging
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

// Start real-time status checking
function startStatusCheck() {
    log('Starting automatic status check for CYD updates', 'info', true);
    
    if (currentOrderIds.length === 0) {
        log('No order IDs to track - cannot start status check', 'warn', true);
        return;
    }
    
    // Clear any existing interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    // Initial check
    updateOrderStatus();
    
    // Check status every 5 seconds
    statusCheckInterval = setInterval(() => {
        log('🔄 Automatic status check triggered', 'info', true);
        updateOrderStatus();
    }, 5000);
    
    log(`🚀 Automatic status checking started for orders: ${currentOrderIds.join(', ')}`, 'info', true);
}

// Update order status in real-time
async function updateOrderStatus() {
    if (currentOrderIds.length === 0) {
        return;
    }
    
    try {
        if (TEST_MODE) {
            // Test mode - simulate status progression
            simulateStatusProgression();
        } else {
            // Production mode - check actual status from database
            await checkOrderStatusFromDatabase();
        }
        
        updateStatusDisplay();
    } catch (error) {
        log(`Status check error: ${error.message}`, 'error', true);
    }
}

// Check order status from Supabase
async function checkOrderStatusFromDatabase() {
    if (!supabase) {
        log('Supabase not available for status check', 'warn');
        return;
    }
    
    log(`Checking CYD status for order IDs: ${JSON.stringify(currentOrderIds)}`, 'info', true);
    
    const { data, error } = await supabase
        .from('drink_orders')
        .select('id, status')
        .in('id', currentOrderIds);
    
    if (error) {
        log(`Status check error: ${error.message}`, 'error', true);
        throw new Error(`Status check failed: ${error.message}`);
    }
    
    log(`Raw CYD status data: ${JSON.stringify(data)}`, 'info', true);
    
    // Check for status changes and show automatic CYD alerts
    data.forEach(order => {
        const currentStatus = order.status;
        const previousStatus = previousOrderStatus[order.id];
        
        // Detect status change from CYD device
        if ((previousStatus && previousStatus !== currentStatus) || 
            (!previousStatus && currentStatus !== 'new' && currentStatus !== 'pending')) {
            
            log(`🚨 CYD STATUS CHANGE DETECTED for order ${order.id}: ${previousStatus || 'initial'} → ${currentStatus}`, 'info', true);
            
            // Show automatic CYD Alert for status change
            const statusMessages = {
                'alindi': 'Siparişiniz mutfakta alındı! 👨‍🍳',
                'hazirlandi': 'Siparişiniz hazırlandı! 🍹',
                'completed': 'Siparişiniz tamamlandı! ✅'
            };
            
            const message = statusMessages[currentStatus] || `Sipariş durumu: ${currentStatus}`;
            
            // AUTOMATIC CYD ALERT - This will show when CYD device updates status
            showCydAlert(message, currentStatus);
            log(`🎉 Automatic CYD Alert shown: ${message}`, 'info', true);
        }
        
        // Store current status for next comparison
        previousOrderStatus[order.id] = currentStatus;
    });
    
    // Update status data
    orderStatusData = {};
    data.forEach(order => {
        orderStatusData[order.id] = order.status;
    });
    
    log(`Status data updated: ${JSON.stringify(orderStatusData)}`, 'info', true);
}

// Simulate status progression for test mode
function simulateStatusProgression() {
    const now = Date.now();
    const elapsed = now - (window.orderCreatedTime || now);
    
    // Simulate progression: new -> alindi (after 10s) -> hazirlandi (after 30s)
    let simulatedStatus = 'new';
    if (elapsed > 30000) { // 30 seconds
        simulatedStatus = 'hazirlandi';
    } else if (elapsed > 10000) { // 10 seconds
        simulatedStatus = 'alindi';
    }
    
    // Check for status changes in test mode and show CYD alerts
    currentOrderIds.forEach(id => {
        const previousStatus = previousOrderStatus[id];
        
        if (previousStatus && previousStatus !== simulatedStatus && simulatedStatus !== 'new') {
            log(`🚨 TEST CYD STATUS CHANGE for order ${id}: ${previousStatus} → ${simulatedStatus}`, 'info', true);
            
            const statusMessages = {
                'alindi': 'TEST: Siparişiniz mutfakta alındı! 👨‍🍳',
                'hazirlandi': 'TEST: Siparişiniz hazırlandı! 🍹'
            };
            
            const message = statusMessages[simulatedStatus] || `TEST: Sipariş durumu: ${simulatedStatus}`;
            showCydAlert(message, simulatedStatus);
        }
        
        // Store current status for next comparison
        previousOrderStatus[id] = simulatedStatus;
    });
    
    // Update status data
    orderStatusData = {};
    currentOrderIds.forEach(id => {
        orderStatusData[id] = simulatedStatus;
    });
    
    log(`Test status simulated: ${simulatedStatus} (elapsed: ${Math.floor(elapsed/1000)}s)`, 'info', true);
}

// Update status display on the page
function updateStatusDisplay() {
    if (Object.keys(orderStatusData).length === 0) {
        return;
    }
    
    // Determine overall status (most advanced status among all orders)
    const statuses = Object.values(orderStatusData);
    let overallStatus = 'new';
    
    if (statuses.every(status => status === 'hazirlandi')) {
        overallStatus = 'hazirlandi';
    } else if (statuses.some(status => status === 'alindi' || status === 'hazirlandi')) {
        overallStatus = 'alindi';
    }
    
    // Stop checking if all orders are completed
    if (overallStatus === 'hazirlandi') {
        log('🏁 All orders completed, stopping automatic status check', 'info', true);
        stopStatusCheck();
        
        // Play notification sound or vibration if available
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }
}

// Stop status checking
function stopStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
        log('Automatic status checking stopped', 'info', true);
    }
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
            
            // If showing drink selection, retry setting up drink events
            if (cardId === 'drink-selection') {
                setTimeout(() => {
                    setupDrinkSelection();
                }, 100);
            }
        } else {
            log(`❌ Card not found: ${cardId}-card`, 'error', true);
            log(`Available cards: ${Array.from(document.querySelectorAll('.card')).map(c => c.id).join(', ')}`, 'error', true);
            
            // Fallback - show user info card
            const fallbackCard = document.getElementById('user-info-card');
            if (fallbackCard) {
                fallbackCard.style.display = 'block';
                fallbackCard.classList.add('active');
                log(`Fallback: Showing user-info-card`, 'warn', true);
            }
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
            log(`Available form elements: ${Array.from(document.querySelectorAll('#user-form input, #user-form select')).map(el => `${el.tagName}#${el.id}`).join(', ')}`, 'info', true);
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
        
        // Add temporary test for drink buttons
        setTimeout(() => {
            log('🧪 Testing drink button setup...', 'info', true);
            const drinkOptions = document.querySelectorAll('.drink-option');
            log(`Found ${drinkOptions.length} drink options for testing`, 'info', true);
            
            drinkOptions.forEach((option, index) => {
                log(`Testing option ${index + 1}: ${option.dataset.drink}`, 'info', true);
                
                // Add direct click test
                option.addEventListener('click', function testClick() {
                    log(`🎯 TEST CLICK DETECTED on ${option.dataset.drink}!`, 'info', true);
                    // Remove this test listener after first click
                    option.removeEventListener('click', testClick);
                });
            });
        }, 1000);
        
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
        
        newOption.addEventListener('click', () => {
            log(`🔥 Drink option clicked: ${newOption.dataset.drink}`, 'info', true);
            toggleDrinkSelection(newOption);
        });
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
        // Decrease quantity or deselect
        currentQuantity--;
        log(`Decreasing quantity to: ${currentQuantity}`, 'info', true);
        
        if (currentQuantity <= 0) {
            option.classList.remove('selected');
            quantityElement.textContent = '0';
            // Remove from selected drinks
            selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);
            log(`❌ Removed ${drinkName} from selection`, 'info', true);
        } else {
            quantityElement.textContent = currentQuantity;
            // Update quantity in selected drinks
            const drink = selectedDrinks.find(d => d.name === drinkName);
            if (drink) drink.quantity = currentQuantity;
            log(`📝 Updated ${drinkName} quantity to ${currentQuantity}`, 'info', true);
        }
    } else {
        // Select and set quantity to 1
        currentQuantity = 1;
        log(`Selecting ${drinkName}`, 'info', true);
        option.classList.add('selected');
        quantityElement.textContent = currentQuantity;
        selectedDrinks.push({ name: drinkName, quantity: currentQuantity });
        log(`✅ Added ${drinkName} to selection`, 'info', true);
    }
    
    log(`Total selected drinks: ${selectedDrinks.length}`, 'info', true);
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
        
        if (TEST_MODE) {
            // Test mode - simulate order creation
            currentOrderIds = [Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000)];
            window.orderCreatedTime = Date.now();
        } else {
            // Production mode - create orders in Supabase
            await createOrdersInSupabase();
        }
        
        // Show order confirmation
        updateOrderSummary();
        showCard('order-confirmation');
        
        // Start automatic status checking for CYD updates
        startStatusCheck();
        
        showToast('Sipariş başarıyla gönderildi!', 'success');
        
    } catch (error) {
        log(`Order creation error: ${error.message}`, 'error');
        showToast(`Sipariş oluşturulurken hata: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function createOrdersInSupabase() {
    if (!supabase) {
        throw new Error('Supabase not initialized');
    }
    
    const { customerName, department } = window.currentUser;
    const orders = selectedDrinks.map(drink => ({
        customer_name: customerName,
        department: department,
        drink_name: drink.name,
        quantity: drink.quantity,
        status: 'new',
        created_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
        .from('drink_orders')
        .insert(orders)
        .select('id');
    
    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }
    
    currentOrderIds = data.map(order => order.id);
    log(`Orders created with IDs: ${currentOrderIds.join(', ')}`, 'info', true);
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
            <p><em>CYD cihazından güncellemeler otomatik gelecektir</em></p>
        </div>
    `;
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
        
        // Setup event listeners with error handling
        setupEventListeners();
        
        // Setup drink selection with error handling
        setTimeout(() => {
            try {
                setupDrinkSelection();
            } catch (error) {
                log(`Error setting up drink selection: ${error.message}`, 'error');
            }
        }, 500);
        
        // Show initial card
        showCard('user-info');
        
        const mode = TEST_MODE ? 'Test Mode' : 'Production';
        log(`✅ App initialized successfully (${mode})`, 'log', true);
        showToast(`Sistem hazır (${mode}) - CYD otomatik güncellemeleri aktif`, 'success');
        
        // Add test function for debugging only (remove in production)
        if (TEST_MODE) {
            window.testCydAlert = function(status = 'alindi') {
                const messages = {
                    'alindi': 'TEST: Siparişiniz mutfakta alındı! 👨‍🍳',
                    'hazirlandi': 'TEST: Siparişiniz hazırlandı! 🍹'
                };
                showCydAlert(messages[status] || 'Test message', status);
            };
            
            window.resetApp = function() {
                selectedDrinks = [];
                currentOrderIds = [];
                previousOrderStatus = {};
                orderStatusData = {};
                stopStatusCheck();
                showCard('user-info');
                log('App reset for testing', 'info', true);
            };
        }
        
    } catch (error) {
        log(`❌ App initialization failed: ${error.message}`, 'error', true);
        showToast(`Sistem başlatılamadı: ${error.message}`, 'error');
        
        // Try to continue with basic functionality
        try {
            showCard('user-info');
        } catch (e) {
            log('Even basic card navigation failed', 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        // User info form
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', handleUserInfoSubmit);
            log('User form event listener added');
        } else {
            log('User form not found - page may still be loading');
        }
        
        // Retry setup after a delay if elements are missing
        setTimeout(() => {
            if (!document.getElementById('user-form')) {
                log('Retrying event listener setup...');
                setupEventListeners();
            }
        }, 1000);
        
    } catch (error) {
        log(`Error setting up event listeners: ${error.message}`, 'error');
    }
}

// Drink selection functionality  
function setupDrinkSelection() {
    try {
        const drinkOptions = document.querySelectorAll('.drink-option');
        if (drinkOptions.length > 0) {
            drinkOptions.forEach(option => {
                option.addEventListener('click', () => toggleDrinkSelection(option));
            });
            log(`Added event listeners to ${drinkOptions.length} drink options`);
        } else {
            log('No drink options found - will retry later');
        }
        
        // Order button
        const orderBtn = document.getElementById('place-order-btn');
        if (orderBtn) {
            orderBtn.addEventListener('click', handlePlaceOrder);
            log('Order button event listener added');
        } else {
            log('Order button not found - will retry later');
        }
    } catch (error) {
        log(`Error setting up drink selection: ${error.message}`, 'error');
    }
}

function toggleDrinkSelection(option) {
    try {
        const drinkName = option.dataset.drink;
        const quantityElement = option.querySelector('.quantity');
        let currentQuantity = parseInt(quantityElement.textContent) || 0;
        
        if (option.classList.contains('selected')) {
            // Decrease quantity or deselect
            currentQuantity--;
            if (currentQuantity <= 0) {
                option.classList.remove('selected');
                quantityElement.textContent = '0';
                // Remove from selected drinks
                selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);
            } else {
                quantityElement.textContent = currentQuantity;
                // Update quantity in selected drinks
                const drink = selectedDrinks.find(d => d.name === drinkName);
                if (drink) drink.quantity = currentQuantity;
            }
        } else {
            // Select and set quantity to 1
            currentQuantity = 1;
            option.classList.add('selected');
            quantityElement.textContent = currentQuantity;
            selectedDrinks.push({ name: drinkName, quantity: currentQuantity });
        }
        
        updateOrderButton();
    } catch (error) {
        log(`Error toggling drink selection: ${error.message}`, 'error');
    }
}

function updateOrderButton() {
    try {
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
    } catch (error) {
        log(`Error updating order button: ${error.message}`, 'error');
    }
}

async function handlePlaceOrder() {
    try {
        if (selectedDrinks.length === 0) {
            showToast('Lütfen en az bir içecek seçin', 'error');
            return;
        }
        
        if (!window.currentUser) {
            showToast('Kullanıcı bilgileri bulunamadı', 'error');
            return;
        }
        
        showLoading(true);
        
        if (TEST_MODE) {
            // Test mode - simulate order creation
            currentOrderIds = [Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000)];
            window.orderCreatedTime = Date.now();
        } else {
            // Production mode - create orders in Supabase
            await createOrdersInSupabase();
        }
        
        // Show order confirmation
        updateOrderSummary();
        showCard('order-confirmation');
        
        // Start automatic status checking for CYD updates
        startStatusCheck();
        
        showToast('Sipariş başarıyla gönderildi!', 'success');
        
    } catch (error) {
        log(`Order creation error: ${error.message}`, 'error');
        showToast(`Sipariş oluşturulurken hata: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Add global test function
window.addEventListener('load', () => {
    log('🎉 CYD Automatic Alert System Ready!', 'info', true);
    log('✅ System will automatically show popups when CYD device updates order status', 'info', true);
    if (TEST_MODE) {
        log('🧪 Test mode: Alerts will appear after 10s (alındı) and 30s (hazırlandı)', 'info', true);
    }
    
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