// Supabase Configuration
const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMjc2ODIsImV4cCI6MjA0NzYwMzY4Mn0.7bJdXy9VLnEiRJq-3F7W_bNEUEFBJ3qJ5YvIgSUIMLg';

// Test mode - set to true for offline testing
const TEST_MODE = false;

// Initialize Supabase client
let supabase = null;

// Initialize when Supabase library is loaded
if (typeof window.supabase !== 'undefined') {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
    } catch (error) {
        console.error('Error initializing Supabase:', error);
    }
} else {
    console.warn('Supabase library not yet loaded - will retry on DOM ready');
}

// Global variables
let selectedDrink = null;
let currentOrderId = null;
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
    try {
        // Initialize Supabase if not already done
        if (!supabase && typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized on DOM ready');
        }
        
        // Check if Supabase is available
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded');
            showToast('Sistem yüklenirken hata oluştu. Sayfayı yenileyin.', 'error');
            return;
        }
        
        // Test Supabase connection
        if (!supabase) {
            console.error('Supabase client not initialized');
            showToast('Veritabanı bağlantısı kurulamadı.', 'error');
            return;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Show initial card
        showCard('user-info');
        
        console.log('Tea Order App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');
    }
}

function setupEventListeners() {
    // User info form submit
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserInfoSubmit);
    }
    
    // Drink selection
    const drinkOptions = document.querySelectorAll('.drink-option');
    drinkOptions.forEach(option => {
        option.addEventListener('click', () => selectDrink(option));
    });
    
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
    if (!selectedDrink) return;
    
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    
    document.getElementById('summary-user').innerHTML = `
        <strong>${userData.name}</strong>
        <span>${userData.department} Departmanı</span>
    `;
    
    document.getElementById('summary-drink').innerHTML = `
        <strong>${selectedDrink.name}</strong>
        <span>${selectedDrink.description}</span>
    `;
    
    const now = new Date();
    document.getElementById('summary-time').innerHTML = `
        <strong>Sipariş Zamanı</strong>
        <span>${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
    `;
}

async function confirmOrder() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    
    if (!userData.name || !userData.department || !selectedDrink) {
        showToast('Lütfen tüm bilgileri doldurun!', 'error');
        return;
    }
    
    showLoading('Sipariş gönderiliyor...');
    
    try {
        if (TEST_MODE || !supabase) {
            // Test mode - simulate successful order
            console.log('TEST MODE: Simulating order creation');
            
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            currentOrderId = Math.floor(Math.random() * 1000);
            
            // Show success card
            hideLoading();
            showCard('success');
            
            // Update success message
            const successTitle = document.querySelector('.success-card h2');
            const successText = document.querySelector('.success-card p');
            if (successTitle) successTitle.textContent = 'Siparişiniz Alındı! 🎉';
            if (successText) successText.textContent = 
                `${selectedDrink.name} siparişiniz başarıyla oluşturuldu. Aşçı durumunu aşağıdan takip edebilirsiniz.`;
            
            // Start test status tracking
            startTestStatusTracking();
            
            showToast('Sipariş başarıyla oluşturuldu! (Test Modu)', 'success');
            
        } else {
            // Real mode - connect to Supabase
            const { data, error } = await supabase
                .from('drink_orders')
                .insert([
                    {
                        customer_name: userData.name,
                        department: userData.department,
                        drink_type: selectedDrink.name,
                        status: 'new',
                        created_at: new Date().toISOString()
                    }
                ])
                .select();
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                currentOrderId = data[0].id;
                
                // Show success card
                hideLoading();
                showCard('success');
                
                // Update success message
                const successTitle = document.querySelector('.success-card h2');
                const successText = document.querySelector('.success-card p');
                if (successTitle) successTitle.textContent = 'Siparişiniz Alındı! 🎉';
                if (successText) successText.textContent = 
                    `${selectedDrink.name} siparişiniz başarıyla oluşturuldu. Aşçı durumunu aşağıdan takip edebilirsiniz.`;
                
                // Start real status tracking
                startStatusTracking();
                
                showToast('Sipariş başarıyla oluşturuldu!', 'success');
            }
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error creating order:', error);
        showToast('Sipariş oluşturulurken bir hata oluştu: ' + error.message, 'error');
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
    selectedDrink = null;
    currentOrderId = null;
    
    // Clear status interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
    
    // Reset form
    document.getElementById('user-form').reset();
    
    // Reset drink selections
    document.querySelectorAll('.drink-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Reset header user info
    document.querySelector('.user-info').innerHTML = `
        <i class="fas fa-user-clock"></i>
        <span>Giriş yapın</span>
    `;
    
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