-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "max_concurrent_sessions" INTEGER NOT NULL DEFAULT 1;
