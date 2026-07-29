-- ============================================================
-- SalesOrder JSON audit-trail trigger
-- Requires:
--   "SalesOrder"."audit_logs" JSONB NOT NULL DEFAULT '[]'
--   "SalesOrderArchive"."audit_logs" JSONB NOT NULL DEFAULT '[]'
-- ============================================================

CREATE OR REPLACE FUNCTION "fn_sales_order_audit_log"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    audit_entry       JSONB;
    changes           JSONB;
    next_serial       INTEGER;
    actor_name        TEXT;
    creator_name      TEXT;
    order_reference   TEXT;
BEGIN
    order_reference :=
        COALESCE(NEW."saleOrderNumber", '') ||
        '_' ||
        COALESCE(NEW."outboundDelivery", '');

    ----------------------------------------------------------------
    -- ORDER CREATED
    ----------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        SELECT "name"
        INTO creator_name
        FROM "User"
        WHERE "id" = NEW."userId"
        LIMIT 1;

        creator_name := COALESCE(
            NULLIF(creator_name, ''),
            NULLIF(NEW."UpdatedBy", ''),
            NULLIF(NEW."FGUpdatedBy", ''),
            'SYSTEM'
        );

        audit_entry := jsonb_build_object(
            'serialNumber', 1,
            'action', 'ORDER_CREATED',
            'description', 'Order Created: ' || order_reference,
            'orderReference', jsonb_build_object(
                'saleOrderNumber', NEW."saleOrderNumber",
                'outboundDelivery', NEW."outboundDelivery"
            ),
            'createdBy', creator_name,
            'createdAt', COALESCE(NEW."createdAt", CURRENT_TIMESTAMP)
        );

        NEW."audit_logs" := jsonb_build_array(audit_entry);

        RETURN NEW;
    END IF;

    ----------------------------------------------------------------
    -- ORDER UPDATED
    ----------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        /*
         * Compare every SalesOrder field except audit/automatic metadata.
         *
         * Excluded:
         * audit_logs  : prevents recursive audit data
         * updatedAt   : Prisma automatically changes it on every update
         * UpdatedDate : application-maintained update timestamp
         *
         * UpdatedBy and FGUpdatedBy are not displayed as business-field
         * changes. They are used to identify the person performing the
         * update.
         */
        SELECT COALESCE(
            jsonb_agg(
                jsonb_strip_nulls(
                    jsonb_build_object(
                        'field', old_data.key,
                        'oldValue', old_data.value,
                        'newValue', new_data.value,

                        'oldDisplayValue',
                        CASE
                            WHEN old_data.key = 'transporterId'
                                 AND old_data.value IS NOT NULL
                                 AND old_data.value <> 'null'::jsonb
                            THEN (
                                SELECT to_jsonb(t."name")
                                FROM "Transporter" t
                                WHERE t."id" =
                                    (old_data.value #>> '{}')::INTEGER
                                LIMIT 1
                            )
                            ELSE NULL
                        END,

                        'newDisplayValue',
                        CASE
                            WHEN new_data.key = 'transporterId'
                                 AND new_data.value IS NOT NULL
                                 AND new_data.value <> 'null'::jsonb
                            THEN (
                                SELECT to_jsonb(t."name")
                                FROM "Transporter" t
                                WHERE t."id" =
                                    (new_data.value #>> '{}')::INTEGER
                                LIMIT 1
                            )
                            ELSE NULL
                        END
                    )
                )
                ORDER BY old_data.key
            ),
            '[]'::jsonb
        )
        INTO changes
        FROM jsonb_each(
            to_jsonb(OLD) -
            ARRAY[
                'audit_logs',
                'updatedAt',
                'UpdatedDate',
                'UpdatedBy',
                'FGUpdatedDateTime',
                'FGUpdatedBy'
            ]::TEXT[]
        ) AS old_data(key, value)
        INNER JOIN jsonb_each(
            to_jsonb(NEW) -
            ARRAY[
                'audit_logs',
                'updatedAt',
                'UpdatedDate',
                'UpdatedBy',
                'FGUpdatedDateTime',
                'FGUpdatedBy'
            ]::TEXT[]
        ) AS new_data(key, value)
            ON new_data.key = old_data.key
        WHERE old_data.value IS DISTINCT FROM new_data.value;

        -- Do not create an audit entry when no business data changed.
        IF changes = '[]'::jsonb THEN
            NEW."audit_logs" := COALESCE(OLD."audit_logs", '[]'::jsonb);
            RETURN NEW;
        END IF;

        actor_name := COALESCE(
            NULLIF(BTRIM(NEW."UpdatedBy"), ''),
            NULLIF(BTRIM(NEW."FGUpdatedBy"), ''),
            'SYSTEM'
        );

        next_serial :=
            jsonb_array_length(
                COALESCE(OLD."audit_logs", '[]'::jsonb)
            ) + 1;

        audit_entry := jsonb_build_object(
            'serialNumber', next_serial,
            'action', 'ORDER_UPDATED',
            'description', 'Order Updated: ' || order_reference,
            'orderReference', jsonb_build_object(
                'saleOrderNumber', NEW."saleOrderNumber",
                'outboundDelivery', NEW."outboundDelivery"
            ),
            'changes', changes,
            'updatedBy', actor_name,
            'updatedAt', CURRENT_TIMESTAMP
        );

        NEW."audit_logs" :=
            COALESCE(OLD."audit_logs", '[]'::jsonb) ||
            jsonb_build_array(audit_entry);

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Remove an older trigger with the same name, if present.
DROP TRIGGER IF EXISTS "trg_sales_order_audit_log"
ON "SalesOrder";

-- The BEFORE trigger updates NEW.audit_logs within the same transaction.
CREATE TRIGGER "trg_sales_order_audit_log"
BEFORE INSERT OR UPDATE
ON "SalesOrder"
FOR EACH ROW
EXECUTE FUNCTION "fn_sales_order_audit_log"();


-- ============================================================
-- Backfill existing SalesOrder rows
-- Adds ORDER_CREATED as serial number 1 only when audit_logs is
-- currently null or empty.
-- ============================================================

UPDATE "SalesOrder" so
SET "audit_logs" = jsonb_build_array(
    jsonb_build_object(
        'serialNumber', 1,
        'action', 'ORDER_CREATED',
        'description',
            'Order Created: ' ||
            COALESCE(so."saleOrderNumber", '') ||
            '_' ||
            COALESCE(so."outboundDelivery", ''),
        'orderReference', jsonb_build_object(
            'saleOrderNumber', so."saleOrderNumber",
            'outboundDelivery', so."outboundDelivery"
        ),
        'createdBy', COALESCE(
            (
                SELECT u."name"
                FROM "User" u
                WHERE u."id" = so."userId"
                LIMIT 1
            ),
            NULLIF(so."UpdatedBy", ''),
            NULLIF(so."FGUpdatedBy", ''),
            'SYSTEM'
        ),
        'createdAt', so."createdAt"
    )
)
WHERE so."audit_logs" IS NULL
   OR so."audit_logs" = '[]'::jsonb;


-- ============================================================
-- Backfill existing archived orders
-- This does not overwrite archive rows that already contain logs.
-- ============================================================

UPDATE "SalesOrderArchive" soa
SET "audit_logs" = jsonb_build_array(
    jsonb_build_object(
        'serialNumber', 1,
        'action', 'ORDER_CREATED',
        'description',
            'Order Created: ' ||
            COALESCE(soa."saleOrderNumber", '') ||
            '_' ||
            COALESCE(soa."outboundDelivery", ''),
        'orderReference', jsonb_build_object(
            'saleOrderNumber', soa."saleOrderNumber",
            'outboundDelivery', soa."outboundDelivery"
        ),
        'createdBy', COALESCE(
            (
                SELECT u."name"
                FROM "User" u
                WHERE u."id" = soa."userId"
                LIMIT 1
            ),
            NULLIF(soa."UpdatedBy", ''),
            NULLIF(soa."FGUpdatedBy", ''),
            'SYSTEM'
        ),
        'createdAt', soa."createdAt"
    ),
    jsonb_build_object(
        'serialNumber', 2,
        'action', 'ORDER_ARCHIVED',
        'description',
            'Order Archived: ' ||
            COALESCE(soa."saleOrderNumber", '') ||
            '_' ||
            COALESCE(soa."outboundDelivery", ''),
        'orderReference', jsonb_build_object(
            'saleOrderNumber', soa."saleOrderNumber",
            'outboundDelivery', soa."outboundDelivery"
        ),
        'archivedBy', COALESCE(
            NULLIF(soa."UpdatedBy", ''),
            'SYSTEM'
        ),
        'archivedAt', soa."archivedAt"
    )
)
WHERE soa."audit_logs" IS NULL
   OR soa."audit_logs" = '[]'::jsonb;