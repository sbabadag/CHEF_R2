// Supabase Configuration
const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

// Test mode - set to false for production, true for offline testing
const TEST_MODE = false;

// Initialize Supabase client
let supabase = null;
let supabaseInitialized = false;

// Safe console logging
const safeLog = (message, type = 'log') => {
    try {
        console[type](`[AVM Kitchen] ${message}`);
    } catch (e) {
        // Fallback if console is not available
    }
};

// Initialize Supabase with error handling
function initializeSupabase() {
    if (supabaseInitialized) return supabase;
    
    try {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseInitialized = true;
            safeLog('✅ Supabase client initialized successfully');
            return supabase;
        } else {
            safeLog('⚠️ Supabase library not yet loaded');
            return null;
        }
    } catch (error) {
        safeLog('❌ Error initializing Supabase: ' + error.message, 'error');
        return null;
    }
}

// Global variables
let selectedDrinks = []; // Birden fazla içecek için array
let currentOrderIds = []; // Birden fazla sipariş ID'si
let statusCheckInterval = null;

// DOM Elements
const userInfoCard = document.getElementById('user-info-card');
const drinkSelectionCard = document.getElementById('drink-selection-card');
const orderConfirmationCard = document.getElementById('order-confirmation-card');
const successCard = document.getElementById('success-card');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    safeLog('🚀 Initializing AVM Kitchen Order System...');
    
    try {
        // Initialize Supabase
        supabase = initializeSupabase();
        
        // Test Supabase connection if not in test mode
        if (!TEST_MODE && supabase) {
            testSupabaseConnection();
        } else if (TEST_MODE) {
            safeLog('🧪 Running in TEST MODE - offline functionality enabled');
        }
        
        // Initialize UI components
        setupEventListeners();
        setupDrinkSelection();
        
        safeLog('✅ App initialization completed');
        
    } catch (error) {
        safeLog('❌ Error during app initialization: ' + error.message, 'error');
        // Fallback to test mode if initialization fails
        if (!TEST_MODE) {
            safeLog('🔄 Falling back to test mode due to initialization error');
            TEST_MODE = true;
        }
    }
}

function setupEventListeners() {
    // User info form submit
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserInfoSubmit);
    }
    
    // Drink selection - multiple selection support
    const drinkOptions = document.querySelectorAll('.drink-option');
    drinkOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            // Prevent event bubbling for quantity buttons
            if (e.target.classList.contains('quantity-btn')) {
                return;
            }
            toggleDrinkSelection(option);
        });
    });
    
    // Quantity controls
    setupQuantityControls();
    
    // Navigation buttons
    const continueBtn = document.getElementById('continue-to-drinks');
    if (continueBtn && continueBtn.type === 'button') {
        continueBtn.addEventListener('click', () => {
            showCard('drink-selection');
        });
    }
    
    const backToUserBtn = document.getElementById('back-to-user-info');
    if (backToUserBtn) {
        backToUserBtn.addEventListener('click', () => {
            showCard('user-info');
        });
    }
    
    const continueToConfirmationBtn = document.getElementById('continue-to-confirmation');
    if (continueToConfirmationBtn) {
        continueToConfirmationBtn.addEventListener('click', () => {
            updateOrderSummary();
            showCard('order-confirmation');
        });
    }
    
    const confirmBtn = document.getElementById('confirm-order');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmOrder);
    }
    
    const backToDrinksBtn = document.getElementById('back-to-drinks');
    if (backToDrinksBtn) {
        backToDrinksBtn.addEventListener('click', () => {
            showCard('drink-selection');
        });
    }
    
    const newOrderBtn = document.getElementById('place-new-order');
    if (newOrderBtn) {
        newOrderBtn.addEventListener('click', () => {
            resetApp();
            showCard('user-info');
        });
    }
}

