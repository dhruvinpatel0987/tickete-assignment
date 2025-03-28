import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/services/prisma.service';
import { PassengerType, Prisma } from '@prisma/client';

@Injectable()
export class PassengerTypeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(typeCode: string): Promise<PassengerType | null> {
    return this.prismaService.passengerType.findUnique({
      where: { id: typeCode },
    });
  }

  async create(data: Prisma.PassengerTypeCreateInput): Promise<PassengerType> {
    return this.prismaService.passengerType.create({ data });
  }
}
