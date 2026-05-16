-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('STAKE', 'WITHDRAW', 'CLAIM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stake_events" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "amount" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stake_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "stake_events_tx_hash_key" ON "stake_events"("tx_hash");

-- CreateIndex
CREATE INDEX "stake_events_user_address_type_idx" ON "stake_events"("user_address", "type");

-- CreateIndex
CREATE INDEX "stake_events_timestamp_idx" ON "stake_events"("timestamp");

-- CreateIndex
CREATE INDEX "stake_events_block_number_idx" ON "stake_events"("block_number");
