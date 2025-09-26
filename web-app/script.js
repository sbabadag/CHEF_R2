// AVM Grup Kitchen Order System - Clean Version with Quantity Controls// Supabase Configuration

// Supabase Configurationconst SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';

const SUPABASE_URL = 'https://cfapmolnnvemqjneaher.supabase.co';const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYXBtb2xubnZlbXFqbmVhaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTQ3MDcsImV4cCI6MjA3NDI5MDcwN30._TJlyjzcf4oyfa6JHEXZUkeZCThMFR-aX8pfzE3fm5c';

// Test mode - set to false for production, true for offline testing

// Configurationconst TEST_MODE = false;

const TEST_MODE = false;

const DEBUG_MODE = true;// Initialize Supabase client

let supabase = null;

// Global variableslet supabaseInitialized = false;

let supabase = null;

let supabaseInitialized = false;// Safe console logging

let selectedDrinks = [];const safeLog = (message, type = 'log') => {

let currentOrderIds = [];    try {

let statusCheckInterval = null;        console[type](message);

let previousOrderStatus = {};    } catch (e) {

let orderStatusData = {};        // Fallback if console is not available

    }

// Safe logging function};

const log = (message, type = 'log', force = false) => {

    if (DEBUG_MODE || force) {// Initialize Supabase with error handling

        try {function initializeSupabase() {

            console[type](`[AVM Kitchen] ${message}`);    if (supabaseInitialized) return supabase;

        } catch (e) {    

            // Fallback for environments where console is restricted    try {

        }        if (typeof window.supabase !== 'undefined') {

    }            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

};            supabaseInitialized = true;

            safeLog('✅ Supabase client initialized successfully');

// Show toast notifications            return supabase;

function showToast(message, type = 'info', duration = 4000) {        } else {

    log(`Toast: ${message} (${type})`, 'info');            safeLog('⚠️ Supabase library not yet loaded');

                return null;

    const existingToasts = document.querySelectorAll('.toast');        }

    existingToasts.forEach(toast => toast.remove());    } catch (error) {

            safeLog('❌ Error initializing Supabase: ' + error.message, 'error');

    const toast = document.createElement('div');        return null;

    toast.className = `toast toast-${type}`;    }

    toast.innerHTML = `}

        <div class="toast-content">

            <span class="toast-icon">${getToastIcon(type)}</span>// Global variables

            <span class="toast-message">${message}</span>let selectedDrinks = []; // Birden fazla içecek için array

        </div>let currentOrderIds = []; // Birden fazla sipariş ID'si

    `;let statusCheckInterval = null;

    

    document.body.appendChild(toast);// DOM Elements

    const userInfoCard = document.getElementById('user-info-card');

    setTimeout(() => {const drinkSelectionCard = document.getElementById('drink-selection-card');

        if (toast.parentNode) {const orderConfirmationCard = document.getElementById('order-confirmation-card');

            toast.remove();const successCard = document.getElementById('success-card');

        }const loadingOverlay = document.getElementById('loading-overlay');

    }, duration);

}// Initialize app when DOM is loaded

document.addEventListener('DOMContentLoaded', function() {

function getToastIcon(type) {    initializeApp();

    const icons = {});

        'success': '✅',

        'error': '❌',function initializeApp() {

        'warning': '⚠️',    safeLog('🚀 Initializing AVM Kitchen Order System...');

        'info': 'ℹ️'    

    };    try {

    return icons[type] || 'ℹ️';        // Initialize Supabase

}        supabase = initializeSupabase();

        

// Show/hide loading overlay        // Test Supabase connection if not in test mode

function showLoading(show = true) {        if (!TEST_MODE && supabase) {

    const overlay = document.getElementById('loading-overlay');            testSupabaseConnection();

    if (overlay) {        } else if (TEST_MODE) {

        overlay.style.display = show ? 'flex' : 'none';            safeLog('🧪 Running in TEST MODE - offline functionality enabled');

    }        }

}        

        // Initialize UI components

// Card navigation        setupEventListeners();

function showCard(cardId) {        setupDrinkSelection();

    log(`🔄 Attempting to show card: ${cardId}`, 'info', true);        

            safeLog('✅ App initialization completed');

    try {        

        const cards = document.querySelectorAll('.card');    } catch (error) {

        cards.forEach(card => {        safeLog('❌ Error during app initialization: ' + error.message, 'error');

            card.classList.remove('active');        // Fallback to test mode if initialization fails

            card.style.display = 'none';        if (!TEST_MODE) {

        });            safeLog('🔄 Falling back to test mode due to initialization error');

                    TEST_MODE = true;

        const targetCard = document.getElementById(cardId + '-card');        }

        if (targetCard) {    }

            targetCard.style.display = 'block';}

            targetCard.classList.add('active');            console.error('Supabase client not initialized');

            log(`✅ Successfully showed card: ${cardId}`, 'info', true);            showToast('Veritabanı bağlantısı kurulamadı. Test moduna geçiliyor.', 'error');

                    }

            if (cardId === 'drink-selection') {        

                setTimeout(() => {        // Set up event listeners

                    setupDrinkSelection();        setupEventListeners();

                }, 100);        

            }        // Show initial card

        } else {        showCard('user-info');

            log(`❌ Card not found: ${cardId}-card`, 'error', true);        

        }        const mode = TEST_MODE ? 'Test' : 'Supabase';

    } catch (error) {        console.log(`Tea Order App initialized successfully (${mode} mode)`);

        log(`Error in showCard: ${error.message}`, 'error', true);        showToast(`Uygulama başlatıldı (${mode} modu)`, 'success');

    }    } catch (error) {

}        console.error('Error initializing app:', error);

        showToast('Uygulama başlatılırken hata oluştu: ' + error.message, 'error');

