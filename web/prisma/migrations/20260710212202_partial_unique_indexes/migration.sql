-- Partial unique index: prevents duplicate transactions per provider,
-- but only when provider_tx_id is known. A plain @@unique would not catch
-- duplicates because Postgres treats NULLs as distinct in unique constraints.
CREATE UNIQUE INDEX "Transaction_provider_provider_tx_id_key"
ON "Transaction" ("provider", "provider_tx_id")
WHERE "provider_tx_id" IS NOT NULL;

-- Partial unique index: at most one active subscription per user.
CREATE UNIQUE INDEX "UserSubscription_user_id_active_key"
ON "UserSubscription" ("user_id")
WHERE "is_active";
