-- Drop unused tables that are no longer used in the application

-- 1. bitcoin_addresses - replaced by admin_fee_addresses for pool addresses
DROP TABLE IF EXISTS public.bitcoin_addresses CASCADE;

-- 2. deposit_memos - old deposit system, replaced by deposit_requests
DROP TABLE IF EXISTS public.deposit_memos CASCADE;

-- 3. credit_purchases - old credit system, not used anymore
DROP TABLE IF EXISTS public.credit_purchases CASCADE;

-- 4. credit_transactions - old credit system, not used anymore  
DROP TABLE IF EXISTS public.credit_transactions CASCADE;

-- 5. credit_withdrawals - old credit system, replaced by withdrawal_requests
DROP TABLE IF EXISTS public.credit_withdrawals CASCADE;

-- 6. escrow_wallet_pool - old escrow system, replaced by admin_fee_addresses
DROP TABLE IF EXISTS public.escrow_wallet_pool CASCADE;