// User info submission    }

function handleUserInfoSubmit(e) {}

    e.preventDefault();

    log('🔄 Form submission started', 'info', true);function setupEventListeners() {

        // User info form submit

    try {    const userForm = document.getElementById('user-form');

        const nameInput = document.getElementById('name');    if (userForm) {

        const departmentInput = document.getElementById('department');        userForm.addEventListener('submit', handleUserInfoSubmit);

            }

        if (!nameInput || !departmentInput) {    

            log('❌ Form inputs not found', 'error', true);    // Drink selection - multiple selection support

            showToast('Form hatası - sayfa yenilenecek', 'error');    const drinkOptions = document.querySelectorAll('.drink-option');

            setTimeout(() => location.reload(), 2000);    drinkOptions.forEach(option => {

            return;        option.addEventListener('click', (e) => {

        }            // Prevent event bubbling for quantity buttons

                    if (e.target.classList.contains('quantity-btn')) {

        const name = nameInput.value.trim();                return;

        const department = departmentInput.value.trim();            }

                    toggleDrinkSelection(option);

        log(`📝 Form data - Name: "${name}", Department: "${department}"`, 'info', true);        });

            });

        if (!name || !department) {    

            log('❌ Empty fields detected', 'warn', true);    // Quantity controls

            showToast('Lütfen tüm alanları doldurun', 'error');    setupQuantityControls();

            return;    

        }    // Navigation buttons

            const continueBtn = document.getElementById('continue-to-drinks');

        window.currentUser = { customerName: name, department: department };    if (continueBtn && continueBtn.type === 'button') {

                continueBtn.addEventListener('click', () => {

        log(`✅ User info saved: ${name} - ${department}`, 'info', true);            showCard('drink-selection');

        showToast('Bilgiler kaydedildi', 'success');        });

            }

        log('🚀 Navigating to drink-selection card', 'info', true);    

        showCard('drink-selection');    const backToUserBtn = document.getElementById('back-to-user-info');

            if (backToUserBtn) {

    } catch (error) {        backToUserBtn.addEventListener('click', () => {

        log(`❌ Error in handleUserInfoSubmit: ${error.message}`, 'error', true);            showCard('user-info');

        showToast('Form işleminde hata oluştu', 'error');        });

    }    }

}    

    const continueToConfirmationBtn = document.getElementById('continue-to-confirmation');

// Drink selection functionality    if (continueToConfirmationBtn) {

