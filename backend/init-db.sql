-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ghl_bayarcash;
USE ghl_bayarcash;

-- GHL Integrations Table
CREATE TABLE IF NOT EXISTS ghl_integrations (
  location_id VARCHAR(100) PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(20),
  expires_in INT,
  scope TEXT,
  user_type VARCHAR(50),
  company_id VARCHAR(100),
  user_id VARCHAR(100),
  
  -- BayarCash Live Credentials
  bayarcash_live_pat VARCHAR(255),
  bayarcash_live_secret VARCHAR(255),
  
  -- BayarCash Test Credentials
  bayarcash_test_pat VARCHAR(255),
  bayarcash_test_secret VARCHAR(255),
  
  -- Payment Provider Configuration
  live_provider_id VARCHAR(100),
  test_provider_id VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_company_id (company_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Transactions Table (optional, for tracking)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  bayarcash_order_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MYR',
  status VARCHAR(50) NOT NULL,
  mode VARCHAR(10) NOT NULL, -- 'live' or 'test'
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_location_id (location_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  FOREIGN KEY (location_id) REFERENCES ghl_integrations(location_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
