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
        
        // Test connection
        const { data, error } = await supabase.from('drink_orders').select('count', { count: 'exact', head: true });
        if (error) {
            throw new Error(`Supabase connection test failed: ${error.message}`);
        }
        
        log('✅ Supabase connection test successful', 'log', true);
        return supabase;
        
    } catch (error) {
        log(`❌ Supabase initialization failed: ${error.message}`, 'error', true);
        supabase = null;
        supabaseInitialized = false;
        throw error;
    }
}

// Show toast notification
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
    
    // Hide all cards by setting display to none
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('active');
        card.style.display = 'none';
    });
    
    // Show specific card by setting display to block
    const targetCard = document.getElementById(cardId);
    if (targetCard) {
        targetCard.classList.add('active');
        targetCard.style.display = 'block';
        log(`Successfully showed card: ${cardId}`);
    } else {
        log(`Card not found: ${cardId}`, 'error');
    }
}

// Initialize drink selection grid
function initializeDrinkSelection() {
    log('Initializing drink selection');
    
    const drinkGrid = document.getElementById('drink-grid');
    if (!drinkGrid) return;
    
    const drinks = [
        { name: 'Çay', icon: '🫖', popular: true },
        { name: 'Kahve', icon: '☕', popular: true },
        { name: 'Su', icon: '💧', popular: true },
        { name: 'Ayran', icon: '🥛', popular: false },
        { name: 'Kola', icon: '🥤', popular: false },
        { name: 'Meyve Suyu', icon: '🧃', popular: false },
        { name: 'Limonata', icon: '🍋', popular: false },
        { name: 'Soğuk Çay', icon: '🧊', popular: false }
    ];
    
    drinkGrid.innerHTML = drinks.map(drink => `
        <div class="drink-option ${drink.popular ? 'popular' : ''}" data-drink="${drink.name}">
            <div class="drink-icon">${drink.icon}</div>
            <div class="drink-name">${drink.name}</div>
            <div class="drink-quantity">
                <button type="button" class="quantity-btn minus-btn" onclick="updateDrinkQuantity('${drink.name}', -1)">-</button>
                <span class="quantity-display" id="quantity-${drink.name.replace(/\s+/g, '')}">0</span>
                <button type="button" class="quantity-btn plus-btn" onclick="updateDrinkQuantity('${drink.name}', 1)">+</button>
            </div>
        </div>
    `).join('');
}

// Update drink quantity
function updateDrinkQuantity(drinkName, change) {
    const quantityId = `quantity-${drinkName.replace(/\s+/g, '')}`;
    const quantityDisplay = document.getElementById(quantityId);
    
    if (!quantityDisplay) return;
    
    let currentQuantity = parseInt(quantityDisplay.textContent) || 0;
    let newQuantity = Math.max(0, currentQuantity + change);
    
    quantityDisplay.textContent = newQuantity;
    
    // Update selected drinks array
    const existingIndex = selectedDrinks.findIndex(drink => drink.name === drinkName);
    
    if (newQuantity > 0) {
        if (existingIndex >= 0) {
            selectedDrinks[existingIndex].quantity = newQuantity;
        } else {
            selectedDrinks.push({ name: drinkName, quantity: newQuantity });
        }
        
        // Add visual feedback
        const drinkOption = document.querySelector(`[data-drink="${drinkName}"]`);
        if (drinkOption) {
            drinkOption.classList.add('selected');
        }
    } else {
        if (existingIndex >= 0) {
            selectedDrinks.splice(existingIndex, 1);
        }
        
        // Remove visual feedback
        const drinkOption = document.querySelector(`[data-drink="${drinkName}"]`);
        if (drinkOption) {
            drinkOption.classList.remove('selected');
        }
    }
    
    updateSelectedDrinksSummary();
    log(`Updated ${drinkName}: ${newQuantity}`);
}

// Update selected drinks summary
function updateSelectedDrinksSummary() {
    const summaryDiv = document.getElementById('selected-drinks-summary');
    if (!summaryDiv) return;
    
    if (selectedDrinks.length === 0) {
        summaryDiv.innerHTML = '<p>Henüz içecek seçilmedi</p>';
        const continueBtn = document.getElementById('continue-to-confirmation');
        if (continueBtn) continueBtn.disabled = true;
        return;
    }
    
    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);
    
    summaryDiv.innerHTML = `
        <div class="summary-header">
            <h3>Seçilen İçecekler (${totalItems} adet)</h3>
        </div>
        <div class="summary-list">
            ${selectedDrinks.map(drink => `
                <div class="summary-item">
                    <span class="drink-name">${drink.name}</span>
                    <span class="drink-quantity">x${drink.quantity}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    const continueBtn = document.getElementById('continue-to-confirmation');
    if (continueBtn) continueBtn.disabled = false;
}