function setupDrinkSelection() {        continueToConfirmationBtn.addEventListener('click', () => {

    log('🍹 Setting up drink selection...', 'info', true);            updateOrderSummary();

                showCard('order-confirmation');

    const drinkOptions = document.querySelectorAll('.drink-option');        });

    log(`Found ${drinkOptions.length} drink options`, 'info', true);    }

        

    if (drinkOptions.length === 0) {    const confirmBtn = document.getElementById('confirm-order');

        log('❌ No drink options found! Retrying in 500ms...', 'warn', true);    if (confirmBtn) {

        setTimeout(setupDrinkSelection, 500);        confirmBtn.addEventListener('click', confirmOrder);

        return;    }

    }    

        const backToDrinksBtn = document.getElementById('back-to-drinks');

    drinkOptions.forEach((option, index) => {    if (backToDrinksBtn) {

        log(`Setting up drink option ${index + 1}: ${option.dataset.drink}`, 'info', true);        backToDrinksBtn.addEventListener('click', () => {

                    showCard('drink-selection');

        // Remove any existing listeners to avoid duplicates        });

        const newOption = option.cloneNode(true);    }

        option.parentNode.replaceChild(newOption, option);    

            const newOrderBtn = document.getElementById('place-new-order');

        newOption.addEventListener('click', (e) => {    if (newOrderBtn) {

            // If clicking on quantity buttons, let them handle it        newOrderBtn.addEventListener('click', () => {

            if (e.target.classList.contains('quantity-btn')) {            resetApp();

                return;            showCard('user-info');

            }        });

                }

            log(`🔥 Drink option clicked: ${newOption.dataset.drink}`, 'info', true);}

            toggleDrinkSelection(newOption);

        });function setupQuantityControls() {

            const quantityButtons = document.querySelectorAll('.quantity-btn');

        // Setup quantity control buttons for this option    quantityButtons.forEach(btn => {

        const plusBtn = newOption.querySelector('.quantity-btn.plus');        btn.addEventListener('click', (e) => {

        const minusBtn = newOption.querySelector('.quantity-btn.minus');            e.stopPropagation(); // Prevent drink selection toggle

                    const drinkOption = btn.closest('.drink-option');

        if (plusBtn) {            const quantitySpan = drinkOption.querySelector('.quantity');

            plusBtn.addEventListener('click', (e) => {            const isPlus = btn.classList.contains('plus');

                e.stopPropagation();            let currentQuantity = parseInt(quantitySpan.textContent);

                log(`Plus button clicked for ${newOption.dataset.drink}`, 'info', true);            

                adjustQuantity(newOption, 1);            if (isPlus) {

            });                currentQuantity++;

        }            } else if (currentQuantity > 1) {

                        currentQuantity--;

        if (minusBtn) {            } else if (currentQuantity === 1) {

            minusBtn.addEventListener('click', (e) => {                // If quantity becomes 0, deselect the drink

                e.stopPropagation();                toggleDrinkSelection(drinkOption);

                log(`Minus button clicked for ${newOption.dataset.drink}`, 'info', true);                return;

                adjustQuantity(newOption, -1);            }

            });            

        }            quantitySpan.textContent = currentQuantity;

    });            updateSelectedDrink(drinkOption, currentQuantity);

                updateSelectedDrinksSummary();

    const orderBtn = document.getElementById('place-order-btn');        });

    if (orderBtn) {    });

        log('✅ Order button found and configured', 'info', true);}

        orderBtn.addEventListener('click', handlePlaceOrder);

    } else {function toggleDrinkSelection(drinkElement) {

        log('❌ Order button not found', 'warn', true);    const drinkName = drinkElement.dataset.drink;

    }    const quantityControls = drinkElement.querySelector('.quantity-controls');

        const quantitySpan = drinkElement.querySelector('.quantity');

    log('✅ Drink selection setup complete', 'info', true);    

}    if (drinkElement.classList.contains('selected')) {

        // Deselect drink

function toggleDrinkSelection(option) {        drinkElement.classList.remove('selected');

    log(`🔥 toggleDrinkSelection called for: ${option.dataset.drink}`, 'info', true);        quantityControls.style.display = 'none';

            

    const drinkName = option.dataset.drink;        // Remove from selectedDrinks array

    const quantityElement = option.querySelector('.quantity');        selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);

        } else {

    if (!quantityElement) {        // Select drink

        log('❌ Quantity element not found!', 'error', true);        drinkElement.classList.add('selected');

        return;        quantityControls.style.display = 'flex';

    }        quantitySpan.textContent = '1';

            

    let currentQuantity = parseInt(quantityElement.textContent) || 0;        // Add to selectedDrinks array

    log(`Current quantity for ${drinkName}: ${currentQuantity}`, 'info', true);        const drinkData = {

                name: drinkName,

    if (option.classList.contains('selected')) {            icon: drinkElement.querySelector('i').className,

        log(`${drinkName} is already selected. Use +/- buttons to adjust quantity.`, 'info', true);            description: drinkElement.querySelector('p').textContent,

        return;            quantity: 1

    } else {        };

        currentQuantity = 1;        selectedDrinks.push(drinkData);

        log(`Selecting ${drinkName}`, 'info', true);    }

        option.classList.add('selected');    

        quantityElement.textContent = currentQuantity;    updateSelectedDrinksSummary();

        }

        const quantityControls = option.querySelector('.quantity-controls');

        if (quantityControls) {function updateSelectedDrink(drinkElement, quantity) {

            quantityControls.style.display = 'flex';    const drinkName = drinkElement.dataset.drink;

            log(`Shown quantity controls for ${drinkName}`, 'info', true);    const existingDrink = selectedDrinks.find(drink => drink.name === drinkName);

        } else {    

            log(`❌ Quantity controls not found for ${drinkName}`, 'error', true);    if (existingDrink) {

        }        existingDrink.quantity = quantity;

            }

        selectedDrinks.push({ name: drinkName, quantity: currentQuantity });}

        log(`✅ Added ${drinkName} to selection`, 'info', true);

    }function updateSelectedDrinksSummary() {

        const summaryDiv = document.getElementById('selected-drinks-summary');

    log(`Total selected drinks: ${selectedDrinks.length}`, 'info', true);    const listDiv = document.getElementById('selected-drinks-list');

    updateOrderButton();    const totalCountSpan = document.getElementById('total-count');

}    const continueBtn = document.getElementById('continue-to-confirmation');

    

