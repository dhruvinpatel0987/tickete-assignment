import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/services/prisma.service';
import { AvailableSlot, Prisma } from '@prisma/client';

@Injectable()
export class SlotRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(slotId: string): Promise<AvailableSlot | null> {
    return this.prismaService.availableSlot.findUnique({
      where: { id: slotId },
      include: {
        paxAvailabilities: {
          include: {
            price: true,
            passengerType: true,
          },
        },
      },
    });
  }

  async findByDateRange(
    startDate: Date,
    productId: string,
  ): Promise<
    Omit<
      AvailableSlot,
      | 'id'
      | 'productId'
      | 'endTime'
      | 'variantId'
      | 'currencyCode'
      | 'createdAt'
      | 'updatedAt'
    >[]
  > {
    return this.prismaService.availableSlot.findMany({
      where: {
        startDate,
        productId,
      },
      select: {
        id: true,
        startTime: true,
        startDate: true,
        remaining: true,
        paxAvailabilities: {
          select: {
            min: true,
            max: true,
            remaining: true,
            paxType: true,
            passengerType: {
              select: {
                name: true,
                description: true,
              },
            },
            price: {
              select: {
                originalPrice: true,
                discount: true,
                finalPrice: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: Prisma.AvailableSlotCreateInput): Promise<AvailableSlot> {
    return this.prismaService.availableSlot.create({
      data,
      include: {
        paxAvailabilities: true,
      },
    });
  }

  async update(
    slotId: string,
    data: Prisma.AvailableSlotUpdateInput,
  ): Promise<AvailableSlot> {
    return this.prismaService.availableSlot.update({
      where: { id: slotId },
      data,
      include: {
        paxAvailabilities: true,
      },
    });
  }
}
