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

// CYD Status Alert Popup - Big prominent alert for status changes
function showCydAlert(message, status, duration = 6000) {
    log(`🚨 showCydAlert CALLED: ${message} (${status})`, 'info', true);
    console.log(`🚨 CYD Alert Function Called:`, { message, status, duration });
    
    try {
        // Remove existing CYD alerts
        const existingAlerts = document.querySelectorAll('.cyd-alert');
        log(`Found ${existingAlerts.length} existing alerts to remove`, 'info', true);
        existingAlerts.forEach(alert => alert.remove());
        
        // Create big popup alert
        const alert = document.createElement('div');
        alert.className = 'cyd-alert';
        
        const statusIcons = {
            'alindi': '👨‍🍳',
            'hazirlandi': '🍹',
            'completed': '✅'
        };
        
        const statusColors = {
            'alindi': '#667eea',
            'hazirlandi': '#28a745',
            'completed': '#28a745'
        };
        
        alert.innerHTML = `
            <div class="cyd-alert-content">
                <div class="cyd-alert-icon">${statusIcons[status] || '📱'}</div>
                <div class="cyd-alert-title">CYD Güncellemesi</div>
                <div class="cyd-alert-message">${message}</div>
                <div class="cyd-alert-status">Status: ${status.toUpperCase()}</div>
            </div>
        `;
        
        log(`Alert element created with innerHTML`, 'info', true);
        
        // Styling with more aggressive positioning
        alert.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: white !important;
            border: 5px solid ${statusColors[status] || '#667eea'} !important;
            border-radius: 15px !important;
            padding: 30px !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
            z-index: 99999 !important;
            text-align: center !important;
            min-width: 400px !important;
            max-width: 500px !important;
            animation: cydAlertSlideIn 0.5s ease-out !important;
            display: block !important;
            visibility: visible !important;
        `;
        
        log(`Alert styles applied`, 'info', true);
    
    // Style the content
    const content = alert.querySelector('.cyd-alert-content');
    content.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    `;
    
    const icon = alert.querySelector('.cyd-alert-icon');
    icon.style.cssText = `
        font-size: 48px;
        animation: pulse 2s infinite;
    `;
    
    const title = alert.querySelector('.cyd-alert-title');
    title.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        color: ${statusColors[status] || '#667eea'};
        margin: 0;
    `;
    
    const messageEl = alert.querySelector('.cyd-alert-message');
    messageEl.style.cssText = `
        font-size: 18px;
        color: #333;
        margin: 0;
    `;
    
    const statusEl = alert.querySelector('.cyd-alert-status');
    statusEl.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        color: ${statusColors[status] || '#667eea'};
        background: rgba(102, 126, 234, 0.1);
        padding: 8px 16px;
        border-radius: 8px;
        margin: 0;
    `;
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes cydAlertSlideIn {
            from { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
            to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        .cyd-alert {
            animation: cydAlertSlideIn 0.5s ease-out;
        }
    `;
    if (!document.querySelector('style[data-cyd-alert]')) {
        style.setAttribute('data-cyd-alert', '');
        document.head.appendChild(style);
    }
    
        // Add to body
        document.body.appendChild(alert);
        log(`Alert added to body`, 'info', true);
        
        // Style the content elements
        const content = alert.querySelector('.cyd-alert-content');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        `;
        
        const icon = alert.querySelector('.cyd-alert-icon');
        icon.style.cssText = `
            font-size: 48px;
            animation: pulse 2s infinite;
        `;
        
        const title = alert.querySelector('.cyd-alert-title');
        title.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: ${statusColors[status] || '#667eea'};
            margin: 0;
        `;
        
        const messageEl = alert.querySelector('.cyd-alert-message');
        messageEl.style.cssText = `
            font-size: 18px;
            color: #333;
            margin: 0;
        `;
        
        const statusEl = alert.querySelector('.cyd-alert-status');
        statusEl.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: ${statusColors[status] || '#667eea'};
            background: rgba(102, 126, 234, 0.1);
            padding: 8px 16px;
            border-radius: 8px;
            margin: 0;
        `;
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes cydAlertSlideIn {
                from { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .cyd-alert {
                animation: cydAlertSlideIn 0.5s ease-out;
            }
        `;
        if (!document.querySelector('style[data-cyd-alert]')) {
            style.setAttribute('data-cyd-alert', '');
            document.head.appendChild(style);
        }
        
        // Play notification sound if available
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
            // Try to play a beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = status === 'hazirlandi' ? 800 : 600;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            log('Could not play notification sound', 'warn');
        }
        
        // Click to dismiss
        alert.addEventListener('click', () => {
            log('Alert clicked, removing', 'info', true);
            alert.remove();
        });
        
        // Auto remove after duration
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'cydAlertSlideIn 0.3s ease-in reverse';
                setTimeout(() => {
                    if (alert.parentNode) alert.remove();
                }, 300);
            }
        }, duration);
        
        log(`🚨 CYD Alert displayed successfully: ${message}`, 'info', true);
        
    } catch (error) {
        log(`❌ Error in showCydAlert: ${error.message}`, 'error', true);
        console.error('CYD Alert Error:', error);
        
        // Fallback - simple alert
        alert(`CYD Alert: ${message}`);
    }
}
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

// Global variables for status tracking
let orderStatusData = {};

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
        
        // Stay on confirmation card but show status section
        showOrderStatusSection();
        
        // Start status checking
        startStatusCheck();
        
        showToast('Sipariş başarıyla gönderildi!', 'success');
        
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

// Show order status section in confirmation card
function showOrderStatusSection() {
    log(`🎯 showOrderStatusSection called`, 'info', true);
    
    const statusSection = document.getElementById('order-status-section');
    const confirmButton = document.getElementById('confirm-order');
    const backButton = document.getElementById('back-to-drinks');
    const newOrderButton = document.getElementById('place-new-order-confirmation');
    
    log(`📍 Elements found - StatusSection: ${statusSection ? 'YES' : 'NO'}, ConfirmBtn: ${confirmButton ? 'YES' : 'NO'}`, 'info', true);
    
    if (statusSection) {
        log(`📍 StatusSection display BEFORE: ${statusSection.style.display}`, 'info', true);
        statusSection.style.display = 'block';
        statusSection.style.visibility = 'visible';
        log(`📍 StatusSection display AFTER: ${statusSection.style.display}`, 'info', true);
        
        // Force layout recalculation
        statusSection.offsetHeight;
        log(`📍 Forced layout recalculation`, 'info', true);
    }
    
    // Hide confirmation buttons, show new order button
    if (confirmButton) {
        confirmButton.style.display = 'none';
        log(`📍 Confirm button hidden`, 'info', true);
    }
    if (backButton) {
        backButton.style.display = 'none'; 
        log(`📍 Back button hidden`, 'info', true);
    }
    if (newOrderButton) {
        newOrderButton.style.display = 'inline-flex';
        log(`📍 New order button shown`, 'info', true);
    }
    
    // Double-check the status items after showing the section
    setTimeout(() => {
        const statusItems = document.querySelectorAll('#order-status-section .status-item');
        log(`📍 Status items in section after show: ${statusItems.length}`, 'info', true);
        statusItems.forEach((item, index) => {
            log(`📍 Status item ${index}: id="${item.id}", visible=${item.offsetParent !== null}, display=${getComputedStyle(item).display}`, 'info', true);
        });
    }, 100);
    
    log(`🏁 showOrderStatusSection completed`, 'info', true);
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
        </div>
    `;
    
    // Set order creation time for test mode
    window.orderCreatedTime = Date.now();
}

// Start real-time status checking
function startStatusCheck() {
    log('Starting real-time status check', 'info', true);
    
    if (currentOrderIds.length === 0) {
        log('No order IDs to track - cannot start status check', 'warn', true);
        return;
    }
    
    // Clear any existing interval
    if (statusCheckInterval) {
        log('Clearing existing status check interval', 'info', true);
        clearInterval(statusCheckInterval);
    }
    
    // Initial status update
    log('Running initial status update', 'info', true);
    updateOrderStatus();
    
    // Check status every 5 seconds
    statusCheckInterval = setInterval(() => {
        log('🔄 AUTOMATIC Status check interval triggered', 'info', true);
        // Add visual indicator that automatic check is running
        const indicator = document.createElement('div');
        indicator.id = 'auto-check-indicator';
        indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #667eea; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; z-index: 1000;';
        indicator.textContent = '🔄 Checking status...';
        document.body.appendChild(indicator);
        
        updateOrderStatus();
        
        // Remove indicator after 1 second
        setTimeout(() => {
            const ind = document.getElementById('auto-check-indicator');
            if (ind) ind.remove();
        }, 1000);
    }, 5000);
    
    log(`Status checking started for orders: ${currentOrderIds.join(', ')}`, 'info', true);
}

// Update order status in real-time
async function updateOrderStatus() {
    if (currentOrderIds.length === 0) {
        log('No order IDs to track', 'info');
        return;
    }
    
    log(`Updating order status for: ${JSON.stringify(currentOrderIds)}`, 'info', true);
    
    try {
        if (TEST_MODE) {
            log('Running in TEST_MODE - simulating status', 'info', true);
            // Test mode - simulate status progression
            simulateStatusProgression();
        } else {
            log('Running in PRODUCTION mode - checking database', 'info', true);
            // Production mode - check actual status from database
            await checkOrderStatusFromDatabase();
        }
        
        log('Calling updateStatusDisplay()', 'info', true);
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
    
    log(`Checking status for order IDs: ${JSON.stringify(currentOrderIds)}`, 'info', true);
    
    const { data, error } = await supabase
        .from('drink_orders')
        .select('id, status')
        .in('id', currentOrderIds);
    
    if (error) {
        log(`Status check error: ${error.message}`, 'error', true);
        throw new Error(`Status check failed: ${error.message}`);
    }
    
    log(`Raw status data from DB: ${JSON.stringify(data)}`, 'info', true);
    
    // Check for status changes and show CYD alerts
    data.forEach(order => {
        const currentStatus = order.status;
        const previousStatus = previousOrderStatus[order.id];
        
        log(`🔍 Status comparison for order ${order.id}: previous="${previousStatus}" current="${currentStatus}"`, 'info', true);
        
        // Detect status change (also show alert for first-time detection of non-new status)
        if ((previousStatus && previousStatus !== currentStatus) || 
            (!previousStatus && currentStatus !== 'new' && currentStatus !== 'pending')) {
            
            log(`🚨 STATUS CHANGE DETECTED for order ${order.id}: ${previousStatus || 'initial'} → ${currentStatus}`, 'info', true);
            
            // Show CYD Alert for status change
            const statusMessages = {
                'alindi': 'Siparişiniz mutfakta alındı! 👨‍🍳',
                'hazirlandi': 'Siparişiniz hazırlandı! 🍹',
                'completed': 'Siparişiniz tamamlandı! ✅'
            };
            
            const message = statusMessages[currentStatus] || `Sipariş durumu: ${currentStatus}`;
            log(`🚨 Showing CYD Alert: ${message}`, 'info', true);
            
            try {
                showCydAlert(message, currentStatus);
                log(`✅ CYD Alert displayed successfully`, 'info', true);
            } catch (error) {
                log(`❌ Error showing CYD Alert: ${error.message}`, 'error', true);
            }
        } else {
            log(`ℹ️ No status change for order ${order.id}`, 'info', true);
        }
        
        // Store current status for next comparison
        previousOrderStatus[order.id] = currentStatus;
    });
    
    // Update status data
    orderStatusData = {};
    data.forEach(order => {
        orderStatusData[order.id] = order.status;
    });
    
    log(`Status updated: ${JSON.stringify(orderStatusData)}`, 'info', true);
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
            log(`🚨 TEST MODE STATUS CHANGE for order ${id}: ${previousStatus} → ${simulatedStatus}`, 'info', true);
            
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
    
    // Update all orders with same status for simplicity
    orderStatusData = {};
    currentOrderIds.forEach(id => {
        orderStatusData[id] = simulatedStatus;
    });
    
    log(`Simulated status: ${simulatedStatus} (elapsed: ${Math.floor(elapsed/1000)}s)`, 'info', true);
}

// Update status display on the page
function updateStatusDisplay() {
    log(`🔄 updateStatusDisplay called with orderStatusData: ${JSON.stringify(orderStatusData)}`, 'info', true);
    
    // Debug: Check which cards are currently visible
    const successCard = document.getElementById('success-card');
    const confirmationCard = document.getElementById('order-confirmation-card');
    const successVisible = successCard && successCard.style.display !== 'none';
    const confirmationVisible = confirmationCard && confirmationCard.style.display !== 'none';
    
    log(`📍 Card visibility - Success: ${successVisible}, Confirmation: ${confirmationVisible}`, 'info', true);
    
    if (Object.keys(orderStatusData).length === 0) {
        log('❌ No order status data available - exiting updateStatusDisplay', 'warn', true);
        return;
    }
    
    // Determine overall status (most advanced status among all orders)
    const statuses = Object.values(orderStatusData);
    log(`📊 All statuses: ${JSON.stringify(statuses)}`, 'info', true);
    
    let overallStatus = 'new';
    
    if (statuses.every(status => status === 'hazirlandi')) {
        overallStatus = 'hazirlandi';
        log(`✅ All orders completed - status: ${overallStatus}`, 'info', true);
    } else if (statuses.some(status => status === 'alindi' || status === 'hazirlandi')) {
        overallStatus = 'alindi';
        log(`🔄 Some orders in progress - status: ${overallStatus}`, 'info', true);
    }
    
    log(`🎯 Overall status determined: ${overallStatus}`, 'info', true);
    
    // CRITICAL: Call the status items update function
    try {
        log(`🚀 About to call updateCardStatusItems with status: ${overallStatus}`, 'info', true);
        updateCardStatusItems(overallStatus);
        log(`✅ updateCardStatusItems completed successfully`, 'info', true);
        
        // FORCE IMMEDIATE VISUAL UPDATE - Emergency fix
        log(`🚨 FORCE UPDATING ALL BLUE ELEMENTS`, 'info', true);
        const allStatusElements = document.querySelectorAll('.status-item, #status-alindi-confirmation, #status-hazirlandi-confirmation');
        allStatusElements.forEach(element => {
            if (element && (element.id.includes('alindi') || element.id.includes('hazirlandi'))) {
                element.style.color = '#667eea !important';
                element.style.fontWeight = 'bold';
                element.style.opacity = '1';
                element.classList.add('active');
                
                // Force the icon color too
                const icon = element.querySelector('i');
                if (icon) {
                    icon.style.color = '#667eea';
                    icon.style.fontSize = '1.2em';
                }
                
                // Flash effect to show change
                element.style.backgroundColor = '#667eea';
                element.style.color = 'white';
                element.style.padding = '5px';
                element.style.borderRadius = '5px';
                
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    element.style.color = '#667eea';
                    element.style.padding = '';
                    element.style.borderRadius = '';
                }, 3000);
                
                log(`🔵 FORCE UPDATED ${element.id} to blue`, 'info', true);
            }
        });
        
    } catch (error) {
        log(`❌ ERROR in updateCardStatusItems: ${error.message}`, 'error', true);
        log(`❌ ERROR stack: ${error.stack}`, 'error', true);
    }
    
    // Show toast notification for status changes
    const statusMessages = {
        'new': 'Sipariş alındı',
        'alindi': 'Sipariş hazırlanıyor',
        'hazirlandi': 'Sipariş hazır!'
    };
    
    if (overallStatus !== 'new') {
        showToast(statusMessages[overallStatus], 'info');
        log(`📢 Toast shown: ${statusMessages[overallStatus]}`, 'info', true);
    }
    
    // Stop checking if all orders are completed
    if (overallStatus === 'hazirlandi') {
        log('🏁 All orders completed, stopping status check', 'info', true);
        stopStatusCheck();
        showToast('Siparişiniz hazır! ✅', 'success');
        
        // Play notification sound or vibration if available
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }
    
    log(`🏁 updateStatusDisplay completed`, 'info', true);
}

// Update status card items
function updateCardStatusItems(status) {
    log(`🔄 updateCardStatusItems called with status: ${status}`, 'info', true);
    
    // First, let's see what's currently visible
    const orderStatusSection = document.getElementById('order-status-section');
    log(`📍 order-status-section found: ${orderStatusSection ? 'YES' : 'NO'}`, 'info', true);
    log(`📍 order-status-section display: ${orderStatusSection?.style.display}`, 'info', true);
    
    // Get all status items in the current visible card
    const allStatusItems = document.querySelectorAll('.status-item');
    log(`📍 Found total ${allStatusItems.length} status items`, 'info', true);
    
    // List all found status items
    allStatusItems.forEach((item, index) => {
        log(`📍 Status item ${index}: id="${item.id}", visible=${item.offsetParent !== null}`, 'info', true);
    });
    
    // Check specific confirmation elements
    const statusNewConf = document.getElementById('status-new-confirmation');
    const statusAlindiConf = document.getElementById('status-alindi-confirmation'); 
    const statusHazirlandiConf = document.getElementById('status-hazirlandi-confirmation');
    
    log(`📍 Confirmation elements - New: ${statusNewConf ? 'YES' : 'NO'}, Alindi: ${statusAlindiConf ? 'YES' : 'NO'}, Hazirlandi: ${statusHazirlandiConf ? 'YES' : 'NO'}`, 'info', true);
    
    if (statusAlindiConf) {
        log(`📍 Alindi element current style: color="${statusAlindiConf.style.color}", opacity="${statusAlindiConf.style.opacity}", classes="${statusAlindiConf.className}"`, 'info', true);
    }
    
    // Reset all status items first
    allStatusItems.forEach(item => {
        item.classList.remove('active', 'completed');
        item.style.opacity = '0.5';
        item.style.color = '#666';
        const icon = item.querySelector('i');
        if (icon) icon.style.color = '#666';
        log(`🔄 Reset item ${item.id}`, 'info', true);
    });
    
    // Update based on status with direct style manipulation
    if (status === 'alindi') {
        log(`🎯 Processing ALINDI status...`, 'info', true);
        
        // Mark new as completed  
        const newItems = document.querySelectorAll('#status-new, #status-new-confirmation');
        log(`📍 Found ${newItems.length} NEW items for completion`, 'info', true);
        newItems.forEach(item => {
            if (item) {
                item.classList.add('completed');
                item.style.opacity = '1';
                item.style.color = '#28a745';
                const icon = item.querySelector('i');
                if (icon) icon.style.color = '#28a745';
                log(`✅ Set NEW item ${item.id} as completed`, 'info', true);
            }
        });
        
        // Mark alindi as active
        const alindiItems = document.querySelectorAll('#status-alindi, #status-alindi-confirmation');
        log(`📍 Found ${alindiItems.length} ALINDI items for activation`, 'info', true);
        alindiItems.forEach(item => {
            if (item) {
                item.classList.add('active');
                item.style.opacity = '1';
                item.style.color = '#667eea';
                item.style.fontWeight = 'bold';
                const icon = item.querySelector('i');
                if (icon) {
                    icon.style.color = '#667eea';
                    icon.style.fontSize = '1.2em';
                }
                log(`🔵 Set ALINDI item ${item.id} as active with blue color`, 'info', true);
                
                // Add visual flash effect to show automatic change
                item.style.boxShadow = '0 0 15px #667eea';
                item.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    item.style.boxShadow = '';
                    item.style.transform = 'scale(1)';
                }, 2000);
                
                // Force a repaint
                item.offsetHeight;
                log(`🔄 Forced repaint for ${item.id} with flash effect`, 'info', true);
            }
        });
        
    } else if (status === 'hazirlandi') {
        log(`🎯 Processing HAZIRLANDI status...`, 'info', true);
        
        // Mark new and alindi as completed
        const completedItems = document.querySelectorAll('#status-new, #status-new-confirmation, #status-alindi, #status-alindi-confirmation');
        completedItems.forEach(item => {
            if (item) {
                item.classList.add('completed');
                item.style.opacity = '1';
                item.style.color = '#28a745';
                const icon = item.querySelector('i');
                if (icon) icon.style.color = '#28a745';
                log(`✅ Set item ${item.id} as completed`, 'info', true);
            }
        });
        
        // Mark hazirlandi as active
        const hazirlandiItems = document.querySelectorAll('#status-hazirlandi, #status-hazirlandi-confirmation');
        hazirlandiItems.forEach(item => {
            if (item) {
                item.classList.add('active');
                item.style.opacity = '1';
                item.style.color = '#667eea';
                item.style.fontWeight = 'bold';
                const icon = item.querySelector('i');
                if (icon) {
                    icon.style.color = '#667eea';
                    icon.style.fontSize = '1.2em';
                }
                log(`🔵 Set HAZIRLANDI item ${item.id} as active with blue color`, 'info', true);
                
                // Add visual flash effect to show automatic change
                item.style.boxShadow = '0 0 15px #667eea';
                item.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    item.style.boxShadow = '';
                    item.style.transform = 'scale(1)';
                }, 2000);
            }
        });
    } else {
        // Default new status
        const newItems = document.querySelectorAll('#status-new, #status-new-confirmation');
        newItems.forEach(item => {
            if (item) {
                item.classList.add('active');
                item.style.opacity = '1';
                item.style.color = '#667eea';
                const icon = item.querySelector('i');
                if (icon) icon.style.color = '#667eea';
                log(`🔵 Set NEW item ${item.id} as active`, 'info', true);
            }
        });
    }
    
    // Update status text in confirmation card
    const statusTextConfirmation = document.getElementById('status-text-confirmation');
    if (statusTextConfirmation) {
        const statusMessages = {
            'new': 'Sipariş alındı, hazırlanıyor...',
            'alindi': '🔵 Aşçı siparişinizi aldı, hazırlanıyor...',
            'hazirlandi': '🎉 Siparişiniz hazır! Teslim alabilirsiniz.'
        };
        statusTextConfirmation.textContent = statusMessages[status] || 'Durum güncelleniyor...';
        statusTextConfirmation.style.color = status === 'alindi' ? '#667eea' : (status === 'hazirlandi' ? '#28a745' : '#333');
        log(`💬 Updated confirmation status text: ${statusMessages[status]}`, 'info', true);
    }
    
    log(`🏁 updateCardStatusItems completed for status: ${status}`, 'info', true);
}