// Adjust quantity using + and - buttons    if (selectedDrinks.length === 0) {

function adjustQuantity(option, change) {        summaryDiv.style.display = 'none';

    const drinkName = option.dataset.drink;        continueBtn.style.display = 'none';

    const quantityElement = option.querySelector('.quantity');        return;

    let currentQuantity = parseInt(quantityElement.textContent) || 0;    }

        

    log(`Adjusting quantity for ${drinkName}: ${currentQuantity} ${change > 0 ? '+' : ''}${change}`, 'info', true);    summaryDiv.style.display = 'block';

        continueBtn.style.display = 'inline-flex';

    const newQuantity = currentQuantity + change;    

        // Clear existing list

    if (newQuantity <= 0) {    listDiv.innerHTML = '';

        option.classList.remove('selected');    

        quantityElement.textContent = '0';    // Add selected drinks to list

            let totalCount = 0;

        const quantityControls = option.querySelector('.quantity-controls');    selectedDrinks.forEach(drink => {

        if (quantityControls) {        totalCount += drink.quantity;

            quantityControls.style.display = 'none';        

        }        const drinkItem = document.createElement('div');

                drinkItem.className = 'selected-drink-item';

        selectedDrinks = selectedDrinks.filter(drink => drink.name !== drinkName);        drinkItem.innerHTML = `

        log(`❌ Removed ${drinkName} from selection (quantity = 0)`, 'info', true);            <i class="${drink.icon}"></i>

                    <span>${drink.name}</span>

    } else if (newQuantity === 1 && currentQuantity === 0) {            <div class="selected-drink-quantity">${drink.quantity}</div>

        option.classList.add('selected');        `;

        quantityElement.textContent = '1';        listDiv.appendChild(drinkItem);

            });

        const quantityControls = option.querySelector('.quantity-controls');    

        if (quantityControls) {    totalCountSpan.textContent = totalCount;

            quantityControls.style.display = 'flex';}

        }

        function handleUserInfoSubmit(e) {

        selectedDrinks.push({ name: drinkName, quantity: 1 });    e.preventDefault();

        log(`✅ Added ${drinkName} to selection`, 'info', true);    

            const formData = new FormData(e.target);

    } else if (newQuantity > 0) {    const userData = {

        quantityElement.textContent = newQuantity;        name: formData.get('name'),

                department: formData.get('department')

        const drink = selectedDrinks.find(d => d.name === drinkName);    };

        if (drink) {    

            drink.quantity = newQuantity;    // Store user data

        }    sessionStorage.setItem('userData', JSON.stringify(userData));

        log(`📝 Updated ${drinkName} quantity to ${newQuantity}`, 'info', true);    

    }    // Update header with user info

        updateHeaderUserInfo(userData);

    updateOrderButton();    

}    // Show drink selection

    showCard('drink-selection');

