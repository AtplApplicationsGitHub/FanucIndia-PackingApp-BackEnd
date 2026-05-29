import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CreateManualFgStorageDto } from './dto/create-manual-fg-storage.dto';

@Injectable()
export class ManualFgStoragePayloadPipe implements PipeTransform {
  transform(value: unknown) {
    const isBulkPayload = Array.isArray(value);
    const entries = isBulkPayload ? value : [value];

    if (entries.length === 0) {
      throw new BadRequestException([
        'At least one manual FG storage entry is required.',
      ]);
    }

    const dtos = entries.map((entry) => {
      if (!this.isObject(entry)) {
        throw new BadRequestException([
          'Each manual FG storage entry must be an object.',
        ]);
      }

      return plainToInstance(CreateManualFgStorageDto, entry);
    });

    const messages = dtos.flatMap((dto, index) =>
      this.getValidationMessages(dto, index, isBulkPayload),
    );

    if (messages.length > 0) {
      throw new BadRequestException(messages);
    }

    return isBulkPayload ? dtos : dtos[0];
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getValidationMessages(
    dto: CreateManualFgStorageDto,
    index: number,
    isBulkPayload: boolean,
  ) {
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    const prefix = isBulkPayload ? `item ${index + 1}: ` : '';
    return this.flattenValidationErrors(errors).map(
      (message) => `${prefix}${message}`,
    );
  }

  private flattenValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => {
      const ownMessages = error.constraints
        ? Object.values(error.constraints)
        : [];
      const childMessages = error.children
        ? this.flattenValidationErrors(error.children)
        : [];

      return [...ownMessages, ...childMessages];
    });
  }
}
