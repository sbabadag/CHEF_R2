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
    log('Initializing drink selection', 'info', true);
    
    // Set up event listeners for existing drink options in HTML
    const drinkOptions = document.querySelectorAll('.drink-option');
    log(`Found ${drinkOptions.length} drink options in HTML`, 'info', true);
    
    drinkOptions.forEach(option => {
        const drinkName = option.dataset.drink;
        if (!drinkName) return;
        
        log(`Setting up drink option: ${drinkName}`, 'info', true);
        
        // Make the whole drink option clickable
        option.addEventListener('click', (e) => {
            // Don't trigger if clicking on quantity controls
            if (e.target.closest('.quantity-controls')) return;
            
            log(`Drink option clicked: ${drinkName}`, 'info', true);
            
            // Show quantity controls and select the drink
            const quantityControls = option.querySelector('.quantity-controls');
            const quantitySpan = option.querySelector('.quantity');
            
            if (quantityControls && quantitySpan) {
                quantityControls.style.display = 'flex';
                option.classList.add('selected');
                
                // Set initial quantity to 1 if not already set
                let currentQuantity = parseInt(quantitySpan.textContent) || 0;
                if (currentQuantity === 0) {
                    updateDrinkQuantity(drinkName, 1);
                }
            }
        });
        
        // Set up quantity control buttons
        const minusBtn = option.querySelector('.quantity-btn.minus');
        const plusBtn = option.querySelector('.quantity-btn.plus');
        
        if (minusBtn) {
            minusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                log(`Minus button clicked for: ${drinkName}`, 'info', true);
                updateDrinkQuantity(drinkName, -1);
            });
        }
        
        if (plusBtn) {
            plusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                log(`Plus button clicked for: ${drinkName}`, 'info', true);
                updateDrinkQuantity(drinkName, 1);
            });
        }
    });
    
    log('Drink selection initialization complete', 'info', true);
}

// Update drink quantity
function updateDrinkQuantity(drinkName, change) {
    log(`Updating ${drinkName} quantity by ${change}`, 'info', true);
    
    const drinkOption = document.querySelector(`[data-drink="${drinkName}"]`);
    if (!drinkOption) {
        log(`ERROR: Drink option not found: ${drinkName}`, 'error', true);
        return;
    }
    
    const quantitySpan = drinkOption.querySelector('.quantity');
    const quantityControls = drinkOption.querySelector('.quantity-controls');
    
    if (!quantitySpan) {
        log(`ERROR: Quantity span not found for: ${drinkName}`, 'error', true);
        return;
    }
    
    let currentQuantity = parseInt(quantitySpan.textContent) || 0;
    let newQuantity = Math.max(0, currentQuantity + change);
    
    log(`${drinkName}: ${currentQuantity} -> ${newQuantity}`, 'info', true);
    
    quantitySpan.textContent = newQuantity;
    
    // Update selected drinks array
    const existingIndex = selectedDrinks.findIndex(drink => drink.name === drinkName);
    
    if (newQuantity > 0) {
        if (existingIndex >= 0) {
            selectedDrinks[existingIndex].quantity = newQuantity;
        } else {
            selectedDrinks.push({ name: drinkName, quantity: newQuantity });
        }
        
        // Show visual feedback and quantity controls
        drinkOption.classList.add('selected');
        if (quantityControls) {
            quantityControls.style.display = 'flex';
        }
    } else {
        if (existingIndex >= 0) {
            selectedDrinks.splice(existingIndex, 1);
        }
        
        // Remove visual feedback and hide quantity controls
        drinkOption.classList.remove('selected');
        if (quantityControls) {
            quantityControls.style.display = 'none';
        }
    }
    
    updateSelectedDrinksSummary();
    log(`Updated ${drinkName}: ${newQuantity}`, 'info', true);
}

// Update order confirmation page
function updateOrderConfirmation() {
    log('Updating order confirmation page', 'info', true);
    
    // Get user info
    const nameInput = document.querySelector('input[name="name"]');
    const departmentSelect = document.querySelector('select[name="department"]');
    
    const customerName = nameInput ? nameInput.value.trim() : '';
    const department = departmentSelect ? departmentSelect.value : '';
    
    log(`Customer: ${customerName}, Department: ${department}`, 'info', true);
    
    // Update user info
    const summaryUser = document.getElementById('summary-user');
    if (summaryUser) {
        const userSpan = summaryUser.querySelector('span');
        if (userSpan) {
            userSpan.textContent = customerName ? `${customerName} (${department})` : '-';
        }
    }
    
    // Update drinks list
    const summaryDrinksList = document.getElementById('summary-drinks-list');
    if (summaryDrinksList && selectedDrinks.length > 0) {
        summaryDrinksList.innerHTML = selectedDrinks.map(drink => 
            `<div class="summary-drink-item">
                <span class="drink-name">${drink.name}</span>
                <span class="drink-quantity">x${drink.quantity}</span>
            </div>`
        ).join('');
    } else if (summaryDrinksList) {
        summaryDrinksList.textContent = '-';
    }
    
    // Update total count
    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);
    const summaryTotalCount = document.getElementById('summary-total-count');
    if (summaryTotalCount) {
        summaryTotalCount.textContent = `${totalItems} içecek`;
    }
    
    // Update order time
    const summaryTime = document.querySelector('#summary-time span');
    if (summaryTime) {
        const now = new Date();
        summaryTime.textContent = now.toLocaleString('tr-TR');
    }
    
    log(`Confirmation updated: ${totalItems} drinks for ${customerName}`, 'info', true);
}

// Update selected drinks summary
function updateSelectedDrinksSummary() {
    const summaryDiv = document.getElementById('selected-drinks-summary');
    const continueBtn = document.getElementById('continue-to-confirmation');
    
    if (!summaryDiv) {
        log('ERROR: selected-drinks-summary element not found', 'error', true);
        return;
    }
    
    if (selectedDrinks.length === 0) {
        summaryDiv.style.display = 'none';
        summaryDiv.innerHTML = '<p>Henüz içecek seçilmedi</p>';
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.style.display = 'none';
        }
        return;
    }
    
    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);
    
    // Show the summary
    summaryDiv.style.display = 'block';
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
    
    // Show and enable the continue button
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.style.display = 'inline-flex';
    }
    
    log(`Updated summary with ${selectedDrinks.length} drinks, ${totalItems} total`, 'info', true);
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
            log('Continue button clicked, updating confirmation and showing card', 'info', true);
            updateOrderConfirmation();
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
    
    // Specific back buttons with IDs
    const backToDrinks = document.getElementById('back-to-drinks');
    if (backToDrinks) {
        log('Found back-to-drinks button', 'info', true);
        backToDrinks.addEventListener('click', () => {
            log('Back to drinks clicked', 'info', true);
            showCard('drink-selection-card');
        });
    }
    
    const backToUserInfo = document.getElementById('back-to-user-info');
    if (backToUserInfo) {
        log('Found back-to-user-info button', 'info', true);
        backToUserInfo.addEventListener('click', () => {
            log('Back to user info clicked', 'info', true);
            showCard('user-info-card');
        });
    }
    
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