function updateOrderButton() {}

    const orderBtn = document.getElementById('place-order-btn');

    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);function updateHeaderUserInfo(userData) {

        const userInfoElement = document.querySelector('.user-info');

    if (orderBtn) {    userInfoElement.innerHTML = `

        if (totalItems > 0) {        <i class="fas fa-user"></i>

            orderBtn.disabled = false;        <span>${userData.name} - ${userData.department}</span>

            orderBtn.textContent = `Sipariş Ver (${totalItems} adet)`;    `;

        } else {}

            orderBtn.disabled = true;

            orderBtn.textContent = 'İçecek Seçin';async function testSupabaseConnection() {

        }    try {

    }        console.log('Testing Supabase connection...');

}        

        // Simple test query to check connection and API key

async function handlePlaceOrder() {        const { data, error } = await supabase

    if (selectedDrinks.length === 0) {            .from('drink_orders')

        showToast('Lütfen en az bir içecek seçin', 'error');            .select('count(*)', { count: 'exact' })

        return;            .limit(1);

    }        

            if (error) {

    if (!window.currentUser) {            console.error('Supabase connection test failed:', error);

        showToast('Kullanıcı bilgileri bulunamadı', 'error');            showToast(`Supabase bağlantı hatası: ${error.message}`, 'error');

        return;            

    }            // Automatically switch to test mode if connection fails

                if (error.message.includes('Invalid API key') || error.message.includes('401')) {

    try {                console.log('Switching to test mode due to API key error');

        showLoading(true);                showToast('API anahtarı geçersiz. Test moduna geçiliyor.', 'error');

                    }

        showCard('order-confirmation');        } else {

        updateOrderSummary();            console.log('Supabase connection successful');

                    showToast('Veritabanı bağlantısı başarılı', 'success');

        showToast('Sipariş başarıyla gönderildi!', 'success');        }

            } catch (error) {

    } catch (error) {        console.error('Supabase connection test error:', error);

        log(`Order creation error: ${error.message}`, 'error');        showToast('Bağlantı testi hatası: ' + error.message, 'error');

        showToast(`Sipariş oluşturulurken hata: ${error.message}`, 'error');    }

    } finally {}

        showLoading(false);

    }function selectDrink(drinkElement) {

}    // Remove previous selection

    document.querySelectorAll('.drink-option').forEach(option => {

function updateOrderSummary() {        option.classList.remove('selected');

    const orderSummary = document.getElementById('order-summary');    });

    if (!orderSummary) return;    

        // Add selection to clicked drink

    const { customerName, department } = window.currentUser || {};    drinkElement.classList.add('selected');

    const totalItems = selectedDrinks.reduce((sum, drink) => sum + drink.quantity, 0);    

        // Store selected drink

    orderSummary.innerHTML = `    selectedDrink = {

        <div class="order-header">        name: drinkElement.dataset.drink,

            <h3>Sipariş Özeti</h3>        icon: drinkElement.querySelector('i').className,

            <div class="customer-info">        description: drinkElement.querySelector('p').textContent

                <strong>${customerName}</strong> - ${department}    };

            </div>    

        </div>    // Update order summary

        <div class="order-items">    updateOrderSummary();

            ${selectedDrinks.map(drink => `    

                <div class="order-item">    // Show confirmation card

                    <span class="item-name">${drink.name}</span>    showCard('order-confirmation');

                    <span class="item-quantity">x${drink.quantity}</span>}

                </div>

            `).join('')}function updateOrderSummary() {

        </div>    if (!selectedDrinks || selectedDrinks.length === 0) return;

        <div class="order-footer">    

            <p><strong>Toplam: ${totalItems} adet içecek</strong></p>    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');

        </div>    

    `;    // Update user info

}    document.getElementById('summary-user').innerHTML = `

        <strong>${userData.name}</strong>

// Setup event listeners        <span>${userData.department} Departmanı</span>

function setupEventListeners() {    `;

    try {    

        const userForm = document.getElementById('user-form');    // Update drinks list

        if (userForm) {    const drinksList = document.getElementById('summary-drinks-list');

            userForm.addEventListener('submit', handleUserInfoSubmit);    drinksList.innerHTML = '';

            log('✅ User form event listener added', 'info', true);    

        } else {    let totalCount = 0;

            log('❌ User form not found', 'warn', true);    selectedDrinks.forEach(drink => {

        }        totalCount += drink.quantity;

                

    } catch (error) {        const drinkItem = document.createElement('div');

        log(`Error setting up event listeners: ${error.message}`, 'error');        drinkItem.className = 'summary-drink-item';

    }        drinkItem.innerHTML = `

}            <div class="summary-drink-info">

                <i class="${drink.icon}"></i>

// Initialize app                <span>${drink.name}</span>

async function initializeApp() {            </div>

    log('🚀 Initializing AVM Kitchen Order System...', 'info', true);            <div class="summary-drink-quantity">${drink.quantity}x</div>

            `;

    try {        drinksList.appendChild(drinkItem);

        showLoading(true);    });

            

        setupEventListeners();    // Update total

        showCard('user-info');    document.getElementById('summary-total-count').textContent = `${totalCount} içecek`;

            

        log(`✅ App initialized successfully`, 'log', true);    // Update time

        showToast(`Sistem hazır - İçecek sipariş sistemi aktif`, 'success');    const now = new Date();

            document.getElementById('summary-time').innerHTML = `

    } catch (error) {        <strong>Sipariş Zamanı</strong>

        log(`❌ App initialization failed: ${error.message}`, 'error', true);        <span>${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>

        showToast(`Sistem başlatılamadı: ${error.message}`, 'error');    `;

    } finally {}

        showLoading(false);

    }async function confirmOrder() {

}    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');

    

