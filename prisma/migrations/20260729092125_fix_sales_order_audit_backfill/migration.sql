-- Temporarily disable the trigger so audit_logs can be backfilled directly.
ALTER TABLE "SalesOrder"
DISABLE TRIGGER "trg_sales_order_audit_log";

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

ALTER TABLE "SalesOrder"
ENABLE TRIGGER "trg_sales_order_audit_log";


-- Backfill archived orders.
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