-- Update the valid_transaction_type check constraint to allow 'sale' type
ALTER TABLE credit_transactions 
DROP CONSTRAINT IF EXISTS valid_transaction_type;

ALTER TABLE credit_transactions
ADD CONSTRAINT valid_transaction_type 
CHECK (type IN ('purchase', 'sale', 'refund', 'adjustment'));