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
let currentOrderGroupId = null;
let statusCheckInterval = null;
let orderStatusChannel = null;
let lastKnownGroupStatus = null;

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
    
    try {
        // Initialize DOM elements
        userInfoCard = document.getElementById('user-info-card');
        drinkSelectionCard = document.getElementById('drink-selection-card');
        orderConfirmationCard = document.getElementById('order-confirmation-card');
        successCard = document.getElementById('success-card');
        loadingOverlay = document.getElementById('loading-overlay');
        
        safeLog(`DOM Elements found - Cards: ${!!userInfoCard}, ${!!drinkSelectionCard}, ${!!orderConfirmationCard}, ${!!successCard}`);

        const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        if (storedUserData.name && storedUserData.department) {
            const userForm = document.getElementById('user-form');
            if (userForm) {
                const nameInput = userForm.querySelector('#name');
                const departmentInput = userForm.querySelector('#department');
                if (nameInput) nameInput.value = storedUserData.name;
                if (departmentInput) departmentInput.value = storedUserData.department;
            }

            const userInfo = document.querySelector('.user-info');
            if (userInfo) {
                userInfo.innerHTML = `<i class="fas fa-user"></i><span>${storedUserData.name} - ${storedUserData.department}</span>`;
            }
        }

        // Wait for Supabase then initialize
        setTimeout(() => {
            try {
                if (typeof window.supabase !== 'undefined') {
                    supabase = initializeSupabase();
                }
                setupEventListeners();
                initializeDrinkOptions();
                setupQuantityControls();
                safeLog('✅ PRODUCTION initialization complete');
            } catch (error) {
                safeLog('❌ Setup error: ' + error.message, 'error');
            }
        }, 2000);
        
    } catch (error) {
        safeLog('❌ DOM initialization error: ' + error.message, 'error');
    }
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
        const orderGroupId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        currentOrderGroupId = orderGroupId;
        lastKnownGroupStatus = 'new';
        
        // Create one order row per selected drink type, with quantity
        const ordersToInsert = selectedDrinks.map(drink => ({
            customer_name: userData.name,
            department: userData.department,
            drink_type: drink.name,
            quantity: drink.quantity,
            status: 'new',
            created_at: new Date().toISOString(),
            order_group_id: orderGroupId
        }));

        const { data, error } = await supabase
            .from('drink_orders')
            .insert(ordersToInsert)
            .select();

        if (error) throw error;

        if (data) {
            currentOrderIds = data.map(d => d.id);
            safeLog(`✅ PRODUCTION Order IDs: ${currentOrderIds.join(', ')}`);
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
        
        setStatusIndicators('new');
        showToast(`🔥 PRODUCTION: ${currentOrderIds.length} orders in database!`, 'success');
        startOrderStatusListener(orderGroupId);
        
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

    const continueToConfirmationBtn = document.getElementById('continue-to-confirmation');
    if (continueToConfirmationBtn) {
        continueToConfirmationBtn.addEventListener('click', () => {
            const totalSelected = selectedDrinks.reduce((total, drink) => total + (drink.quantity || 0), 0);
            if (totalSelected === 0) {
                showToast('Lütfen en az bir içecek seçin!', 'error');
                return;
            }
            updateConfirmationSummary();
            setStatusIndicators('new');
            showCard('order-confirmation');
        });
    }

    const backToUserInfoBtn = document.getElementById('back-to-user-info');
    if (backToUserInfoBtn) {
        backToUserInfoBtn.addEventListener('click', () => {
            initializeDrinkOptions();
            showCard('user-info');
        });
    }

    const backToDrinksBtn = document.getElementById('back-to-drinks');
    if (backToDrinksBtn) {
        backToDrinksBtn.addEventListener('click', () => {
            showCard('drink-selection');
        });
    }

    const placeNewOrderBtn = document.getElementById('place-new-order');
    if (placeNewOrderBtn) {
        placeNewOrderBtn.addEventListener('click', () => {
            resetOrderFlow({ preserveUser: true });
        });
    }

    const placeNewOrderConfirmationBtn = document.getElementById('place-new-order-confirmation');
    if (placeNewOrderConfirmationBtn) {
        placeNewOrderConfirmationBtn.addEventListener('click', () => {
            resetOrderFlow({ preserveUser: true });
        });
    }
}

