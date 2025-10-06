# Database Schema & API Compatibility

## ✅ ESP32 Kiosk System - Database Integration

### Supabase Database Schema

The ESP32 kitchen kiosk system is **fully compatible** with the following database schema:

#### Table: `drink_orders`

```sql
CREATE TABLE drink_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  department TEXT,
  drink_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'new',
  special_instructions TEXT,
  priority INTEGER DEFAULT 0,
  order_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Field Mapping

| Database Field | ESP32 Variable | Type | Description |
|----------------|----------------|------|-------------|
| `id` | `order.id` | String | Unique order identifier (UUID) |
| `customer_name` | `order.customer_name` | String | Customer's name |
| `department` | `order.department` | String | Department/location |
| `drink_type` | `order.drink_type` | String | Type of drink ordered |
| `quantity` | `order.quantity` | int | Number of drinks |
| `status` | `order.status` | String | Order status (new/alindi/hazirlandi/teslim_edildi/iptal) |
| `special_instructions` | `order.special_instructions` | String | Special notes |
| `priority` | `order.priority` | int | Priority level (0=normal, 1=urgent) |
| `order_group_id` | `order.order_group_id` | String | Group ID for batch orders |
| `created_at` | `order.created_at` | String | Timestamp |
| `waiting_minutes` | `order.waiting_minutes` | float | Calculated field (computed in DB view) |

### API Endpoints Used

#### 1. Fetch New Orders (GET)
```
GET /rest/v1/drink_orders?status=eq.new&order=priority.desc,created_at.asc
```

**Headers:**
- `apikey`: Supabase anon key
- `Authorization`: Bearer token

**Response:** Array of order objects

#### 2. Update Order Status (PATCH)
```
PATCH /rest/v1/drink_orders?order_group_id=eq.{group_id}&status=eq.{current_status}
```

**Headers:**
- `apikey`: Supabase anon key
- `Authorization`: Bearer token
- `Content-Type`: application/json
- `Prefer`: return=minimal

**Body:**
```json
{
  "status": "alindi" | "hazirlandi" | "teslim_edildi"
}
```

### Status Flow

```
new → alindi → hazirlandi → teslim_edildi
                    ↓
                  iptal (cancelled)
```

### Grouping Logic

Orders are grouped by `order_group_id`. All orders with the same `order_group_id` are:
- Displayed together on screen
- Updated together when acknowledged
- Sorted by priority (urgent first) and creation time

### Configuration

**Supabase Connection:**
```cpp
#define SUPABASE_URL "https://cfapmolnnvemqjneaher.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGci..."
```

**Network Settings:**
- WiFi auto-connection with 5 backup networks
- DNS: Google (8.8.8.8) and Cloudflare (1.1.1.1)
- HTTP timeout: 25 seconds
- Fetch interval: 15 seconds
- SSL/TLS: Insecure mode (certificate verification disabled)

### Features

✅ **Implemented:**
- Real-time order fetching every 15 seconds
- Touch-based order acknowledgment
- Order grouping by `order_group_id`
- Priority-based sorting (urgent orders first)
- Buzzer notification for new orders
- UTF-8 to Latin-1 character conversion for Turkish characters
- WiFi auto-reconnect with 5 network fallback
- Persistent WiFi credentials storage
- Touch calibration persistence
- AP mode for WiFi configuration (192.168.4.1)

✅ **Bug Fixes Applied:**
- Fixed ESP32 restart loop after WiFi connection
- Fixed crash on DNS resolution failure
- Removed aggressive WiFi disconnect detection
- Added 5-minute timeout before AP mode activation
- Added null pointer checks for SSL client cleanup
- Removed String concatenation in TFT error displays

### Web Order System Compatibility

✅ **Compatible with web order systems that:**
- Use Supabase REST API
- Follow the `drink_orders` table schema above
- Support status updates via PATCH requests
- Can generate `order_group_id` for batch orders
- Provide `waiting_minutes` calculation (optional)

✅ **Required from web system:**
- Send orders with status = 'new'
- Use UUID for `id` and `order_group_id`
- Provide `customer_name` and `drink_type` (required)
- Optional fields: `department`, `quantity`, `special_instructions`, `priority`

### Testing Checklist

- [x] WiFi connection and auto-reconnect
- [x] Touch calibration persistence
- [x] Order fetching from Supabase
- [x] Order grouping display
- [x] Touch-based order acknowledgment
- [x] Status updates to database
- [x] Buzzer notifications
- [x] UTF-8 character handling
- [x] AP mode WiFi configuration
- [ ] DNS resolution (requires internet connection)
- [ ] End-to-end order flow with web system

### Known Issues

⚠️ **DNS Resolution:**
- Current test network (AVM GRUP2) does not have internet access
- Requires 4G/5G hotspot or internet-connected WiFi for Supabase API
- System handles DNS failures gracefully without crashing

### Recommendations

1. **For Production:**
   - Use WiFi network with stable internet connection
   - Configure SSL certificate verification (currently disabled)
   - Set up proper error monitoring
   - Test with actual web order system

2. **For Web System Integration:**
   - Ensure web system sends orders with `status='new'`
   - Use `order_group_id` for batch orders from same customer
   - Test status transitions: new → alindi → hazirlandi → teslim_edildi
   - Monitor `waiting_minutes` calculation accuracy

3. **Database Setup:**
   - Enable RLS (Row Level Security) in production
   - Create database view for `waiting_minutes` calculation
   - Set up database triggers for `updated_at` timestamp
   - Consider indexing on `status` and `created_at` for performance

---

**Last Updated:** October 6, 2025  
**System Version:** CHEF_R2 v2.0  
**Hardware:** ESP32-2432S028R (CYD)  
**Database:** Supabase PostgreSQL