// Handle user info form submission
async function handleUserInfoSubmit(event) {
    event.preventDefault();
    log('Form submission started', 'info', true);
    
    const formData = new FormData(event.target);
    const customerName = formData.get('name')?.trim();
    const department = formData.get('department')?.trim();
    
    log(`Form data: name="${customerName}", department="${department}"`, 'info', true);
    
    if (!customerName || !department) {
        log('Form validation failed - empty fields', 'error', true);
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }
    
    // Store user info globally
    window.currentUser = { customerName, department };
    
    log(`User info submitted: ${customerName} - ${department}`, 'info', true);
    showToast('Bilgiler kaydedildi', 'success');
    
    // Move to drink selection
    log('Navigating to drink selection card', 'info', true);
    showCard('drink-selection-card');
}

// Handle order confirmation
async function confirmOrder() {
    if (selectedDrinks.length === 0) {
        showToast('Lütfen en az bir içecek seçin', 'error');
        return;
    }
    
    if (!window.currentUser) {
        showToast('Kullanıcı bilgileri bulunamadı', 'error');
        showCard('user-info-card');
        return;
    }
    
    showLoading(true);
    
    try {
        if (TEST_MODE) {
            // Test mode - simulate order creation
            await simulateOrderCreation();
        } else {
            // Production mode - create orders in Supabase
            await createOrdersInSupabase();
        }
        
        // Show success card
        showCard('success-card');
        updateSuccessCardInfo();
        
        // Start status checking
        startStatusCheck();
        
    } catch (error) {
        log(`Order confirmation error: ${error.message}`, 'error');
        showToast(`Sipariş oluşturulurken hata: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Create orders in Supabase
async function createOrdersInSupabase() {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }
    
    const { customerName, department } = window.currentUser;
    const orderGroupId = crypto.randomUUID();
    
    // Create orders array
    const orders = selectedDrinks.map(drink => ({
        customer_name: customerName,
        department: department,
        drink_type: drink.name,
        quantity: drink.quantity,
        status: 'new',
        special_instructions: null,
        order_group_id: orderGroupId,
        priority: 0
    }));
    
    log(`Creating ${orders.length} orders for ${customerName}`);
    
    // Insert orders into database
    const { data, error } = await supabase
        .from('drink_orders')
        .insert(orders)
        .select('id');
    
    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
        throw new Error('No orders were created');
    }
    
    // Store order IDs for status tracking
    currentOrderIds = data.map(order => order.id);
    log(`Orders created successfully: ${currentOrderIds.join(', ')}`);
    
    showToast('Siparişleriniz başarıyla oluşturuldu!', 'success');
}

// Simulate order creation for test mode
async function simulateOrderCreation() {
    log('Simulating order creation (TEST MODE)');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate fake order IDs
    currentOrderIds = selectedDrinks.map(() => Math.floor(Math.random() * 1000) + 1);
    
    log(`Simulated orders: ${currentOrderIds.join(', ')}`);
    showToast('Test siparişi oluşturuldu!', 'success');
}

// Update success card with order info
function updateSuccessCardInfo() {
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
            <p class="order-status">Durum: <span id="status-text">Sipariş Alındı</span></p>
        </div>
    `;
}

// Start checking order status
function startStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    if (TEST_MODE) {
        // Test mode - simulate status changes
        simulateStatusUpdates();
    } else if (supabase && currentOrderIds.length > 0) {
        // Real-time status checking
        statusCheckInterval = setInterval(checkOrderStatus, 5000); // Check every 5 seconds
    }
}

// Check order status in Supabase
async function checkOrderStatus() {
    try {
        if (!supabase || currentOrderIds.length === 0) return;
        
        const { data, error } = await supabase
            .from('drink_orders')
            .select('id, status, drink_type')
            .in('id', currentOrderIds);
        
        if (error) {
            log(`Status check error: ${error.message}`, 'error');
            return;
        }
        
        // Update status display
        updateStatusDisplay(data);
        
        // Check if all orders are completed
        const allCompleted = data.every(order => order.status === 'hazirlandi');
        if (allCompleted) {
            clearInterval(statusCheckInterval);
            showToast('Tüm içecekleriniz hazır! 🎉', 'success');
        }
        
    } catch (error) {
        log(`Status check error: ${error.message}`, 'error');
    }
}

// Update status display
function updateStatusDisplay(orders) {
    const statusText = document.getElementById('status-text');
    if (!statusText) return;
    
    if (!orders || orders.length === 0) {
        statusText.textContent = 'Durum kontrol edilemiyor';
        return;
    }
    
    const statusCounts = orders.reduce((counts, order) => {
        counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
    }, {});
    
    const statusMessages = {
        'new': 'Sipariş Alındı',
        'alindi': 'Hazırlanıyor',
        'hazirlandi': 'Hazır - Teslim Alabilirsiniz!'
    };
    
    // Determine overall status
    if (statusCounts['hazirlandi'] === orders.length) {
        statusText.textContent = '🎉 Hazır - Teslim Alabilirsiniz!';
        statusText.className = 'status-ready';
    } else if (statusCounts['alindi'] > 0) {
        statusText.textContent = '👨‍🍳 Hazırlanıyor...';
        statusText.className = 'status-preparing';
    } else {
        statusText.textContent = '📝 Sipariş Alındı';
        statusText.className = 'status-new';
    }
}

// Simulate status updates for test mode
function simulateStatusUpdates() {
    let step = 0;
    const steps = ['new', 'alindi', 'hazirlandi'];
    
    const interval = setInterval(() => {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            const status = steps[step];
            const messages = {
                'new': '📝 Sipariş Alındı',
                'alindi': '👨‍🍳 Hazırlanıyor...',
                'hazirlandi': '🎉 Hazır - Teslim Alabilirsiniz!'
            };
            statusText.textContent = messages[status];
            statusText.className = `status-${status}`;
        }
        
        step++;
        if (step >= steps.length) {
            clearInterval(interval);
            showToast('Test siparişi tamamlandı!', 'success');
        }
    }, 3000); // Change status every 3 seconds
}

