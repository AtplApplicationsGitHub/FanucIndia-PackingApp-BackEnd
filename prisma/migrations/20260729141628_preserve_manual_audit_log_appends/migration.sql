-- ============================================================
-- Fix: the SalesOrder audit trigger was unconditionally resetting
-- NEW.audit_logs back to OLD.audit_logs whenever no tracked
-- business column changed. That's correct for a plain no-op save,
-- but it also silently discarded any audit entry an application
-- service explicitly appended via a raw UPDATE (e.g. attachment
-- uploads, which only touch audit_logs and no business columns).
--
-- Fix: only reset audit_logs back to OLD when the caller did NOT
-- also explicitly change audit_logs in the same statement.
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

        -- No business field changed.
        IF changes = '[]'::jsonb THEN
            -- If the caller ALSO didn't explicitly change audit_logs itself
            -- (e.g. a genuine no-op save), keep it untouched as before.
            -- If the caller DID explicitly append to audit_logs in this
            -- same statement (e.g. an attachment-upload audit entry),
            -- preserve what they sent instead of overwriting it.
            IF NEW."audit_logs" IS NOT DISTINCT FROM OLD."audit_logs" THEN
                NEW."audit_logs" := COALESCE(OLD."audit_logs", '[]'::jsonb);
            END IF;
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