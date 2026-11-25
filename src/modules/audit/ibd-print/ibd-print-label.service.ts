import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createConnection, isIP } from 'node:net';
import { posix } from 'node:path';
import { PrismaService } from '../../../prisma.service';
import { SftpService } from '../../sftp/sftp.service';
import { IbdLanPrintDto, IbdPrnPreviewDto } from './ibd-print.dto';
import { renderIbdPrn } from './ibd-print-prn';
import { IbdPrintService } from './ibd-print.service';

const PRINTER_PORT = 9100;
const PRINTER_TIMEOUT_MS = 5000;

@Injectable()
export class IbdPrintLabelService {
  constructor(
    private readonly uploads: IbdPrintService,
    private readonly prisma: PrismaService,
    private readonly sftp: SftpService,
  ) {}

  async preview(uploadId: number, dto: IbdPrnPreviewDto = {}) {
    return this.buildJob(uploadId, dto);
  }

  async print(uploadId: number, dto: IbdLanPrintDto) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: dto.printerId },
      select: { id: true, name: true },
    });
    if (!printer) throw new NotFoundException('Printer was not found in Printers Master.');

    const host = printer.name.trim();
    if (!isIP(host)) {
      throw new BadRequestException('The selected printer must have an IP address in Printers Master.');
    }

    const { prn, ...job } = await this.buildJob(uploadId, dto);
    await this.send(host, prn);

    return {
      ...job,
      printerId: printer.id,
      status: 'SENT',
      message: 'The PRN payload was sent to the LAN printer.',
    };
  }

  private async buildJob(uploadId: number, { rowIds, quantity = 1 }: IbdPrnPreviewDto) {
    const { data } = await this.uploads.printData(uploadId, rowIds);
    if (!data.length) throw new BadRequestException('This upload has no rows to print.');

    const path = posix.join(
      process.env.PRN_FILE_PATH || 'uploads/fanuc/prn-files/',
      process.env.IBD_PRINT_PRN_FILE || 'IBD_PRINT.prn',
    );
    let template: Buffer;
    try {
      template = await this.sftp.getBuffer(path);
    } catch {
      throw new ServiceUnavailableException(`Could not read the IBD Print template from SFTP at ${path}.`);
    }

    return {
      uploadId,
      rowCount: data.length,
      quantity,
      totalLabels: data.length * quantity,
      prn: renderIbdPrn(template.toString('utf8'), data, quantity),
    };
  }

  private send(host: string, prn: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port: PRINTER_PORT });
      socket.setTimeout(PRINTER_TIMEOUT_MS);
      socket.once('connect', () => socket.end(prn, 'utf8'));
      socket.once('finish', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => reject(new BadGatewayException('The LAN printer connection failed.')));
      socket.once('close', () => reject(new BadGatewayException('The LAN printer connection closed before the job was sent.')));
      socket.once('timeout', () => {
        socket.destroy();
        reject(new BadGatewayException('The LAN printer connection timed out.'));
      });
    });
  }
}