// Reset application
function resetApp() {
    selectedDrinks = [];
    currentOrderIds = [];
    window.currentUser = null;
    
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
    
    // Reset drink quantities
    const quantityDisplays = document.querySelectorAll('.quantity-display');
    quantityDisplays.forEach(display => display.textContent = '0');
    
    // Remove selected classes
    const selectedDrinks = document.querySelectorAll('.drink-option.selected');
    selectedDrinks.forEach(option => option.classList.remove('selected'));
    
    // Reset form
    const userForm = document.getElementById('user-form');
    if (userForm) userForm.reset();
    
    // Update summary
    updateSelectedDrinksSummary();
    
    // Go back to first card
    showCard('user-info-card');
    
    log('Application reset');
    showToast('Uygulama sıfırlandı', 'info');
}

// Setup event listeners
function setupEventListeners() {
    log('Setting up event listeners', 'info', true);
    
    // User form submission
    const userForm = document.getElementById('user-form');
    if (userForm) {
        log('Found user form, adding submit listener', 'info', true);
        userForm.addEventListener('submit', handleUserInfoSubmit);
    } else {
        log('ERROR: user-form element not found!', 'error', true);
    }
    
    // Navigation buttons
    const continueBtn = document.getElementById('continue-to-confirmation');
    if (continueBtn) {
        log('Found continue button, adding click listener', 'info', true);
        continueBtn.addEventListener('click', () => {
            log('Continue button clicked, showing confirmation card', 'info', true);
            showCard('order-confirmation-card');
        });
    }
    
    // Confirm order button
    const confirmBtn = document.getElementById('confirm-order');
    if (confirmBtn) {
        log('Found confirm button, adding click listener', 'info', true);
        confirmBtn.addEventListener('click', confirmOrder);
    }
    
    // Reset buttons
    const resetButtons = document.querySelectorAll('.reset-btn');
    log(`Found ${resetButtons.length} reset buttons`, 'info', true);
    resetButtons.forEach(btn => {
        btn.addEventListener('click', resetApp);
    });
    
    // Back buttons
    const backButtons = document.querySelectorAll('.back-btn');
    log(`Found ${backButtons.length} back buttons`, 'info', true);
    backButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetCard = e.target.dataset.target;
            if (targetCard) {
                log(`Back button clicked, showing card: ${targetCard}`, 'info', true);
                showCard(targetCard);
            }
        });
    });
    
    log('Event listeners setup complete', 'info', true);
}

// Initialize application
async function initializeApp() {
    log('🚀 Initializing AVM Kitchen Order System...', 'log', true);
    
    try {
        showLoading(true);
        
        // Initialize Supabase unless in test mode
        if (!TEST_MODE) {
            try {
                await initializeSupabase();
                log('✅ Supabase ready', 'log', true);
            } catch (error) {
                log('⚠️ Supabase failed, enabling test mode', 'warn', true);
                TEST_MODE = true;
                showToast('Veritabanı bağlantısı kurulamadı, test modunda çalışıyor', 'warning');
            }
        }
        
        // Setup UI
        setupEventListeners();
        initializeDrinkSelection();
        updateSelectedDrinksSummary();
        
        // Show initial card
        showCard('user-info-card');
        
        // Ensure first card is visible
        const firstCard = document.getElementById('user-info-card');
        if (firstCard) {
            firstCard.style.display = 'block';
        }
        
        const mode = TEST_MODE ? 'Test Mode' : 'Production';
        log(`✅ App initialized successfully (${mode})`, 'log', true);
        showToast(`Sistem hazır (${mode})`, 'success');
        
    } catch (error) {
        log(`❌ App initialization failed: ${error.message}`, 'error', true);
        showToast(`Sistem başlatılamadı: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Make functions globally available for onclick handlers
window.updateDrinkQuantity = updateDrinkQuantity;
window.confirmOrder = confirmOrder;
window.resetApp = resetApp;

// Add some basic error handling for uncaught errors
window.addEventListener('error', (event) => {
    log(`Uncaught error: ${event.error?.message || event.message}`, 'error', true);
});

window.addEventListener('unhandledrejection', (event) => {
    log(`Unhandled promise rejection: ${event.reason?.message || event.reason}`, 'error', true);
});

log('Script loaded successfully', 'log', true);