function setupQuantityControls() {
    safeLog('🍹 Setting up quantity controls...', 'log');
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    safeLog(`Found ${quantityButtons.length} quantity buttons`, 'log');
    
    quantityButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            safeLog(`🔥 Quantity button clicked: ${btn.classList.contains('plus') ? 'plus' : 'minus'}`, 'log');
            e.stopPropagation(); // Prevent drink selection toggle
            const drinkOption = btn.closest('.drink-option');
            const quantitySpan = drinkOption.querySelector('.quantity');
            const isPlus = btn.classList.contains('plus');
            let currentQuantity = parseInt(quantitySpan.textContent);
            
            safeLog(`Current quantity for ${drinkOption.dataset.drink}: ${currentQuantity}`, 'log');
            
            if (isPlus) {
                currentQuantity++;
            } else if (currentQuantity > 1) {
                currentQuantity--;
            } else if (currentQuantity === 1) {
                // If quantity becomes 0, deselect the drink
                safeLog(`Deselecting ${drinkOption.dataset.drink} (quantity = 0)`, 'log');
                toggleDrinkSelection(drinkOption);
                return;
            }
            
            quantitySpan.textContent = currentQuantity;
            updateSelectedDrink(drinkOption, currentQuantity);
            updateSelectedDrinksSummary();
            safeLog(`Updated quantity for ${drinkOption.dataset.drink} to: ${currentQuantity}`, 'log');
        });
    });
    
    safeLog('✅ Quantity controls setup complete', 'log');
}

function toggleDrinkSelection(drinkElement) {
    const drinkName = drinkElement.dataset.drink;
    safeLog(`🔥 toggleDrinkSelection called for: ${drinkName}`, 'log');
    
    const quantityControls = drinkElement.querySelector('.quantity-controls');
    const quantitySpan = drinkElement.querySelector('.quantity');
    
    if (drinkElement.classList.contains('selected')) {
        // Deselect drink
        safeLog(`Deselecting ${drinkName}`, 'log');
        drinkElement.classList.remove('selected');
        quantityControls.style.display = 'none';
        
        // Remove from selectedDrinks array
        selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);
    } else {
        // Select drink
        safeLog(`Selecting ${drinkName}`, 'log');
        drinkElement.classList.add('selected');
        quantityControls.style.display = 'flex';
        quantitySpan.textContent = '1';
        
        // Add to selectedDrinks array
        const drinkData = {
            name: drinkName,
            icon: drinkElement.querySelector('i').className,
            description: drinkElement.querySelector('p').textContent,
            quantity: 1
        };
        selectedDrinks.push(drinkData);
    }
    
    updateSelectedDrinksSummary();
    safeLog(`Selected drinks count: ${selectedDrinks.length}`, 'log');
}

function updateSelectedDrink(drinkElement, quantity) {
    const drinkName = drinkElement.dataset.drink;
    const existingDrink = selectedDrinks.find(drink => drink.name === drinkName);
    
    if (existingDrink) {
        existingDrink.quantity = quantity;
    }
}

function updateSelectedDrinksSummary() {
    const summaryDiv = document.getElementById('selected-drinks-summary');
    const listDiv = document.getElementById('selected-drinks-list');
    const totalCountSpan = document.getElementById('total-count');
    const continueBtn = document.getElementById('continue-to-confirmation');
    
    if (selectedDrinks.length === 0) {
        summaryDiv.style.display = 'none';
        continueBtn.style.display = 'none';
        return;
    }
    
    summaryDiv.style.display = 'block';
    continueBtn.style.display = 'inline-flex';
    
    // Clear existing list
    listDiv.innerHTML = '';
    
    // Add selected drinks to list
    let totalCount = 0;
    selectedDrinks.forEach(drink => {
        totalCount += drink.quantity;
        
        const drinkItem = document.createElement('div');
        drinkItem.className = 'selected-drink-item';
        drinkItem.innerHTML = `
            <i class="${drink.icon}"></i>
            <span>${drink.name}</span>
            <div class="selected-drink-quantity">${drink.quantity}</div>
        `;
        listDiv.appendChild(drinkItem);
    });
    
    totalCountSpan.textContent = totalCount;
}

function handleUserInfoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        department: formData.get('department')
    };
    
    // Store user data
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Update header with user info
    updateHeaderUserInfo(userData);
    
    // Show drink selection
    showCard('drink-selection');
}

