-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('KASIR', 'PENERIMA', 'OWNER');
CREATE TYPE payment_method AS ENUM ('TUNAI', 'QRIS');
CREATE TYPE payment_status AS ENUM ('MENUNGGU', 'LUNAS', 'BATAL');
CREATE TYPE queue_status AS ENUM ('BELUM', 'MENUNGGU', 'DIPANGGIL', 'FOTO', 'SELESAI', 'TERLEWAT');
CREATE TYPE order_status AS ENUM ('PROSES', 'SIAP', 'DIAMBIL');

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_days INT,
    is_active BOOLEAN DEFAULT FALSE,
    receipt_format VARCHAR(100) DEFAULT '[HARI]-[KATEGORI]-[BOOTH]-[NOMOR]',
    tv_title VARCHAR(255) DEFAULT 'PHOTOBOOTH EVENT',
    tv_subtitle VARCHAR(255) DEFAULT 'Silakan Menunggu Antrian',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'AKTIF',
    print_settings JSONB,
    receipt_prefix VARCHAR(50),
    receipt_separator VARCHAR(10) DEFAULT '-',
    receipt_start_number INT DEFAULT 1,
    receipt_digit_length INT DEFAULT 3,
    receipt_reset_mode VARCHAR(50) DEFAULT 'DAILY',
    receipt_current_number INT DEFAULT 0
);

-- PARTICIPANT CATEGORIES
CREATE TABLE participant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCT CATEGORIES
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOOTHS
CREATE TABLE booths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100),
    participant_name VARCHAR(255) NOT NULL,
    guardian_name VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    participant_category_id UUID REFERENCES participant_categories(id) ON DELETE SET NULL,
    booth_id UUID REFERENCES booths(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method,
    payment_status payment_status DEFAULT 'MENUNGGU_PEMBAYARAN',
    queue_status queue_status DEFAULT 'BELUM',
    order_status order_status DEFAULT 'PROSES',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    picked_up_by UUID REFERENCES users(id) ON DELETE SET NULL,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    queue_code VARCHAR(100),
    amount_received DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    cancel_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    registration_code VARCHAR(100),
    payment_queue_code VARCHAR(100),
    payment_queue_status queue_status DEFAULT 'MENUNGGU',
    delete_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_event_receipt_number UNIQUE (event_id, receipt_number)
);

-- TRANSACTION ITEMS
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    product_name_snapshot VARCHAR(255),
    product_category_name_snapshot VARCHAR(255)
);
