-- Update RLS policies for admin_fee_addresses to use correct admin user ID
DROP POLICY IF EXISTS "Only main admin can view fee addresses" ON admin_fee_addresses;
CREATE POLICY "Only main admin can view fee addresses"
ON admin_fee_addresses FOR SELECT
USING (auth.uid() = '0af916bb-1c03-4173-a898-fd4274ae4a2b'::uuid);

-- Update RLS policies for admin_fee_transactions to use correct admin user ID
DROP POLICY IF EXISTS "Only main admin can view fee transactions" ON admin_fee_transactions;
CREATE POLICY "Only main admin can view fee transactions"
ON admin_fee_transactions FOR SELECT
USING (auth.uid() = '0af916bb-1c03-4173-a898-fd4274ae4a2b'::uuid);

-- Update the default value for admin_user_id in admin_fee_addresses
ALTER TABLE admin_fee_addresses ALTER COLUMN admin_user_id SET DEFAULT '0af916bb-1c03-4173-a898-fd4274ae4a2b'::uuid;