function updateHeaderUserInfo(userData) {
    const userInfoElement = document.querySelector('.user-info');
    userInfoElement.innerHTML = `
        <i class="fas fa-user"></i>
        <span>${userData.name} - ${userData.department}</span>
    `;
}

async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');
        
        // Simple test query to check connection and API key
        const { data, error } = await supabase
            .from('drink_orders')
            .select('count(*)', { count: 'exact' })
            .limit(1);
        
        if (error) {
            console.error('Supabase connection test failed:', error);
            showToast(`Supabase bağlantı hatası: ${error.message}`, 'error');
            
            // Automatically switch to test mode if connection fails
            if (error.message.includes('Invalid API key') || error.message.includes('401')) {
                console.log('Switching to test mode due to API key error');
                showToast('API anahtarı geçersiz. Test moduna geçiliyor.', 'error');
            }
        } else {
            console.log('Supabase connection successful');
            showToast('Veritabanı bağlantısı başarılı', 'success');
        }
    } catch (error) {
        console.error('Supabase connection test error:', error);
        showToast('Bağlantı testi hatası: ' + error.message, 'error');
    }
}

function selectDrink(drinkElement) {
    // Remove previous selection
    document.querySelectorAll('.drink-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to clicked drink
    drinkElement.classList.add('selected');
    
    // Store selected drink
    selectedDrink = {
        name: drinkElement.dataset.drink,
        icon: drinkElement.querySelector('i').className,
        description: drinkElement.querySelector('p').textContent
    };
    
    // Update order summary
    updateOrderSummary();
    
    // Show confirmation card
    showCard('order-confirmation');
}

function updateOrderSummary() {
    if (!selectedDrinks || selectedDrinks.length === 0) return;
    
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    
    // Update user info
    document.getElementById('summary-user').innerHTML = `
        <strong>${userData.name}</strong>
        <span>${userData.department} Departmanı</span>
    `;
    
    // Update drinks list
    const drinksList = document.getElementById('summary-drinks-list');
    drinksList.innerHTML = '';
    
    let totalCount = 0;
    selectedDrinks.forEach(drink => {
        totalCount += drink.quantity;
        
        const drinkItem = document.createElement('div');
        drinkItem.className = 'summary-drink-item';
        drinkItem.innerHTML = `
            <div class="summary-drink-info">
                <i class="${drink.icon}"></i>
                <span>${drink.name}</span>
            </div>
            <div class="summary-drink-quantity">${drink.quantity}x</div>
        `;
        drinksList.appendChild(drinkItem);
    });
    
    // Update total
    document.getElementById('summary-total-count').textContent = `${totalCount} içecek`;
    
    // Update time
    const now = new Date();
    document.getElementById('summary-time').innerHTML = `
        <strong>Sipariş Zamanı</strong>
        <span>${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
    `;
}

async function confirmOrder() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    
    if (!userData.name || !userData.department || !selectedDrinks || selectedDrinks.length === 0) {
        showToast('Lütfen tüm bilgileri doldurun!', 'error');
        return;
    }
    
    showLoading('Siparişler gönderiliyor...');
    
    try {
        let useTestMode = TEST_MODE || !supabase;
        currentOrderIds = []; // Reset order IDs
        
        if (!TEST_MODE && supabase) {
            // Try real mode first - create separate order for each drink
            try {
                const orderPromises = [];
                
                selectedDrinks.forEach(drink => {
                    // Create multiple orders if quantity > 1
                    for (let i = 0; i < drink.quantity; i++) {
                        orderPromises.push(
                            supabase
                                .from('drink_orders')
                                .insert([
                                    {
                                        customer_name: userData.name,
                                        department: userData.department,
                                        drink_type: drink.name,
                                        status: 'new',
                                        created_at: new Date().toISOString()
                                    }
                                ])
                                .select()
                        );
                    }
                });
                
                const results = await Promise.all(orderPromises);
                
                // Check for errors
                const errors = results.filter(result => result.error);
                if (errors.length > 0) {
                    console.error('Supabase errors:', errors);
                    const firstError = errors[0].error;
                    
                    // Switch to test mode if API key is invalid
                    if (firstError.message.includes('Invalid API key') || 
                        firstError.message.includes('401') || 
                        firstError.message.includes('authentication')) {
                        console.log('API key error detected, switching to test mode');
                        showToast('API anahtarı sorunu. Test modunda devam ediliyor.', 'error');
                        useTestMode = true;
                    } else {
                        throw firstError;
                    }
                }
                
                if (!useTestMode) {
                    // Collect all order IDs
                    results.forEach(result => {
                        if (result.data && result.data.length > 0) {
                            currentOrderIds.push(result.data[0].id);
                        }
                    });
                    
                    // Show success card
                    hideLoading();
                    showCard('success');
                    
                    // Update success message
                    const successTitle = document.querySelector('.success-card h2');
                    const successText = document.querySelector('.success-card p');
                    if (successTitle) successTitle.textContent = 'Siparişleriniz Alındı! 🎉';
                    if (successText) {
                        const totalOrders = currentOrderIds.length;
                        successText.textContent = `${totalOrders} adet sipariş başarıyla oluşturuldu. Aşçı durumunu aşağıdan takip edebilirsiniz.`;
                    }
                    
                    // Start real status tracking
                    startStatusTracking();
                    
                    showToast(`${currentOrderIds.length} sipariş başarıyla oluşturuldu!`, 'success');
                    return;
                }
                
            } catch (realModeError) {
                console.error('Real mode failed:', realModeError);
                showToast('Veritabanı hatası. Test moduna geçiliyor.', 'error');
                useTestMode = true;
            }
        }
        
        if (useTestMode) {
            // Test mode - simulate successful orders
            console.log('TEST MODE: Simulating order creation');
            
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create mock order IDs
            let totalOrders = 0;
            selectedDrinks.forEach(drink => {
                for (let i = 0; i < drink.quantity; i++) {
                    currentOrderIds.push(Math.floor(Math.random() * 1000) + totalOrders);
                    totalOrders++;
                }
            });
            
            // Show success card
            hideLoading();
            showCard('success');
            
            // Update success message
            const successTitle = document.querySelector('.success-card h2');
            const successText = document.querySelector('.success-card p');
            if (successTitle) successTitle.textContent = 'Siparişleriniz Alındı! 🎉';
            if (successText) successText.textContent = 
                `${totalOrders} adet sipariş başarıyla oluşturuldu. Aşçı durumunu aşağıdan takip edebilirsiniz. (Test Modu)`;
            
            // Start test status tracking
            startTestStatusTracking();
            
            showToast(`${totalOrders} sipariş başarıyla oluşturuldu! (Test Modu)`, 'success');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error creating orders:', error);
        showToast('Siparişler oluşturulurken bir hata oluştu: ' + error.message, 'error');
    }
}

async function startStatusTracking() {
    if (!currentOrderId) return;
    
    // Update status immediately
    await updateOrderStatus();
    
    // Set up polling every 3 seconds
    statusCheckInterval = setInterval(updateOrderStatus, 3000);
}

async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    try {
        const { data, error } = await supabase
            .from('drink_orders')
            .select('status')
            .eq('id', currentOrderId)
            .single();
        
        if (error) throw error;
        
        if (data) {
            updateStatusUI(data.status);
            
            // If order is completed, stop polling
            if (data.status === 'hazirlandi') {
                clearInterval(statusCheckInterval);
                showToast('Siparişiniz hazır! ✨', 'success');
            }
        }
        
    } catch (error) {
        console.error('Error checking order status:', error);
    }
}

