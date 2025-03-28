-- CreateTable
CREATE TABLE "passenger_types" (
    "type" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(100) NOT NULL,

    CONSTRAINT "passenger_types_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "available_slots" (
    "product_id" VARCHAR(10) NOT NULL,
    "slot_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "available_slots_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "original_price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(10,2) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pax_availability" (
    "id" SERIAL NOT NULL,
    "product_id" VARCHAR(10) NOT NULL,
    "slot_id" TEXT NOT NULL,
    "pax_type" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "price_id" INTEGER NOT NULL,

    CONSTRAINT "slot_pax_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_slot_datetime" ON "available_slots"("start_date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "prices_original_price_discount_final_price_currency_code_key" ON "prices"("original_price", "discount", "final_price", "currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "slot_pax_availability_slot_id_pax_type_key" ON "pax_availability"("slot_id", "pax_type");

-- AddForeignKey
ALTER TABLE "pax_availability" ADD CONSTRAINT "slot_pax_availability_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "available_slots"("slot_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pax_availability" ADD CONSTRAINT "slot_pax_availability_pax_type_fkey" FOREIGN KEY ("pax_type") REFERENCES "passenger_types"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pax_availability" ADD CONSTRAINT "slot_pax_availability_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;