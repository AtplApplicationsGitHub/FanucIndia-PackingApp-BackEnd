-- Activity is tied to a stock row version and expires independently of stock history.
CREATE TABLE "FreeStockReservationPreviewItem" (
    "previewId" UUID NOT NULL,
    "stockItemId" INTEGER NOT NULL,
    "salesUserId" INTEGER NOT NULL,
    "stockUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FreeStockPreview_pkey" PRIMARY KEY ("previewId", "stockItemId")
);

CREATE INDEX "FreeStockPreview_stock_version_expiry_idx"
ON "FreeStockReservationPreviewItem"("stockItemId", "stockUpdatedAt", "expiresAt");

CREATE INDEX "FreeStockPreview_expiry_idx"
ON "FreeStockReservationPreviewItem"("expiresAt");
