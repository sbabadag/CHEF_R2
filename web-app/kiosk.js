// AVM Grup Kitchen Kiosk System - Latest Order Display
// Supabase Configuration
const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

// Configuration
const REFRESH_INTERVAL = 30000; // 30 seconds
const TEST_MODE = false; // Set to true for offline testing
const DEBUG_MODE = true; // Set to true for detailed logging

// Global variables
let supabase = null;
let supabaseInitialized = false;
let refreshTimer = null;
let countdownTimer = null;
let currentCountdown = 30;
let lastOrderData = null;

// Safe logging function
const log = (message, type = 'log', force = false) => {
    if (DEBUG_MODE || force) {
        try {
            console[type](`[Kiosk] ${message}`);
        } catch (e) {
            // Fallback for environments where console is restricted
        }
    }
};

// Initialize Supabase client
async function initializeSupabase() {
    if (supabaseInitialized && supabase) return supabase;
    
    try {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
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

// Show error toast
function showError(message, duration = 5000) {
    log(`Error: ${message}`, 'error');
    
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    
    if (errorToast && errorMessage) {
        errorMessage.textContent = message;
        errorToast.style.display = 'block';
        
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, duration);
    }
}

// Update current time display
function updateCurrentTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        timeElement.textContent = timeString;
    }
}

// Update last update time
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        lastUpdateElement.textContent = timeString;
    }
}

// Start countdown timer
function startCountdownTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    currentCountdown = 30;
    const countdownElement = document.getElementById('refresh-countdown');
    
    countdownTimer = setInterval(() => {
        currentCountdown--;
        if (countdownElement) {
            countdownElement.textContent = currentCountdown;
        }
        
        if (currentCountdown <= 0) {
            clearInterval(countdownTimer);
            fetchLatestOrder();
        }
    }, 1000);
}

// Fetch latest order from database
async function fetchLatestOrder() {
    try {
        log('Fetching latest order...');
        
        if (!TEST_MODE && !supabase) {
            await initializeSupabase();
        }
        
        if (TEST_MODE) {
            return await simulateLatestOrder();
        }
        
        // Fetch the latest order with all details
        const { data, error } = await supabase
            .from('drink_orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Get latest 50 to group by order_group_id
        
        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            log('No orders found');
            displayNoOrders();
            return;
        }
        
        // Group orders by order_group_id to get the complete latest order
        const latestOrderGroupId = data[0].order_group_id;
        const latestOrderItems = data.filter(order => order.order_group_id === latestOrderGroupId);
        
        log(`Found latest order group: ${latestOrderGroupId} with ${latestOrderItems.length} items`);
        
        displayLatestOrder(latestOrderItems);
        updateLastUpdateTime();
        
    } catch (error) {
        log(`Failed to fetch latest order: ${error.message}`, 'error');
        showError(`Veri yüklenemedi: ${error.message}`);
    } finally {
        startCountdownTimer();
    }
}

// Simulate latest order for test mode
async function simulateLatestOrder() {
    log('Simulating latest order (TEST MODE)');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate fake order data
    const fakeOrders = [
        {
            id: 1,
            customer_name: 'Ahmet Yılmaz',
            department: 'IT Departmanı',
            drink_type: 'Kahve',
            quantity: 2,
            status: 'new',
            created_at: new Date().toISOString(),
            order_group_id: 'test-group-001'
        },
        {
            id: 2,
            customer_name: 'Ahmet Yılmaz',
            department: 'IT Departmanı',
            drink_type: 'Çay',
            quantity: 1,
            status: 'new',
            created_at: new Date().toISOString(),
            order_group_id: 'test-group-001'
        },
        {
            id: 3,
            customer_name: 'Ahmet Yılmaz',
            department: 'IT Departmanı',
            drink_type: 'Su',
            quantity: 3,
            status: 'new',
            created_at: new Date().toISOString(),
            order_group_id: 'test-group-001'
        }
    ];
    
    displayLatestOrder(fakeOrders);
    updateLastUpdateTime();
}

// Display no orders state
function displayNoOrders() {
    log('Displaying no orders state');
    
    const loadingState = document.getElementById('loading-state');
    const noOrdersState = document.getElementById('no-orders-state');
    const orderDisplay = document.getElementById('order-display');
    
    if (loadingState) loadingState.style.display = 'none';
    if (orderDisplay) orderDisplay.style.display = 'none';
    if (noOrdersState) {
        noOrdersState.style.display = 'block';
        noOrdersState.classList.add('fade-in');
    }
}

