-- Attune schema addition: budget_data column on profiles
-- Required by the Shared Budget Tool for cross-device sync.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget_data jsonb;

-- Notes:
-- * Saved from src/App.jsx → BudgetTool → save()
-- * Shape: { incomes, pooling, expenses, personal, goals }
-- * Without this column, localStorage writes still succeed (try/catch in app);
--   only cross-device sync fails.
