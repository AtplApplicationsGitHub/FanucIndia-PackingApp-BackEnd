BEGIN;

-- Keep rack assignments even when the last location level is deleted.
CREATE TABLE "LocationRack" (
    "materialBarcode" VARCHAR(15) NOT NULL,
    "plantCode" TEXT NOT NULL,
    "rackKey" TEXT NOT NULL,
    CONSTRAINT "LocationRack_pkey" PRIMARY KEY ("materialBarcode"),
    CONSTRAINT "LocationRack_barcode_format" CHECK ("materialBarcode" ~ '^[A-Za-z0-9]{15}$'),
    CONSTRAINT "LocationRack_plant_required" CHECK (btrim("plantCode") <> ''),
    CONSTRAINT "LocationRack_rack_key_format" CHECK ("rackKey" ~ '^[^-]+-[^-]+$')
);

CREATE UNIQUE INDEX "LocationRack_plantCode_rackKey_key"
    ON "LocationRack"("plantCode", "rackKey");
CREATE UNIQUE INDEX "LocationRack_plantCode_materialBarcode_key"
    ON "LocationRack"("plantCode", "materialBarcode");

CREATE TABLE "Location" (
    "plantCode" TEXT NOT NULL,
    "materialBarcode" VARCHAR(15) NOT NULL,
    "rackNumber" TEXT NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("plantCode", "rackNumber"),
    CONSTRAINT "Location_rack_number_format" CHECK ("rackNumber" ~ '^[^-]+-[^-]+-[^-]+$'),
    CONSTRAINT "Location_plantCode_materialBarcode_fkey"
        FOREIGN KEY ("plantCode", "materialBarcode")
        REFERENCES "LocationRack"("plantCode", "materialBarcode")
        ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX "Location_plantCode_materialBarcode_idx"
    ON "Location"("plantCode", "materialBarcode");

CREATE FUNCTION "location_keep_rack_assignment"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Location rack assignments are permanent' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "LocationRack_keep_assignment"
BEFORE UPDATE OR DELETE ON "LocationRack"
FOR EACH ROW EXECUTE FUNCTION "location_keep_rack_assignment"();

CREATE FUNCTION "location_validate_level_assignment"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    expected_rack_key TEXT := split_part(NEW."rackNumber", '-', 1)
        || '-' || split_part(NEW."rackNumber", '-', 3);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW."plantCode" IS DISTINCT FROM OLD."plantCode"
            OR NEW."materialBarcode" IS DISTINCT FROM OLD."materialBarcode" THEN
            RAISE EXCEPTION 'Plant Code and Material Barcode cannot be changed'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "LocationRack"
        WHERE "plantCode" = NEW."plantCode"
          AND "materialBarcode" = NEW."materialBarcode"
          AND "rackKey" = expected_rack_key
    ) THEN
        RAISE EXCEPTION 'The level must belong to the assigned rack'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "Location_validate_level_assignment"
BEFORE INSERT OR UPDATE ON "Location"
FOR EACH ROW EXECUTE FUNCTION "location_validate_level_assignment"();

COMMIT;