// Stop status checking
function stopStatusCheck() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
        log('Status checking stopped', 'info', true);
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
    orderStatusData = {};
    window.currentUser = null;
    window.orderCreatedTime = null;
    
    // Stop status checking
    stopStatusCheck();
    
    // Reset drink quantities and selections
    const quantitySpans = document.querySelectorAll('.quantity');
    quantitySpans.forEach(span => span.textContent = '0');
    
    const quantityControls = document.querySelectorAll('.quantity-controls');
    quantityControls.forEach(control => control.style.display = 'none');
    
    // Remove selected classes from drink options
    const selectedDrinkOptions = document.querySelectorAll('.drink-option.selected');
    selectedDrinkOptions.forEach(option => option.classList.remove('selected'));
    
    // Reset form
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.reset();
        log('User form reset', 'info', true);
    }
    
    // Clear summary
    const summaryDiv = document.getElementById('selected-drinks-summary');
    if (summaryDiv) {
        summaryDiv.style.display = 'none';
        summaryDiv.innerHTML = '<p>Henüz içecek seçilmedi</p>';
    }
    
    // Hide continue button
    const continueBtn = document.getElementById('continue-to-confirmation');
    if (continueBtn) {
        continueBtn.style.display = 'none';
        continueBtn.disabled = true;
    }
    
    // Reset confirmation card to initial state
    const statusSection = document.getElementById('order-status-section');
    const confirmButton = document.getElementById('confirm-order');
    const backButton = document.getElementById('back-to-drinks');
    const newOrderButton = document.getElementById('place-new-order-confirmation');
    
    if (statusSection) statusSection.style.display = 'none';
    if (confirmButton) confirmButton.style.display = 'inline-flex';
    if (backButton) backButton.style.display = 'inline-flex';
    if (newOrderButton) newOrderButton.style.display = 'none';
    
    // Update summary
    updateSelectedDrinksSummary();
    
    log('App reset completed', 'info', true);
    
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
    
    // New order button (place-new-order)
    const newOrderBtn = document.getElementById('place-new-order');
    if (newOrderBtn) {
        log('Found place-new-order button', 'info', true);
        newOrderBtn.addEventListener('click', () => {
            log('New order button clicked, resetting app', 'info', true);
            resetApp();
            showCard('user-info-card');
        });
    }
    
    // New order button in confirmation card (place-new-order-confirmation)
    const newOrderConfirmationBtn = document.getElementById('place-new-order-confirmation');
    if (newOrderConfirmationBtn) {
        log('Found place-new-order-confirmation button', 'info', true);
        newOrderConfirmationBtn.addEventListener('click', () => {
            log('New order confirmation button clicked, resetting app', 'info', true);
            resetApp();
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
        
        // FORCE BLUE UPDATE FUNCTION - Emergency visual fix
        window.forceBlueUpdate = function() {
            log('🚨 MANUAL FORCE BLUE UPDATE TRIGGERED', 'info', true);
            
            const elements = [
                document.getElementById('status-alindi-confirmation'),
                document.getElementById('status-hazirlandi-confirmation'),
                document.querySelector('.status-item[data-status="alindi"]'),
                document.querySelector('.status-item[data-status="hazirlandi"]')
            ];
            
            elements.forEach((element, index) => {
                if (element) {
                    log(`🔧 Forcing blue on element ${index}: ${element.id || element.className}`, 'info', true);
                    
                    // Multiple approaches to force the color
                    element.style.setProperty('color', '#667eea', 'important');
                    element.style.color = '#667eea';
                    element.style.fontWeight = 'bold';
                    element.style.opacity = '1';
                    element.classList.add('active');
                    
                    // Flash effect
                    element.style.backgroundColor = '#667eea';
                    element.style.color = 'white';
                    element.style.padding = '8px';
                    element.style.borderRadius = '8px';
                    element.style.transform = 'scale(1.1)';
                    
                    setTimeout(() => {
                        element.style.backgroundColor = 'transparent';
                        element.style.color = '#667eea';
                        element.style.padding = '';
                        element.style.borderRadius = '';
                        element.style.transform = 'scale(1)';
                    }, 2000);
                    
                    // Also update the icon
                    const icon = element.querySelector('i');
                    if (icon) {
                        icon.style.setProperty('color', '#667eea', 'important');
                        icon.style.fontSize = '1.3em';
                    }
                    
                    log(`✅ Force updated element ${index}`, 'info', true);
                } else {
                    log(`❌ Element ${index} not found`, 'warn', true);
                }
            });
        };
        
        // CYD ALERT TEST FUNCTION - Enhanced for debugging
        window.testCydAlert = function(status = 'alindi') {
            log(`🧪 Manual CYD Alert test: ${status}`, 'info', true);
            const messages = {
                'alindi': 'TEST: Siparişiniz mutfakta alındı! 👨‍🍳',
                'hazirlandi': 'TEST: Siparişiniz hazırlandı! 🍹',
                'completed': 'TEST: Siparişiniz tamamlandı! ✅'
            };
            
            try {
                const message = messages[status] || 'Test alert';
                log(`🚨 Attempting to show CYD alert: ${message}`, 'info', true);
                showCydAlert(message, status);
                log(`✅ CYD alert function completed`, 'info', true);
            } catch (error) {
                log(`❌ Error in testCydAlert: ${error.message}`, 'error', true);
                console.error('CYD Alert Error:', error);
            }
        };
        
        // IMMEDIATE TEST - Show popup on page load for testing
        window.showTestPopup = function() {
            log('🧪 Showing immediate test popup', 'info', true);
            showCydAlert('TEST: System Ready! Click to dismiss', 'alindi');
        };
        
        log('🧪 CYD Alert test functions added. Try: testCydAlert("hazirlandi") or showTestPopup()', 'info', true);
        
        // TEST: Add a manual test function to the window for debugging
        window.testStatusUpdate = function(status) {
            log(`🧪 Manual test: setting status to ${status}`, 'info', true);
            try {
                updateCardStatusItems(status);
            } catch (error) {
                log(`❌ Manual test error: ${error.message}`, 'error', true);
            }
        };
        
        log(`🧪 Added window.testStatusUpdate() function for manual testing`, 'info', true);
        
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