function startTestStatusTracking() {
    if (!currentOrderId) return;
    
    console.log('Starting test status tracking');
    
    // Simulate status progression
    let currentStatus = 0;
    const statuses = ['new', 'alindi', 'hazirlandi'];
    
    // Update status immediately
    updateStatusUI(statuses[currentStatus]);
    
    // Set up test progression every 5 seconds
    statusCheckInterval = setInterval(() => {
        currentStatus++;
        if (currentStatus < statuses.length) {
            updateStatusUI(statuses[currentStatus]);
            showToast(`Durum güncellendi: ${statuses[currentStatus]}`, 'success');
            
            if (currentStatus === statuses.length - 1) {
                clearInterval(statusCheckInterval);
                showToast('Siparişiniz hazır! ✨ (Test Modu)', 'success');
            }
        }
    }, 5000);
}

function updateStatusUI(status) {
    const statusItems = document.querySelectorAll('.status-item');
    
    // Reset all status items
    statusItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Activate current and previous statuses
    switch (status) {
        case 'new':
            const statusNew = document.getElementById('status-new');
            if (statusNew) statusNew.classList.add('active');
            break;
        case 'alindi':
            const statusNew2 = document.getElementById('status-new');
            const statusAlindi = document.getElementById('status-alindi');
            if (statusNew2) statusNew2.classList.add('active');
            if (statusAlindi) statusAlindi.classList.add('active');
            break;
        case 'hazirlandi':
            const statusNew3 = document.getElementById('status-new');
            const statusAlindi2 = document.getElementById('status-alindi');
            const statusHazirlandi = document.getElementById('status-hazirlandi');
            if (statusNew3) statusNew3.classList.add('active');
            if (statusAlindi2) statusAlindi2.classList.add('active');
            if (statusHazirlandi) statusHazirlandi.classList.add('active');
            break;
    }
}

