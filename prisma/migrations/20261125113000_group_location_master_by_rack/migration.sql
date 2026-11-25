BEGIN;

ALTER TABLE "LocationRack" RENAME COLUMN "materialBarcode" TO "masterBarcode";
ALTER TABLE "Location" RENAME COLUMN "materialBarcode" TO "masterBarcode";

ALTER TABLE "Location"
    RENAME CONSTRAINT "Location_plantCode_materialBarcode_fkey"
    TO "Location_plantCode_masterBarcode_fkey";
ALTER INDEX "Location_plantCode_materialBarcode_idx"
    RENAME TO "Location_plantCode_masterBarcode_idx";
ALTER INDEX "LocationRack_plantCode_materialBarcode_key"
    RENAME TO "LocationRack_plantCode_masterBarcode_key";

-- Keep the existing global barcode uniqueness while adding a rack ID.
CREATE UNIQUE INDEX "LocationRack_masterBarcode_key"
    ON "LocationRack"("masterBarcode");
ALTER TABLE "LocationRack" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "LocationRack"
    DROP CONSTRAINT "LocationRack_pkey",
    ADD CONSTRAINT "LocationRack_pkey" PRIMARY KEY ("id");

CREATE OR REPLACE FUNCTION "location_validate_level_assignment"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    expected_rack_key TEXT := split_part(NEW."rackNumber", '-', 1)
        || '-' || split_part(NEW."rackNumber", '-', 3);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW."plantCode" IS DISTINCT FROM OLD."plantCode"
            OR NEW."masterBarcode" IS DISTINCT FROM OLD."masterBarcode" THEN
            RAISE EXCEPTION 'Plant Code and Master Barcode cannot be changed'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "LocationRack"
        WHERE "plantCode" = NEW."plantCode"
          AND "masterBarcode" = NEW."masterBarcode"
          AND "rackKey" = expected_rack_key
    ) THEN
        RAISE EXCEPTION 'The level must belong to the assigned rack'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

COMMIT;