// Initialize when DOM is ready    if (!userData.name || !userData.department || !selectedDrinks || selectedDrinks.length === 0) {

document.addEventListener('DOMContentLoaded', initializeApp);        showToast('Lütfen tüm bilgileri doldurun!', 'error');

        return;

// Add global test functions for debugging    }

window.addEventListener('load', () => {    

    log('🎉 Kitchen Order System Ready!', 'info', true);    showLoading('Siparişler gönderiliyor...');

        

    window.testDrinkButtons = function() {    try {

        log('🧪 Manual drink button test started...', 'info', true);        let useTestMode = TEST_MODE || !supabase;

        const drinkOptions = document.querySelectorAll('.drink-option');        currentOrderIds = []; // Reset order IDs

        log(`Found ${drinkOptions.length} drink options`, 'info', true);        

                if (!TEST_MODE && supabase) {

        if (drinkOptions.length > 0) {            // Try real mode first - create separate order for each drink

            const firstDrink = drinkOptions[0];            try {

            log(`Testing first drink: ${firstDrink.dataset.drink}`, 'info', true);                const orderPromises = [];

            firstDrink.click();                

        } else {                selectedDrinks.forEach(drink => {

            log('❌ No drink options found for testing', 'error', true);                    // Create multiple orders if quantity > 1

        }                    for (let i = 0; i < drink.quantity; i++) {

    };                        orderPromises.push(

                                supabase

    window.manualSetupDrinks = function() {                                .from('drink_orders')

        log('🔧 Manual setup of drink selection...', 'info', true);                                .insert([

        setupDrinkSelection();                                    {

    };                                        customer_name: userData.name,

                                            department: userData.department,

    log('✅ Global test functions added: testDrinkButtons(), manualSetupDrinks()', 'info', true);                                        drink_type: drink.name,

});                                        status: 'new',
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
    
    try {
        let useTestMode = TEST_MODE || !supabase;
        
        if (!TEST_MODE && supabase) {
            // Try real mode first
            try {
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
                
                if (error) {
                    console.error('Supabase error:', error);
                    
                    // Switch to test mode if API key is invalid
                    if (error.message.includes('Invalid API key') || 
                        error.message.includes('401') || 
                        error.message.includes('authentication')) {
                        console.log('API key error detected, switching to test mode');
                        showToast('API anahtarı sorunu. Test modunda devam ediliyor.', 'error');
                        useTestMode = true;
                    } else {
                        throw error;
                    }
                }
                
                if (!useTestMode && data && data.length > 0) {
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
                    return;
                }
                
            } catch (realModeError) {
                console.error('Real mode failed:', realModeError);
                showToast('Veritabanı hatası. Test moduna geçiliyor.', 'error');
                useTestMode = true;
            }
        }
        
        if (useTestMode) {
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
                `${selectedDrink.name} siparişiniz başarıyla oluşturuldu. Aşçı durumunu aşağıdan takip edebilirsiniz. (Test Modu)`;
            
            // Start test status tracking
            startTestStatusTracking();
            
            showToast('Sipariş başarıyla oluşturuldu! (Test Modu)', 'success');
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