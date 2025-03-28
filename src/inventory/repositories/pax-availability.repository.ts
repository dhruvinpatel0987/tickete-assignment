import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/services/prisma.service';
import { PaxAvailability, Prisma } from '@prisma/client';

@Injectable()
export class PaxAvailabilityRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findBySlotAndType(
    slotId: string,
    paxType: string,
  ): Promise<PaxAvailability | null> {
    return this.prismaService.paxAvailability.findUnique({
      where: {
        slotId_paxType: {
          slotId,
          paxType,
        },
      },
      include: {
        price: true,
      },
    });
  }

  async findByProductId(
    productId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prismaService.paxAvailability.findMany({
      where: {
        productId,
        slot: {
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        remaining: {
          gt: 0,
        },
      },
      select: {
        slot: {
          select: {
            startDate: true,
          },
        },
        price: true,
      },
      orderBy: {
        slot: {
          startDate: 'asc',
        },
      },
    });
  }

  async create(
    data: Prisma.PaxAvailabilityCreateInput,
  ): Promise<PaxAvailability> {
    return this.prismaService.paxAvailability.create({
      data,
      include: {
        price: true,
      },
    });
  }

  async update(
    id: number,
    data: Partial<Prisma.PaxAvailabilityUncheckedUpdateInput>,
  ): Promise<PaxAvailability> {
    return this.prismaService.paxAvailability.update({
      where: { id },
      data,
      include: {
        price: true,
        passengerType: true,
      },
    });
  }
}