function setupQuantityControls() {
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    safeLog(`🔥 Found ${quantityButtons.length} quantity buttons`);

    quantityButtons.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            const drinkOption = btn.closest('.drink-option');
            if (!drinkOption) {
                safeLog(`❌ No drink option found for button ${index}`);
                return;
            }

            const drinkName = drinkOption.dataset.drink;
            const isPlus = btn.classList.contains('plus');

            safeLog(`🔥 Quantity button clicked: ${isPlus ? 'plus' : 'minus'} for ${drinkName}`);

            const quantityDisplay = drinkOption.querySelector('.quantity-display');
            if (!quantityDisplay) {
                safeLog(`❌ No quantity display found for ${drinkName}`);
                return;
            }

            let currentQuantity = parseInt(quantityDisplay.textContent) || 0;

            if (isPlus) {
                currentQuantity++;
            } else if (currentQuantity > 0) {
                currentQuantity--;
            }

            quantityDisplay.textContent = currentQuantity;
            safeLog(`Current quantity for ${drinkName}: ${currentQuantity}`);

            if (currentQuantity > 0) {
                drinkOption.classList.add('selected');
            } else {
                drinkOption.classList.remove('selected');
            }

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

    const quantityDisplay = option.querySelector('.quantity-display');
    if (!quantityDisplay) {
        safeLog(`❌ No quantity display found for ${drinkName}`);
        return;
    }

    const currentQuantity = parseInt(quantityDisplay.textContent) || 0;
    const isSelected = option.classList.contains('selected');
    const newQuantity = isSelected && currentQuantity > 0 ? 0 : Math.max(currentQuantity, 1);

    quantityDisplay.textContent = newQuantity;

    if (newQuantity > 0) {
        option.classList.add('selected');
    } else {
        option.classList.remove('selected');
    }

    updateSelectedDrink(drinkName, newQuantity);
}

function updateDrinkSummary() {
    const summaryContainer = document.getElementById('selected-drinks-summary');
    const listElement = document.getElementById('selected-drinks-list');
    const totalElement = document.getElementById('total-count');
    const continueButton = document.getElementById('continue-to-confirmation');

    if (!summaryContainer || !listElement || !totalElement) {
        safeLog('❌ Drink summary elements not found');
        return;
    }

    listElement.innerHTML = '';

    if (selectedDrinks.length === 0) {
        summaryContainer.style.display = 'none';
        totalElement.textContent = '0';
        if (continueButton) {
            continueButton.style.display = 'none';
        }
        return;
    }

    const fragment = document.createDocumentFragment();
    let totalCount = 0;

    selectedDrinks.forEach((drink) => {
        if (!drink.quantity) {
            return;
        }
        totalCount += drink.quantity;

        const item = document.createElement('div');
        item.className = 'selected-drink-item';
        item.innerHTML = `<span>${drink.name}</span><span>x${drink.quantity}</span>`;
        fragment.appendChild(item);
    });

    if (totalCount === 0) {
        summaryContainer.style.display = 'none';
        totalElement.textContent = '0';
        if (continueButton) {
            continueButton.style.display = 'none';
        }
        return;
    }

    totalElement.textContent = `${totalCount}`;
    summaryContainer.style.display = 'block';
    listElement.appendChild(fragment);

    if (continueButton) {
        continueButton.style.display = 'inline-flex';
    }
}

function handleUserInfoSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const name = (formData.get('name') || '').toString().trim();
    const department = (formData.get('department') || '').toString().trim();

    if (!name || !department) {
        showToast('Lütfen isim ve departman bilgilerini girin!', 'error');
        return;
    }

    const userData = { name, department };

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
        const loadingText = loadingOverlay.querySelector('.loading-text') || loadingOverlay.querySelector('.loading-spinner p');
        if (loadingText) loadingText.textContent = message;
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    console.log(`🍞 showToast called: "${message}" (${type})`);
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found!');
        alert(`[${type.toUpperCase()}] ${message}`); // Fallback
        return;
    }

    console.log('🍞 Toast container found, creating toast element');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-times-circle' : 'fas fa-info-circle';
    toast.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
    
    toastContainer.appendChild(toast);
    console.log('🍞 Toast added to container');

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
        console.log('🍞 Toast show class added');
    }, 100);

    // Animate out and remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                console.log('🍞 Toast removed from DOM');
            }
        });
    }, 5000);
}

