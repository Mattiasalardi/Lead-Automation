-- Create the leads table
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT false,
    page VARCHAR(50),
    source TEXT,
    ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    whatsapp_status VARCHAR(20) DEFAULT 'pending',
    whatsapp_message_id VARCHAR(100),
    whatsapp_error TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_whatsapp_status ON leads(whatsapp_status);
CREATE INDEX idx_leads_page ON leads(page);

-- Add a constraint to ensure consent is true for processing
ALTER TABLE leads ADD CONSTRAINT check_consent CHECK (consent = true);

-- Optional: Create a view for recent leads
CREATE VIEW recent_leads AS
SELECT
    id,
    name,
    phone,
    page,
    source,
    created_at,
    whatsapp_status
FROM leads
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;