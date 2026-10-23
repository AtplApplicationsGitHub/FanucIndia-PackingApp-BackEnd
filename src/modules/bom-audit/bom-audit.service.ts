import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma.service';
import { getIstTimestampRange } from '../../common/utils/date-only.util';
import { CreateBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';
import {
  BOM_AUDIT_INSERT_CHUNK_SIZE,
  BOM_AUDIT_MAX_DATA_ROWS,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_REPORTED_ERRORS,
  BOM_AUDIT_TEMPLATE,
  formatOperatorLabel,
  BOM_AUDIT_NO_DIGITS,
  BOM_AUDIT_NO_LOCK_KEY,
  BOM_AUDIT_NO_PREFIX,
  BOM_AUDIT_STATUS,
} from './bom-audit.constants';
import {
  BomAuditFileError,
  BomAuditParseResult,
  ParsedBomAuditLocation,
  decodeUploadFileName,
  parseBomAuditFile,
} from './bom-audit-file.parser';

export interface BomAuditActor {
  userId: number;
  name: string;
}

const AUDIT_SUMMARY_SELECT = {
  id: true,
  auditNo: true,
  auditName: true,
  fileName: true,
  status: true,
  operatorId: true,
  operatorName: true,
  totalLocations: true,
  totalMaterials: true,
  createdByName: true,
  createdAt: true,
  cancelledAt: true,
  cancelledByName: true,
  // Stage B - handheld timeline (null until it happens)
  downloadedAt: true,
  startedAt: true,
  completedAt: true,
  submittedAt: true,
  uploadBatchId: true,
  // Report Excel on the SFTP server (null until the upload worked)
  reportPath: true,
  reportGeneratedAt: true,
} satisfies Prisma.BomAuditSelect;

type AuditSummary = Prisma.BomAuditGetPayload<{
  select: typeof AUDIT_SUMMARY_SELECT;
}>;

const MAX_AUDIT_NO_ATTEMPTS = 3;

@Injectable()
export class BomAuditService {
  private readonly logger = new Logger(BomAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAudit(
    file: Express.Multer.File | undefined,
    dto: CreateBomAuditDto,
    actor: BomAuditActor,
  ) {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Please upload the BOM audit Excel file.',
      });
    }

    const fileName = decodeUploadFileName(file.originalname || 'upload.xlsx');

    let parsed: BomAuditParseResult;
    try {
      parsed = await parseBomAuditFile(
        Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer),
        fileName,
      );
    } catch (error) {
      if (error instanceof BomAuditFileError) {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          errors: error.rowErrors.length ? error.rowErrors : undefined,
          details: error.totalRowErrors
            ? { totalRowErrors: error.totalRowErrors }
            : null,
        });
      }
      throw error;
    }

    // Audit Name: from the file (template cell / column); the form field is only a fallback
    const auditName = parsed.auditName || dto.auditName || '';
    if (!auditName) {
      throw new BadRequestException({
        code: 'AUDIT_NAME_REQUIRED',
        message: 'Audit Name is missing. Type it in the "Audit Name" cell at the top of the template (row 1).',
      });
    }
    if (auditName.length > BOM_AUDIT_MAX_LENGTH.auditName) {
      throw new BadRequestException({
        code: 'AUDIT_NAME_TOO_LONG',
        message: `Audit Name must be at most ${BOM_AUDIT_MAX_LENGTH.auditName} characters.`,
      });
    }

    // Operators: template -> one per storage bin (Operator column); plain file -> one for the whole file
    const groups = parsed.hasOperatorColumn
      ? await this.resolveOperatorGroups(parsed.locations)
      : [{ operator: await this.getSingleOperator(dto.operatorId), locations: parsed.locations }];

    const uploadBatchId = randomUUID();
    const audits = await this.saveAuditsWithRetry(groups, auditName, fileName, uploadBatchId, actor);

    this.logger.log(
      `BOM audit "${auditName}" created by ${actor.name}: ${audits.length} audit(s) ` +
        `[${audits.map((a) => `${a.auditNo} -> ${a.operatorName}`).join(', ')}], ` +
        `${parsed.totalLocations} locations, ${parsed.totalMaterials} materials`,
    );

    return {
      message:
        audits.length === 1
          ? 'BOM audit created successfully.'
          : `${audits.length} BOM audits created successfully (one per operator).`,
      data: {
        auditName,
        uploadBatchId,
        totalLocations: parsed.totalLocations,
        totalMaterials: parsed.totalMaterials,
        totalRows: parsed.totalRows,
        mergedRows: parsed.mergedRows,
        audits,
      },
    };
  }

  /** Plain file without an Operator column: the operator chosen in the form (previous behaviour). */
  private async getSingleOperator(operatorId: number | undefined) {
    if (!operatorId) {
      throw new BadRequestException({
        code: 'OPERATOR_REQUIRED',
        message:
          'Operator column is missing. Please download the latest template and select an operator for every storage bin.',
      });
    }
    const operator = await this.prisma.user.findUnique({
      where: { id: operatorId },
      select: { id: true, name: true, role: true },
    });
    if (!operator) {
      throw new BadRequestException({
        code: 'OPERATOR_NOT_FOUND',
        message: 'Selected operator does not exist.',
      });
    }
    if (operator.role !== 'USER') {
      throw new BadRequestException({
        code: 'INVALID_OPERATOR',
        message: 'Selected user is not an operator (USER role).',
      });
    }
    return { id: operator.id, name: operator.name };
  }

  /**
   * Template file: turns the Operator text of each storage bin into a user and groups the bins per operator.
   * Accepted text: "Name (email)" from the dropdown (the email decides), a plain email, or a unique name.
   * Only USER-role users are valid. One audit is created per operator, in file order.
   */
  private async resolveOperatorGroups(locations: ParsedBomAuditLocation[]) {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
    });
    const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u]));

    const resolved = new Map<string, { id: number; name: string } | null>();
    const rowErrors: { rowNo: number; errors: string[] }[] = [];

    for (const location of locations) {
      const label = location.operatorLabel ?? '';
      const key = label.toLowerCase();
      if (resolved.has(key)) continue;

      const emailInBrackets = /\(([^()\s]+@[^()\s]+)\)\s*$/.exec(label)?.[1];
      const email = (emailInBrackets ?? (label.includes('@') ? label : '')).trim().toLowerCase();
      let user: { id: number; name: string } | undefined;
      let problem = '';
      // Exact dropdown label "Name (email)" always wins (also works when an email has no "@")
      const exact = users.find((u) => formatOperatorLabel(u.name.trim(), u.email.trim()).toLowerCase() === key);

      if (exact) {
        user = exact;
      } else if (email) {
        user = byEmail.get(email);
        if (!user) problem = `Operator "${label}" was not found or is not an operator (USER role)`;
      } else {
        const sameName = users.filter((u) => u.name.trim().toLowerCase() === key);
        if (sameName.length === 1) user = sameName[0];
        else if (sameName.length > 1) problem = `Operator "${label}" matches ${sameName.length} users - select it from the dropdown`;
        else problem = `Operator "${label}" was not found or is not an operator (USER role)`;
      }

      resolved.set(key, user ? { id: user.id, name: user.name } : null);
      if (problem && rowErrors.length < BOM_AUDIT_MAX_REPORTED_ERRORS) {
        rowErrors.push({ rowNo: location.firstRowNo ?? 0, errors: [problem] });
      }
    }

    if (rowErrors.length) {
      rowErrors.sort((a, b) => a.rowNo - b.rowNo);
      throw new BadRequestException({
        code: 'INVALID_OPERATORS',
        message: `${rowErrors.length} operator(s) in the file are not valid. Please select operators from the template dropdown.`,
        errors: rowErrors,
      });
    }

    // Group bins per user (two spellings of the same user end up in one audit)
    const groups = new Map<number, { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[]; firstRowNo: number }>();
    for (const location of locations) {
      const operator = resolved.get((location.operatorLabel ?? '').toLowerCase())!;
      const group = groups.get(operator.id);
      const rowNo = location.firstRowNo ?? 0;
      if (group) {
        group.locations.push(location);
        group.firstRowNo = Math.min(group.firstRowNo, rowNo);
      } else {
        groups.set(operator.id, { operator, locations: [location], firstRowNo: rowNo });
      }
    }
    return [...groups.values()].sort((a, b) => a.firstRowNo - b.firstRowNo);
  }

  private async saveAuditsWithRetry(
    groups: { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[] }[],
    auditName: string,
    fileName: string,
    uploadBatchId: string,
    actor: BomAuditActor,
  ): Promise<AuditSummary[]> {
    for (let attempt = 1; attempt <= MAX_AUDIT_NO_ATTEMPTS; attempt++) {
      try {
        // All audits of one file are saved together: all or nothing
        return await this.prisma.$transaction(
          async (tx) => {
            const saved: AuditSummary[] = [];
            for (const group of groups) {
              saved.push(
                await this.saveAudit(tx, group.locations, auditName, fileName, group.operator, actor, uploadBatchId),
              );
            }
            return saved;
          },
          { timeout: 60_000 },
        );
      } catch (error) {
        const isAuditNoClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          `${JSON.stringify(error.meta ?? {})} ${error.message}`.includes(
            'auditNo',
          );
        if (isAuditNoClash && attempt < MAX_AUDIT_NO_ATTEMPTS) continue;

        this.logger.error(
          `Failed to save BOM audit (${fileName})`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException({
          code: 'BOM_AUDIT_SAVE_FAILED',
          message: 'Failed to save the BOM audit. Please try again.',
        });
      }
    }
    throw new InternalServerErrorException({
      code: 'BOM_AUDIT_SAVE_FAILED',
      message: 'Failed to save the BOM audit. Please try again.',
    });
  }

  private async saveAudit(
    tx: Prisma.TransactionClient,
    locations: ParsedBomAuditLocation[],
    auditName: string,
    fileName: string,
    operator: { id: number; name: string },
    actor: BomAuditActor,
    uploadBatchId: string,
  ): Promise<AuditSummary> {
    const auditNo = await this.nextAuditNo(tx);

    const audit = await tx.bomAudit.create({
      data: {
        auditNo,
        auditName,
        fileName,
        status: BOM_AUDIT_STATUS.ASSIGNED,
        operatorId: operator.id,
        operatorName: operator.name,
        totalLocations: locations.length,
        totalMaterials: locations.reduce((sum, l) => sum + l.materials.length, 0),
        createdById: actor.userId,
        createdByName: actor.name,
        uploadBatchId,
      },
      select: AUDIT_SUMMARY_SELECT,
    });

    // sequenceNo restarts at 1 in every audit (each operator walks only their own bins)
    const locationRows = locations.map((location, index) => ({
      auditId: audit.id,
      storageBin: location.storageBin,
      sequenceNo: index + 1,
      expectedMaterials: location.materials.length,
    }));
    for (const chunk of this.chunk(locationRows)) {
      await tx.bomAuditLocation.createMany({ data: chunk });
    }

    const savedLocations = await tx.bomAuditLocation.findMany({
      where: { auditId: audit.id },
      select: { id: true, storageBin: true },
    });
    const locationIdByBin = new Map(
      savedLocations.map((l) => [l.storageBin, l.id]),
    );

    const materialRows = locations.flatMap((location) => {
      const auditLocationId = locationIdByBin.get(location.storageBin);
      if (auditLocationId === undefined) {
        throw new Error(`Location ${location.storageBin} was not saved`);
      }
      return location.materials.map((material) => ({
        auditLocationId,
        auditId: audit.id,
        materialCode: material.materialCode,
        expectedQty: material.expectedQty,
      }));
    });
    for (const chunk of this.chunk(materialRows)) {
      await tx.bomAuditMaterial.createMany({ data: chunk });
    }

    return audit;
  }

  private async nextAuditNo(tx: Prisma.TransactionClient): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOM_AUDIT_NO_LOCK_KEY}::bigint)`;

    const year = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    }).format(new Date());
    const prefix = `${BOM_AUDIT_NO_PREFIX}-${year}-`;

    const last = await tx.bomAudit.findFirst({
      where: { auditNo: { startsWith: prefix } },
      orderBy: { auditNo: 'desc' },
      select: { auditNo: true },
    });
    const lastNumber = last ? Number(last.auditNo.slice(prefix.length)) : 0;
    const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
    return `${prefix}${String(next).padStart(BOM_AUDIT_NO_DIGITS, '0')}`;
  }

  private chunk<T>(rows: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < rows.length; i += BOM_AUDIT_INSERT_CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + BOM_AUDIT_INSERT_CHUNK_SIZE));
    }
    return chunks;
  }

  /**
   * Downloadable Excel template: "Audit Name" cell at the top, the SAP / LX03 columns and an Operator
   * column with a dropdown of all operators (USER role) shown as "Name (email)".
   * Built fresh on every download, so new operators appear automatically.
   */
  async buildTemplate(): Promise<Buffer> {
    const T = BOM_AUDIT_TEMPLATE;
    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { name: true, email: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DIMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(T.sheetName, {
      views: [{ state: 'frozen', ySplit: T.headerRowNo }],
    });
    const lastCol = T.columns.length;
    const colLetter = (n: number) => sheet.getColumn(n).letter;
    const thin = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
    const box = { top: thin, left: thin, bottom: thin, right: thin };

    // Row 1 - Audit Name (typed once)
    sheet.getCell('A1').value = 'Audit Name';
    sheet.getCell('A1').font = { bold: true, size: 12 };
    sheet.mergeCells('B1:E1');
    const nameCell = sheet.getCell('B1');
    nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    nameCell.border = box;
    nameCell.font = { bold: true, size: 12 };
    sheet.getRow(1).height = 22;

    // Row 2 - column headers (required ones highlighted).
    // (The instruction line that used to be here was removed on client request - the steps are shown on the web screen.)
    const header = sheet.getRow(T.headerRowNo);
    T.columns.forEach((col, i) => {
      const cell = header.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      cell.border = box;
      cell.alignment = { vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'required' in col && col.required ? 'FFFFD966' : 'FFE7E6E6' },
      };
      sheet.getColumn(i + 1).width = col.width;
      // Material codes as text, so codes like 0123 keep their leading zero
      if ('text' in col && col.text) sheet.getColumn(i + 1).numFmt = '@';
    });
    header.height = 20;

    // Hidden list of operators for the dropdown
    const listSheet = workbook.addWorksheet(T.operatorSheetName);
    listSheet.state = 'hidden';
    listSheet.getCell('A1').value = 'Operator';
    const labels = operators.length
      ? operators.map((o) => formatOperatorLabel(o.name, o.email))
      : ['(no operators found - add users with the USER role)'];
    labels.forEach((label, i) => (listSheet.getCell(i + 2, 1).value = label));
    listSheet.getColumn(1).width = 45;

    const opCol = T.columns.findIndex((c) => 'operator' in c && c.operator) + 1;
    const opLetter = colLetter(opCol);
    const lastDataRow = T.headerRowNo + BOM_AUDIT_MAX_DATA_ROWS;
    // ExcelJS supports worksheet.dataValidations (range addresses too), but its type definitions omit it
    const validations = (
      sheet as unknown as {
        dataValidations: { add(address: string, validation: ExcelJS.DataValidation): void };
      }
    ).dataValidations;
    validations.add(`${opLetter}${T.firstDataRowNo}:${opLetter}${lastDataRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`'${T.operatorSheetName}'!$A$2:$A$${labels.length + 1}`],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid operator',
      error: 'Please select an operator from the list.',
      showInputMessage: true,
      promptTitle: 'Operator',
      prompt: 'Select the operator for this storage bin.',
    });

    sheet.autoFilter = { from: { row: T.headerRowNo, column: 1 }, to: { row: T.headerRowNo, column: lastCol } };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async getOperators() {
    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return {
      message: 'Operators fetched successfully.',
      count: operators.length,
      data: operators,
    };
  }

  async findAll(query: QueryBomAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.BomAuditWhereInput = {};

    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { auditNo: { contains: query.search, mode: 'insensitive' } },
        { auditName: { contains: query.search, mode: 'insensitive' } },
        { fileName: { contains: query.search, mode: 'insensitive' } },
        { operatorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.fromDate || query.toDate) {
      const from = query.fromDate
        ? getIstTimestampRange(query.fromDate)
        : undefined;
      const to = query.toDate ? getIstTimestampRange(query.toDate) : undefined;
      if (from && to && from.startOfDay >= to.endOfDay) {
        throw new BadRequestException({
          code: 'INVALID_DATE_RANGE',
          message: 'fromDate must be on or before toDate.',
        });
      }
      where.createdAt = {
        ...(from ? { gte: from.startOfDay } : {}),
        ...(to ? { lt: to.endOfDay } : {}),
      };
    }

    const [total, audits] = await this.prisma.$transaction([
      this.prisma.bomAudit.count({ where }),
      this.prisma.bomAudit.findMany({
        where,
        select: AUDIT_SUMMARY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      message: 'BOM audits fetched successfully.',
      data: audits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      select: {
        ...AUDIT_SUMMARY_SELECT,
        updatedAt: true,
        locations: {
          orderBy: { sequenceNo: 'asc' },
          select: {
            id: true,
            sequenceNo: true,
            storageBin: true,
            expectedMaterials: true,
            materials: {
              // Uploaded lines only - handheld UNEXPECTED rows are part of the Stage C review
              where: { isUnexpected: false },
              orderBy: { materialCode: 'asc' },
              select: { id: true, materialCode: true, expectedQty: true },
            },
          },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException({
        code: 'BOM_AUDIT_NOT_FOUND',
        message: `BOM audit with ID ${id} not found.`,
      });
    }

    return { message: 'BOM audit fetched successfully.', data: audit };
  }

  async cancel(id: number, actor: BomAuditActor) {
    const result = await this.prisma.bomAudit.updateMany({
      where: { id, status: BOM_AUDIT_STATUS.ASSIGNED },
      data: {
        status: BOM_AUDIT_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelledByName: actor.name,
      },
    });

    if (result.count === 0) {
      const existing = await this.prisma.bomAudit.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'BOM_AUDIT_NOT_FOUND',
          message: `BOM audit with ID ${id} not found.`,
        });
      }
      throw new ConflictException({
        code: 'BOM_AUDIT_NOT_CANCELLABLE',
        message: `Only ASSIGNED audits can be cancelled. This audit is ${existing.status}.`,
      });
    }

    const audit = await this.prisma.bomAudit.findUniqueOrThrow({
      where: { id },
      select: AUDIT_SUMMARY_SELECT,
    });

    this.logger.log(`BOM audit ${audit.auditNo} cancelled by ${actor.name}`);

    return { message: 'BOM audit cancelled successfully.', data: audit };
  }
}