// Display latest order
function displayLatestOrder(orderItems) {
    log('Displaying latest order with', orderItems.length, 'items');
    
    if (!orderItems || orderItems.length === 0) {
        displayNoOrders();
        return;
    }
    
    // Get first order for customer info (all items have same customer info)
    const firstOrder = orderItems[0];
    
    // Hide loading and no-orders states
    const loadingState = document.getElementById('loading-state');
    const noOrdersState = document.getElementById('no-orders-state');
    const orderDisplay = document.getElementById('order-display');
    
    if (loadingState) loadingState.style.display = 'none';
    if (noOrdersState) noOrdersState.style.display = 'none';
    if (orderDisplay) {
        orderDisplay.style.display = 'grid';
        orderDisplay.classList.add('fade-in');
    }
    
    // Update customer information
    const customerName = document.getElementById('customer-name');
    const customerDepartment = document.getElementById('customer-department');
    
    if (customerName) {
        customerName.textContent = firstOrder.customer_name || 'İsim Belirtilmemiş';
    }
    
    if (customerDepartment) {
        customerDepartment.textContent = firstOrder.department || 'Departman Belirtilmemiş';
    }
    
    // Update drinks list
    const drinksList = document.getElementById('drinks-list');
    if (drinksList) {
        // Group drinks by type and sum quantities
        const drinkGroups = {};
        orderItems.forEach(item => {
            const drinkType = item.drink_type || 'Bilinmeyen İçecek';
            if (drinkGroups[drinkType]) {
                drinkGroups[drinkType] += item.quantity || 1;
            } else {
                drinkGroups[drinkType] = item.quantity || 1;
            }
        });
        
        // Create drink items HTML
        const drinksHTML = Object.entries(drinkGroups).map(([drinkType, quantity]) => `
            <div class="drink-item slide-up">
                <span class="drink-name">${drinkType}</span>
                <span class="drink-quantity">${quantity}</span>
            </div>
        `).join('');
        
        drinksList.innerHTML = drinksHTML;
    }
    
    // Update status
    updateOrderStatus(firstOrder.status || 'new');
    
    // Update timestamp
    const timestampText = document.getElementById('timestamp-text');
    if (timestampText && firstOrder.created_at) {
        const orderDate = new Date(firstOrder.created_at);
        const dateString = orderDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeString = orderDate.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        timestampText.textContent = `${dateString} ${timeString}`;
    }
    
    // Store current order data
    lastOrderData = orderItems;
    
    log('Latest order displayed successfully');
}

// Update order status display
function updateOrderStatus(status) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    if (!statusIndicator || !statusIcon || !statusText) return;
    
    // Remove all status classes
    statusIndicator.classList.remove('status-new', 'status-alindi', 'status-hazirlandi');
    
    let iconClass, statusTextContent;
    
    switch (status) {
        case 'new':
            statusIndicator.classList.add('status-new');
            iconClass = 'fas fa-paper-plane';
            statusTextContent = 'YENİ SİPARİŞ';
            break;
        case 'alindi':
            statusIndicator.classList.add('status-alindi');
            iconClass = 'fas fa-eye';
            statusTextContent = 'SİPARİŞ ALINDI';
            break;
        case 'hazirlandi':
            statusIndicator.classList.add('status-hazirlandi');
            iconClass = 'fas fa-check-circle';
            statusTextContent = 'HAZIRLANDI';
            break;
        default:
            statusIndicator.classList.add('status-new');
            iconClass = 'fas fa-clock';
            statusTextContent = 'BEKLEMEDE';
    }
    
    statusIcon.className = `${iconClass} status-icon`;
    statusText.textContent = statusTextContent;
}

// Start automatic refresh
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        fetchLatestOrder();
    }, REFRESH_INTERVAL);
    
    log(`Auto-refresh started (${REFRESH_INTERVAL / 1000}s interval)`);
}

// Stop automatic refresh
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    
    log('Auto-refresh stopped');
}

// Initialize kiosk application
async function initializeKiosk() {
    log('🖥️ Initializing Kiosk Display System...', 'log', true);
    
    try {
        // Initialize Supabase unless in test mode
        if (!TEST_MODE) {
            try {
                await initializeSupabase();
                log('✅ Supabase ready for kiosk', 'log', true);
            } catch (error) {
                log('⚠️ Supabase failed, enabling test mode', 'warn', true);
                showError('Veritabanı bağlantısı kurulamadı, test modunda çalışıyor', 3000);
            }
        }
        
        // Start time updates
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
        
        // Load initial data
        await fetchLatestOrder();
        
        // Start auto-refresh
        startAutoRefresh();
        
        const mode = TEST_MODE ? 'Test Mode' : 'Production';
        log(`✅ Kiosk initialized successfully (${mode})`, 'log', true);
        
        // Handle visibility change to pause/resume when tab is hidden/visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                log('Kiosk hidden, pausing refresh');
                stopAutoRefresh();
            } else {
                log('Kiosk visible, resuming refresh');
                fetchLatestOrder();
                startAutoRefresh();
            }
        });
        
    } catch (error) {
        log(`❌ Kiosk initialization failed: ${error.message}`, 'error', true);
        showError(`Sistem başlatılamadı: ${error.message}`, 10000);
    }
}

// Handle window before unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// Handle errors gracefully
window.addEventListener('error', (event) => {
    log(`Uncaught error: ${event.error?.message || event.message}`, 'error', true);
    showError('Sistem hatası oluştu', 5000);
});

window.addEventListener('unhandledrejection', (event) => {
    log(`Unhandled promise rejection: ${event.reason?.message || event.reason}`, 'error', true);
    showError('Veri yükleme hatası', 5000);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeKiosk);

// Make functions globally available for debugging
window.kioskDebug = {
    fetchLatestOrder,
    displayLatestOrder,
    displayNoOrders,
    updateOrderStatus,
    startAutoRefresh,
    stopAutoRefresh,
    TEST_MODE
};

log('Kiosk script loaded successfully', 'log', true);