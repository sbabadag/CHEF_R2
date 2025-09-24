-- AVM Grup Kitchen Order System - Supabase Database Setup
-- Updated for Multiple Drink Orders Support
-- Run this SQL in your Supabase SQL Editor

-- Drop old table if exists
DROP TABLE IF EXISTS tea_orders CASCADE;
DROP TABLE IF EXISTS drink_orders CASCADE;

-- Create the drink_orders table with enhanced structure
CREATE TABLE drink_orders (
    id BIGSERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    drink_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'alindi', 'hazirlandi', 'teslim_edildi', 'iptal')),
    special_instructions TEXT,
    order_group_id UUID DEFAULT gen_random_uuid(), -- Group related orders together
    priority INTEGER DEFAULT 0, -- 0=normal, 1=urgent
    estimated_time INTEGER DEFAULT 5, -- estimated preparation time in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX idx_drink_orders_status ON drink_orders(status);
CREATE INDEX idx_drink_orders_created_at ON drink_orders(created_at DESC);
CREATE INDEX idx_drink_orders_customer ON drink_orders(customer_name);
CREATE INDEX idx_drink_orders_department ON drink_orders(department);
CREATE INDEX idx_drink_orders_group_id ON drink_orders(order_group_id);
CREATE INDEX idx_drink_orders_active ON drink_orders(status) WHERE status IN ('new', 'alindi');

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set completed_at when status changes to 'hazirlandi'
    IF NEW.status = 'hazirlandi' AND OLD.status != 'hazirlandi' THEN
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_drink_orders_updated_at ON drink_orders;
CREATE TRIGGER update_drink_orders_updated_at
    BEFORE UPDATE ON drink_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for kitchen display (active orders only)
CREATE OR REPLACE VIEW kitchen_active_orders AS
SELECT 
    id,
    customer_name,
    department,
    drink_type,
    quantity,
    status,
    special_instructions,
    order_group_id,
    priority,
    estimated_time,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS waiting_minutes
FROM drink_orders 
WHERE status IN ('new', 'alindi')
ORDER BY priority DESC, created_at ASC;

-- Create view for order history/statistics
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'hazirlandi') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'iptal') as cancelled_orders,
    drink_type,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_completion_time_minutes
FROM drink_orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), drink_type
ORDER BY order_date DESC, total_orders DESC;

-- Enable Row Level Security
ALTER TABLE drink_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust for production security)
CREATE POLICY "Allow all operations on drink_orders" ON drink_orders
FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data for testing
INSERT INTO drink_orders (customer_name, department, drink_type, quantity, status, special_instructions, priority) VALUES
('AKBAL', 'Muhasebe', 'Çay', 2, 'new', 'Şekerli', 0),
('MEHMET', 'IT', 'Kahve', 1, 'alindi', 'Sade', 0),
('AYŞE', 'Pazarlama', 'Su', 3, 'new', null, 0),
('ALİ', 'Yönetim', 'Ayran', 1, 'hazirlandi', 'Soğuk', 1),
('FATMA', 'İnsan Kaynakları', 'Limonata', 2, 'new', 'Buzlu', 0),
('OKAN', 'Satış', 'Meyve Suyu', 1, 'alindi', 'Portakal', 0);

-- Create function for bulk status update (useful for CYD)
CREATE OR REPLACE FUNCTION update_order_status(order_id BIGINT, new_status VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE drink_orders 
    SET status = new_status 
    WHERE id = order_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE 'plpgsql';

-- Create function to get orders for kitchen display
CREATE OR REPLACE FUNCTION get_kitchen_orders()
RETURNS TABLE (
    id BIGINT,
    customer_name VARCHAR(100),
    department VARCHAR(50),
    drink_type VARCHAR(50),
    quantity INTEGER,
    status VARCHAR(20),
    waiting_minutes NUMERIC,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_name,
        o.department,
        o.drink_type,
        o.quantity,
        o.status,
        EXTRACT(EPOCH FROM (NOW() - o.created_at))/60 AS waiting_minutes,
        o.priority
    FROM drink_orders o
    WHERE o.status IN ('new', 'alindi')
    ORDER BY o.priority DESC, o.created_at ASC
    LIMIT 20; -- Limit for CYD screen space
END;
$$ LANGUAGE 'plpgsql';

-- View to get orders with formatted timestamps (updated for drink_orders)
CREATE OR REPLACE VIEW drink_orders_formatted AS
SELECT 
    id,
    drink_type,
    quantity,
    customer_name,
    department,
    status,
    special_instructions,
    priority,
    created_at,
    updated_at,
    completed_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))::INT AS seconds_since_order,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS waiting_minutes,
    CASE 
        WHEN status = 'new' THEN 'Yeni Siparis'
        WHEN status = 'alindi' THEN 'Hazirlaniyor'
        WHEN status = 'hazirlandi' THEN 'Hazir'
        WHEN status = 'teslim_edildi' THEN 'Teslim Edildi'
        WHEN status = 'iptal' THEN 'Iptal Edildi'
    END AS status_display,
    CASE 
        WHEN priority = 1 THEN 'Acil'
        ELSE 'Normal'
    END AS priority_display
FROM drink_orders
ORDER BY 
    priority DESC,
    CASE status
        WHEN 'new' THEN 1
        WHEN 'alindi' THEN 2
        WHEN 'hazirlandi' THEN 3
        WHEN 'teslim_edildi' THEN 4
        WHEN 'iptal' THEN 5
    END,
    created_at ASC;

-- Function to get order statistics (updated for drink_orders)
DROP FUNCTION IF EXISTS get_order_stats();
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS TABLE(
    total_orders BIGINT,
    new_orders BIGINT,
    in_progress_orders BIGINT,
    ready_orders BIGINT,
    completed_today BIGINT,
    cancelled_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM drink_orders) as total_orders,
        (SELECT COUNT(*) FROM drink_orders WHERE status = 'new') as new_orders,
        (SELECT COUNT(*) FROM drink_orders WHERE status = 'alindi') as in_progress_orders,
        (SELECT COUNT(*) FROM drink_orders WHERE status = 'hazirlandi') as ready_orders,
        (SELECT COUNT(*) FROM drink_orders WHERE status = 'hazirlandi' AND created_at::date = CURRENT_DATE) as completed_today,
        (SELECT COUNT(*) FROM drink_orders WHERE status = 'iptal' AND created_at::date = CURRENT_DATE) as cancelled_today;
END;
$$ LANGUAGE plpgsql;