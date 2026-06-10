import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { ResetPasswordDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.replace(/\s+/g, '');

    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    if (existing) throw new BadRequestException('Email already registered');
    const hashedPassword = await bcrypt.hash(
      dto.password.replace(/\s+/g, ''),
      10,
    );

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: email,
        password: hashedPassword,
        role: dto.role,
        salesZoneId: dto.role === 'SALES' ? dto.salesZoneId : null,
        accessPickPack: dto.accessPickPack || false,
        accessLabelPrint: dto.accessLabelPrint || false,
        accessMaterialFgTransfer: dto.accessMaterialFgTransfer || false,
        accessMaterialDispatch: dto.accessMaterialDispatch || false,
        accessVehicleEntry: dto.accessVehicleEntry || false,
        accessLocationAccuracy: dto.accessLocationAccuracy || false,
        accessContentAccuracy: dto.accessContentAccuracy || false,
        accessPutAway: dto.accessPutAway || false,
        accessErpBarcode: dto.accessErpBarcode || false,
        accessAttachment: dto.accessAttachment || false,
        accessManualFgLocation: dto.accessManualFgLocation || false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accessPickPack: true,
        accessLabelPrint: true,
        accessMaterialFgTransfer: true,
        accessMaterialDispatch: true,
        accessVehicleEntry: true,
        accessLocationAccuracy: true,
        accessContentAccuracy: true,
        accessPutAway: true,
        accessErpBarcode: true,
        accessAttachment: true,
        accessManualFgLocation: true,
        salesZoneId: true,
        salesZone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(role?: 'ADMIN' | 'SALES' | 'USER', search?: string) {
    const where: Prisma.UserWhereInput = {};
    if (role) {
      where.role = role;
    }
    if (search) {   
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { salesZone: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accessPickPack: true,
        accessLabelPrint: true,
        accessMaterialFgTransfer: true,
        accessMaterialDispatch: true,
        accessVehicleEntry: true,
        accessLocationAccuracy: true,
        accessContentAccuracy: true,
        accessPutAway: true,
        accessErpBarcode: true,
        accessAttachment: true,
        accessManualFgLocation: true,
        salesZoneId: true,
        salesZone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      salesZoneId: dto.salesZoneId,
      accessPickPack: dto.accessPickPack,
      accessLabelPrint: dto.accessLabelPrint,
      accessMaterialFgTransfer: dto.accessMaterialFgTransfer,
      accessMaterialDispatch: dto.accessMaterialDispatch,
      accessVehicleEntry: dto.accessVehicleEntry,
      accessLocationAccuracy: dto.accessLocationAccuracy,
      accessContentAccuracy: dto.accessContentAccuracy,
      accessPutAway: dto.accessPutAway,
      accessErpBarcode: dto.accessErpBarcode,
      accessAttachment: dto.accessAttachment,
      accessManualFgLocation: dto.accessManualFgLocation,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );
    if (dto.email) {
      const email = dto.email.replace(/\s+/g, '');

      const duplicate = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new BadRequestException('Email or Username already in use');
      }

      updateData.email = email;
    }
    if (dto.password) {
      updateData.password = await bcrypt.hash(
        dto.password.replace(/\s+/g, ''),
        10,
      );
    } else {
      delete updateData.password;
    }

    if (dto.role && dto.role !== 'SALES') {
      updateData.salesZoneId = null;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accessPickPack: true,
        accessLabelPrint: true,
        accessMaterialFgTransfer: true,
        accessMaterialDispatch: true,
        accessVehicleEntry: true,
        accessLocationAccuracy: true,
        accessContentAccuracy: true,
        accessPutAway: true,
        accessErpBarcode: true,
        accessAttachment: true,
        accessManualFgLocation: true,
        salesZoneId: true,
        salesZone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'At least one admin must remain in the system.',
        );
      }
    }

    const salesOrderCount = await this.prisma.salesOrder.count({
      where: { userId: id },
    });
    if (salesOrderCount > 0) {
      throw new BadRequestException(
        'Cannot delete user: this user has existing sales orders.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async resetPassword(userId: number, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(
      dto.oldPassword.replace(/\s+/g, ''),
      user.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Incorrect old password');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword.replace(/\s+/g, ''),
      10,
    );
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, email: true },
    });
  }

  async getMobileModules(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accessPickPack: true,
        accessLabelPrint: true,
        accessMaterialFgTransfer: true,
        accessMaterialDispatch: true,
        accessVehicleEntry: true,
        accessLocationAccuracy: true,
        accessContentAccuracy: true,
        accessPutAway: true,
        accessErpBarcode: true,
        accessAttachment: true,
        accessManualFgLocation: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
