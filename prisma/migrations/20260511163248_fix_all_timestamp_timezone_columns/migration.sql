ALTER TABLE "User"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SalesOrder"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "FGUpdatedDateTime" TYPE TIMESTAMPTZ(3)
  USING "FGUpdatedDateTime" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SalesOrderAttachment"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_Data"
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "IssueUpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "IssueUpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "PackingUpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "PackingUpdatedDate" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_Log"
  ALTER COLUMN "date_time" TYPE TIMESTAMPTZ(3)
  USING "date_time" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_File"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "Dispatch"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "Dispatch_SO"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SalesOrderArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "FGUpdatedDateTime" TYPE TIMESTAMPTZ(3)
  USING "FGUpdatedDateTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_DataArchive"
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "IssueUpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "IssueUpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "PackingUpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "PackingUpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_FileArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "DispatchArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "UpdatedDate" TYPE TIMESTAMPTZ(3)
  USING "UpdatedDate" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "Dispatch_SOArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SO_Status_Stepper"
  ALTER COLUMN "createdDateTime" TYPE TIMESTAMPTZ(3)
  USING "createdDateTime" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SO_Status_StepperArchive"
  ALTER COLUMN "createdDateTime" TYPE TIMESTAMPTZ(3)
  USING "createdDateTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "VehicleEntry"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "VehicleEntryArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SalesOrderChatMessage"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SoChatNotification"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SalesOrderChatMessageArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SoChatNotificationArchive"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Material_LogArchive"
  ALTER COLUMN "date_time" TYPE TIMESTAMPTZ(3)
  USING "date_time" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3)
  USING "archivedAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "CustomerLabelPrint"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "ERP_Data_Cron_Logs"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SystemConfig"
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3)
  USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';