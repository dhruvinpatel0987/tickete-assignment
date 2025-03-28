import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/services/prisma.service';
import { Price, Prisma } from '@prisma/client';

@Injectable()
export class PriceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByValues(
    originalPrice: number,
    discount: number,
    finalPrice: number,
    currencyCode: string,
  ): Promise<Price | null> {
    return this.prismaService.price.findFirst({
      where: {
        originalPrice,
        discount,
        finalPrice,
        currencyCode,
      },
    });
  }

  async create(data: Prisma.PriceCreateInput): Promise<Price> {
    return this.prismaService.price.create({
      data,
      include: {
        paxAvailabilities: true,
      },
    });
  }
}
