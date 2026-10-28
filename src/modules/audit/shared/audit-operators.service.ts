import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

export const AUDIT_OPERATOR_ROLE = 'USER';

export interface AuditOperator {
  id: number;
  name: string;
}

@Injectable()
export class AuditOperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperators() {
    const operators = await this.prisma.user.findMany({
      where: { role: AUDIT_OPERATOR_ROLE },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return {
      message: 'Operators fetched successfully.',
      count: operators.length,
      data: operators,
    };
  }

  async checkOperatorIds(ids: number[]) {
    const unique = [...new Set(ids)];
    const users = unique.length
      ? await this.prisma.user.findMany({
          where: { id: { in: unique } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const valid = new Map<number, AuditOperator>();
    const notFound: number[] = [];
    const notOperator: { id: number; name: string; role: string }[] = [];
    for (const id of unique) {
      const user = byId.get(id);
      if (!user) notFound.push(id);
      else if (user.role !== AUDIT_OPERATOR_ROLE) notOperator.push(user);
      else valid.set(id, { id: user.id, name: user.name });
    }
    return { valid, notFound, notOperator };
  }

  async getOperatorOrThrow(id: number): Promise<AuditOperator> {
    const { valid, notFound, notOperator } = await this.checkOperatorIds([id]);
    if (notFound.length) {
      throw new BadRequestException({
        code: 'OPERATOR_NOT_FOUND',
        message: `Operator ID ${id} does not exist.`,
      });
    }
    if (notOperator.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATOR',
        message: `User ID ${id} (${notOperator[0].name}) is not a Terminal Operator (role ${AUDIT_OPERATOR_ROLE}).`,
      });
    }
    return valid.get(id)!;
  }
}