function initializeDrinkOptions() {
    const drinkOptions = document.querySelectorAll('.drink-option');
    drinkOptions.forEach((option) => {
        option.classList.remove('selected');
        const quantityDisplay = option.querySelector('.quantity-display');
        if (quantityDisplay) {
            quantityDisplay.textContent = '0';
        }
    });

    selectedDrinks = [];
    updateDrinkSummary();
    setStatusIndicators('new');
}

function updateConfirmationSummary() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const summaryUser = document.getElementById('summary-user');
    const summaryDrinksList = document.getElementById('summary-drinks-list');
    const summaryTotalCount = document.getElementById('summary-total-count');
    const summaryTime = document.getElementById('summary-time');

    if (summaryUser) {
        const userSpan = summaryUser.querySelector('span');
        if (userSpan) {
            userSpan.textContent = userData.name && userData.department ? `${userData.name} - ${userData.department}` : '-';
        }
    }

    if (summaryDrinksList) {
        summaryDrinksList.innerHTML = '';

        if (selectedDrinks.length === 0) {
            summaryDrinksList.textContent = '-';
        } else {
            selectedDrinks.forEach((drink) => {
                if (!drink.quantity) {
                    return;
                }
                const item = document.createElement('div');
                item.className = 'summary-drink-item';
                item.innerHTML = `<span>${drink.name}</span><span>x${drink.quantity}</span>`;
                summaryDrinksList.appendChild(item);
            });
        }
    }

    if (summaryTotalCount) {
        const totalCount = selectedDrinks.reduce((total, drink) => total + (drink.quantity || 0), 0);
        summaryTotalCount.textContent = `${totalCount} içecek`;
    }

    if (summaryTime) {
        const timeSpan = summaryTime.querySelector('span');
        if (timeSpan) {
            const now = new Date();
            timeSpan.textContent = now.toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}

function resetOrderFlow({ preserveUser = false } = {}) {
    initializeDrinkOptions();
    currentOrderIds = [];
    currentOrderGroupId = null;
    stopOrderStatusListener();
    lastKnownGroupStatus = null;

    const successTitle = document.querySelector('.success-card h2');
    const successText = document.querySelector('.success-card p');
    if (successTitle) {
        successTitle.textContent = 'Sipariş Başarıyla Gönderildi!';
    }
    if (successText) {
        successText.textContent = 'Siparişiniz mutfağa iletildi. Hazır olduğunda bilgilendirileceksiniz.';
    }

    if (!preserveUser) {
        sessionStorage.removeItem('userData');
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.reset();
        }
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.innerHTML = '<i class="fas fa-user-clock"></i><span>Giriş yapın</span>';
        }
        showCard('user-info');
    } else {
        showCard('drink-selection');
    }
}

function setStatusIndicators(status = 'new') {
    const groups = [
        ['status-new', 'status-alindi', 'status-hazirlandi'],
        ['status-new-confirmation', 'status-alindi-confirmation', 'status-hazirlandi-confirmation']
    ];
    const order = ['new', 'alindi', 'hazirlandi'];
    const targetIndex = order.indexOf(status);

    groups.forEach((group) => {
        group.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('active');
            }
        });
        const indexToActivate = targetIndex >= 0 ? targetIndex : 0;
        for (let i = 0; i <= indexToActivate; i++) {
            const el = document.getElementById(group[i]);
            if (el) {
                el.classList.add('active');
            }
        }
    });

    const statusTextConfirmation = document.getElementById('status-text-confirmation');
    if (statusTextConfirmation) {
        const messages = {
            new: 'Sipariş alındı, hazırlanıyor...',
            alindi: 'Sipariş mutfak tarafından onaylandı.',
            hazirlandi: 'Sipariş hazırlandı, teslim ediliyor.'
        };
        statusTextConfirmation.textContent = messages[status] || messages.new;
    }
}

