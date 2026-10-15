ALTER TABLE shafak_store_transactions
  DROP CONSTRAINT IF EXISTS shafak_store_transactions_operation_type_check;

ALTER TABLE shafak_store_transactions
  ADD CONSTRAINT shafak_store_transactions_operation_type_check
  CHECK (operation_type IN ('purchase', 'upgrade', 'sell', 'salvage'));