function showCard(cardName) {
    try {
        // Hide all cards
        const cards = ['user-info-card', 'drink-selection-card', 'order-confirmation-card', 'success-card'];
        cards.forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                card.style.display = 'none';
            }
        });
        
        // Show selected card
        const targetCard = document.getElementById(cardName + '-card');
        if (targetCard) {
            targetCard.style.display = 'block';
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.error('Card not found:', cardName + '-card');
        }
    } catch (error) {
        console.error('Error showing card:', error);
    }
}

function showLoading(message = 'Yükleniyor...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        const loadingText = loadingOverlay.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

function resetApp() {
    // Clear selections
    selectedDrinks = [];
    currentOrderIds = [];
    
    // Clear status interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
    
    // Reset form
    const userForm = document.getElementById('user-form');
    if (userForm) userForm.reset();
    
    // Reset drink selections
    document.querySelectorAll('.drink-option').forEach(option => {
        option.classList.remove('selected');
        const quantityControls = option.querySelector('.quantity-controls');
        if (quantityControls) {
            quantityControls.style.display = 'none';
        }
        const quantitySpan = option.querySelector('.quantity');
        if (quantitySpan) {
            quantitySpan.textContent = '1';
        }
    });
    
    // Reset summary
    const summaryDiv = document.getElementById('selected-drinks-summary');
    const continueBtn = document.getElementById('continue-to-confirmation');
    if (summaryDiv) summaryDiv.style.display = 'none';
    if (continueBtn) continueBtn.style.display = 'none';
    
    // Reset header user info
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <i class="fas fa-user-clock"></i>
            <span>Giriş yapın</span>
        `;
    }
    
    console.log('App reset completed');
}

// Real-time updates using Supabase subscriptions (optional enhancement)
function setupRealtimeUpdates() {
    if (!currentOrderId) return;
    
    const subscription = supabase
        .channel('order-updates')
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'drink_orders',
                filter: `id=eq.${currentOrderId}`
            }, 
            (payload) => {
                console.log('Real-time update received:', payload);
                if (payload.new && payload.new.status) {
                    updateStatusUI(payload.new.status);
                    
                    if (payload.new.status === 'hazirlandi') {
                        showToast('Siparişiniz hazır! ✨', 'success');
                        clearInterval(statusCheckInterval);
                    } else if (payload.new.status === 'alindi') {
                        showToast('Siparişiniz aşçı tarafından alındı! 👨‍🍳', 'success');
                    }
                }
            }
        )
        .subscribe();
    
    // Store subscription for cleanup
    window.orderSubscription = subscription;
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    if (window.orderSubscription) {
        supabase.removeChannel(window.orderSubscription);
    }
});

// Error handling for network issues
window.addEventListener('online', function() {
    showToast('Bağlantı yeniden kuruldu', 'success');
    if (currentOrderId && !statusCheckInterval) {
        startStatusTracking();
    }
});

window.addEventListener('offline', function() {
    showToast('İnternet bağlantısı kesildi', 'error');
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
});