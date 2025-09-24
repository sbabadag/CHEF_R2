-- Tea Orders Kitchen App - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create the tea_orders table
CREATE TABLE IF NOT EXISTS tea_orders (
    id SERIAL PRIMARY KEY,
    tea_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    customer_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_tea_orders_status ON tea_orders(status);
CREATE INDEX IF NOT EXISTS idx_tea_orders_created_at ON tea_orders(created_at);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function
DROP TRIGGER IF EXISTS update_tea_orders_updated_at ON tea_orders;
CREATE TRIGGER update_tea_orders_updated_at
    BEFORE UPDATE ON tea_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO tea_orders (tea_type, quantity, customer_name, status, special_instructions) VALUES
('Black Tea', 2, 'John Doe', 'pending', 'Extra strong'),
('Green Tea', 1, 'Jane Smith', 'pending', 'No sugar'),
('Earl Grey', 1, 'Bob Johnson', 'preparing', 'With lemon'),
('Chamomile', 1, 'Alice Brown', 'pending', 'Extra hot'),
('Oolong', 2, 'Charlie Wilson', 'ready', NULL);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE tea_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for security)
-- CREATE POLICY "Allow all operations on tea_orders" ON tea_orders
-- FOR ALL USING (true) WITH CHECK (true);

-- View to get orders with formatted timestamps
CREATE OR REPLACE VIEW tea_orders_formatted AS
SELECT 
    id,
    tea_type,
    quantity,
    customer_name,
    status,
    special_instructions,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))::INT AS seconds_since_order,
    CASE 
        WHEN status = 'pending' THEN 'New Order'
        WHEN status = 'preparing' THEN 'In Progress'
        WHEN status = 'ready' THEN 'Ready for Pickup'
        WHEN status = 'completed' THEN 'Completed'
        WHEN status = 'cancelled' THEN 'Cancelled'
    END AS status_display
FROM tea_orders
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'preparing' THEN 2
        WHEN 'ready' THEN 3
        WHEN 'completed' THEN 4
        WHEN 'cancelled' THEN 5
    END,
    created_at ASC;

-- Function to get order statistics
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS TABLE(
    total_orders BIGINT,
    pending_orders BIGINT,
    preparing_orders BIGINT,
    ready_orders BIGINT,
    completed_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM tea_orders) as total_orders,
        (SELECT COUNT(*) FROM tea_orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM tea_orders WHERE status = 'preparing') as preparing_orders,
        (SELECT COUNT(*) FROM tea_orders WHERE status = 'ready') as ready_orders,
        (SELECT COUNT(*) FROM tea_orders WHERE status = 'completed' AND created_at::date = CURRENT_DATE) as completed_today;
END;
$$ LANGUAGE plpgsql;