const STATUS_PRIORITY = {
    new: 0,
    alindi: 1,
    hazirlandi: 2,
    teslim_edildi: 3,
    iptal: -1
};

function stopOrderStatusListener() {
    if (orderStatusChannel && typeof orderStatusChannel.unsubscribe === 'function') {
        orderStatusChannel.unsubscribe();
    }
    orderStatusChannel = null;
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

async function refreshGroupStatus(orderGroupId) {
    if (!orderGroupId) {
      return;
    }

    if (!supabase) {
        supabase = initializeSupabase();
    }

    if (!supabase) {
        safeLog('❌ Unable to refresh status: Supabase not initialized', 'error');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('drink_orders')
            .select('status')
            .eq('order_group_id', orderGroupId);

        if (error) {
            safeLog('❌ Status refresh error: ' + error.message, 'error');
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            safeLog('ℹ️ No orders found for group ' + orderGroupId);
            return;
        }

        let highestStatus = 'new';
        data.forEach(({ status }) => {
            if (STATUS_PRIORITY[status] > STATUS_PRIORITY[highestStatus]) {
                highestStatus = status;
            }
        });

        safeLog(`🔄 Group ${orderGroupId} status -> ${highestStatus}`);
        setStatusIndicators(highestStatus);

        if (highestStatus !== lastKnownGroupStatus) {
            safeLog(`🎯 Status changed from "${lastKnownGroupStatus}" to "${highestStatus}"`);
            lastKnownGroupStatus = highestStatus;
            
            // Show toast notification when status changes to 'alindi'
            if (highestStatus === 'alindi') {
                safeLog('🎉 Triggering success toast for "alindi" status');
                showToast('Siparişiniz hazırlandı! Afiyet olsun!', 'success');
            }
            
            const statusMessages = {
                new: 'Siparişiniz mutfak kuyruğuna alındı. Lütfen bekleyiniz.',
                alindi: 'Mutfak siparişinizi hazırlamaya başladı.',
                hazirlandi: 'Siparişiniz hazır! Teslim için bekleyiniz.',
                teslim_edildi: 'Siparişiniz teslim edildi. Afiyet olsun!',
                iptal: 'Siparişiniz iptal edildi. Detaylar için mutfakla görüşün.'
            };
            const successText = document.querySelector('.success-card p');
            if (successText) {
                successText.textContent = statusMessages[highestStatus] || statusMessages.new;
            }
        }
    } catch (err) {
        safeLog('❌ Unexpected status refresh error: ' + err.message, 'error');
    }
}

function startOrderStatusListener(orderGroupId) {
    stopOrderStatusListener();

    if (!orderGroupId) {
        safeLog('⚠️ No order group id provided for status monitor');
        return;
    }

    if (!supabase) {
        supabase = initializeSupabase();
    }

    if (!supabase) {
        safeLog('❌ Cannot start status listener: Supabase unavailable', 'error');
        return;
    }

    safeLog(`📡 Starting realtime listener for group ${orderGroupId}`);

    orderStatusChannel = supabase
        .channel(`order-status-${orderGroupId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'drink_orders',
            filter: `order_group_id=eq.${orderGroupId}`
        }, (payload) => {
            const newStatus = payload?.new?.status || payload?.old?.status || 'unknown';
            safeLog(`📨 Realtime status update (${orderGroupId}): ${newStatus}`);
            refreshGroupStatus(orderGroupId);
        });

    if (orderStatusChannel && typeof orderStatusChannel.subscribe === 'function') {
        orderStatusChannel.subscribe((status) => {
            safeLog(`🔔 Subscription state for ${orderGroupId}: ${status}`);
            if (status === 'SUBSCRIBED') {
                refreshGroupStatus(orderGroupId);
            }
        });
    } else {
        safeLog('⚠️ Supabase channel subscribe API unavailable; falling back to polling');
        refreshGroupStatus(orderGroupId);
        clearInterval(statusCheckInterval);
        statusCheckInterval = setInterval(() => refreshGroupStatus(orderGroupId), 5000);
    }
}