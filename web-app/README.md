# ☕ AVM Grup Tea Order System

A complete kitchen management system with web ordering interface for office staff to order drinks from the kitchen chef.

## 🏗️ System Architecture

```
Office Staff (Web) → Supabase Database → Kitchen Display (CYD) → Chef Management
```

### Components
1. **Web Ordering Interface** - Modern responsive web app for staff to place drink orders
2. **Supabase Database** - Real-time database for order management
3. **Kitchen Display System** - ESP32 CYD touch screen for chef order management
4. **Real-time Updates** - Live status tracking from order to completion

## 🌐 Web App Features

- **User Registration** - Name and department selection
- **Drink Selection** - 6 drink options with beautiful UI
- **Order Confirmation** - Summary before placing order
- **Real-time Status** - Track order progress (New → Alındı → Hazırlandı)
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Turkish Language** - Fully localized interface

## 🚀 GitHub Pages Deployment

### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `avm-tea-order-system`
3. Make it public
4. Initialize with README

### Step 2: Upload Files
Upload these files to your repository:
- `index.html`
- `styles.css` 
- `script.js`
- `README.md`

### Step 3: Enable GitHub Pages
1. Go to repository **Settings**
2. Scroll to **Pages** section
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**

### Step 4: Access Your App
- Your app will be available at: `https://yourusername.github.io/repository-name`
- GitHub will provide the exact URL in the Pages settings

## 🔧 Configuration

### Supabase Setup
The web app is pre-configured with:
- **URL**: `https://cfapmolnnvemqjneaher.supabase.co`
- **Table**: `drink_orders`
- **Anon Key**: Already included in script.js

### Database Schema
```sql
drink_orders (
    id: bigint (Primary Key)
    customer_name: text
    department: text  
    drink_type: text
    status: text ('new', 'alindi', 'hazirlandi')
    created_at: timestamp
)
```

## 📱 Kitchen Display (CYD)

The ESP32-2432S028R (Cheap Yellow Display) runs the kitchen management system:

- **Touch Interface** - Calibrated resistive touchscreen
- **Order Display** - Shows incoming orders with customer details
- **Status Buttons** - "ALINDI" and "HAZIRLANDI" for workflow management
- **Real-time Sync** - Updates database instantly
- **Turkish Support** - Proper character encoding

### Hardware Requirements
- ESP32-2432S028R (CYD) board
- USB-C cable for programming
- WiFi network connection

## 🔄 Workflow

1. **Staff places order** via web interface
2. **Order appears** on kitchen CYD display  
3. **Chef presses "ALINDI"** when starting preparation
4. **Chef presses "HAZIRLANDI"** when drink is ready
5. **Status updates** appear in real-time on web interface

## 🎨 Design Features

### Visual Elements
- **Glass morphism UI** with backdrop blur effects
- **Gradient backgrounds** for modern look
- **Smooth animations** and hover effects
- **Professional typography** with Inter font
- **Icon integration** using Font Awesome
- **Responsive grid layouts**

### UX Features  
- **Progressive flow** through user info → drinks → confirmation
- **Real-time feedback** with loading states and toasts
- **Status visualization** with progress indicators
- **Error handling** for network issues
- **Mobile-optimized** touch interactions

## 🔧 Technical Stack

### Frontend
- **HTML5** - Semantic structure
- **CSS3** - Modern styling with flexbox/grid
- **Vanilla JavaScript** - No frameworks for fast loading
- **Supabase JS Client** - Database integration

### Backend
- **Supabase** - PostgreSQL database with real-time features
- **REST API** - For order CRUD operations
- **WebSocket** - Real-time subscriptions (optional)

### Hardware
- **ESP32** - Arduino framework with PlatformIO
- **LovyanGFX** - Display and touch library
- **WiFiClientSecure** - HTTPS communication
- **ArduinoJson** - JSON parsing

## 🛠️ Development

### Local Testing
1. Serve files with any HTTP server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server
   
   # Live Server (VS Code extension)
   Right-click index.html → "Open with Live Server"
   ```

2. Open `http://localhost:8000` in browser

### Customization
- **Colors**: Modify CSS variables in `styles.css`
- **Drinks**: Add/remove options in `index.html` and update icons
- **Departments**: Modify dropdown options in user form
- **Branding**: Update logo and company name in header

## 📊 Analytics & Monitoring

### Order Tracking
- Real-time order status updates
- Automatic polling every 3 seconds  
- Network error handling
- Offline/online status detection

### Performance
- **Fast loading** - Optimized assets
- **Responsive** - Works on all screen sizes
- **Accessible** - Semantic HTML and ARIA labels
- **PWA ready** - Can be enhanced with service worker

## 🔐 Security

- **Supabase RLS** - Row Level Security policies
- **HTTPS only** - Secure data transmission
- **Input validation** - Client and server-side
- **CORS configuration** - Proper cross-origin handling

## 📞 Support

For technical issues or feature requests:
1. Check CYD serial monitor for connection status
2. Verify Supabase database accessibility  
3. Test web app network connectivity
4. Review browser console for JavaScript errors

## 🚀 Future Enhancements

- **PWA features** - Offline support and push notifications
- **Order history** - Previous orders for quick reordering
- **Admin dashboard** - Kitchen analytics and reporting
- **Multi-language** - English translation support
- **Order scheduling** - Advance order placement
- **Integration** - Connect with existing company systems

---

**Created for AVM Grup Factory Kitchen System** ☕
*Streamlining office drink orders with modern technology*