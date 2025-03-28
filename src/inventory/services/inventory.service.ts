import { Injectable, Logger } from '@nestjs/common';
import { SlotRepository } from '../repositories/slot.repository';
import { PaxAvailabilityRepository } from '../repositories/pax-availability.repository';
import { PriceRepository } from '../repositories/price.repository';
import { PassengerTypeRepository } from '../repositories/passenger-type.repository';
import {
  SlotAvailability,
  PaxAvailability,
} from '../models/inventory.interface';
import { PrismaService } from '../../core/services/prisma.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly slotRepository: SlotRepository,
    private readonly paxAvailabilityRepository: PaxAvailabilityRepository,
    private readonly priceRepository: PriceRepository,
    private readonly passengerTypeRepository: PassengerTypeRepository,
  ) {}

  /**
   * Stores slot availability data from API response
   */
  public async storeSlotAvailabilities(
    slotAvailabilities: SlotAvailability[],
  ): Promise<{
    saved: number;
    updated: number;
    skipped: number;
  }> {
    let saved = 0;
    let updated = 0;
    let skipped = 0;

    for (const slot of slotAvailabilities) {
      try {
        const result = await this.storeSlot(slot);
        saved += result.saved;
        updated += result.updated;
        skipped += result.skipped;
      } catch (error) {
        this.logger.error(`Failed to store slot: ${error.message}`);
        skipped++;
      }
    }

    this.logger.log(
      `Storage complete: ${saved} new records, ${updated} updated, ${skipped} skipped`,
    );

    return { saved, updated, skipped };
  }

  /**
   * Stores a single slot's data in a transaction
   */
  private async storeSlot(
    slot: SlotAvailability,
  ): Promise<{ saved: number; updated: number; skipped: number }> {
    let saved = 0;
    let updated = 0;
    let skipped = 0;

    return this.prismaService.$transaction(async (prisma) => {
      try {
        const existingSlot = await this.findSlot(slot.providerSlotId);

        let currentSlot;
        if (existingSlot) {
          currentSlot = await this.updateSlot(slot, existingSlot.id);
          updated++;
        } else {
          currentSlot = await this.createSlot(slot);
          saved++;
        }

        for (const pax of slot.paxAvailability) {
          const paxResult = await this.storePassengerTypeData(currentSlot.id, {
            ...pax,
            productId: slot.productId,
          });
          saved += paxResult.saved;
          updated += paxResult.updated;
          skipped += paxResult.skipped;
        }

        return { saved, updated, skipped };
      } catch (error) {
        this.logger.error(`Error in transaction: ${error.message}`);
        return { saved: 0, updated: 0, skipped: 1 };
      }
    });
  }

  /**
   * Find slot by provider ID
   */
  private async findSlot(
    providerSlotId: string,
  ): Promise<{ id: string } | null> {
    return this.slotRepository.findById(providerSlotId);
  }

  /**
   * Create a new slot
   */
  private async createSlot(slot: SlotAvailability): Promise<{ id: string }> {
    const startDate = new Date(slot.startDate);

    return this.slotRepository.create({
      id: slot.providerSlotId,
      productId: slot.productId,
      startDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      variantId: slot.variantId,
      remaining: slot.remaining,
      currencyCode: slot.currencyCode,
    });
  }

  /**
   * Update an existing slot
   */
  private async updateSlot(
    slot: SlotAvailability,
    slotId: string,
  ): Promise<{ id: string }> {
    const startDate = new Date(slot.startDate);

    return this.slotRepository.update(slotId, {
      startDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      variantId: slot.variantId,
      remaining: slot.remaining,
      currencyCode: slot.currencyCode,
    });
  }

  /**
   * Process passenger type data
   */
  private async storePassengerTypeData(
    slotId: string,
    pax: PaxAvailability,
  ): Promise<{ saved: number; updated: number; skipped: number }> {
    let saved = 0;
    let updated = 0;
    let skipped = 0;

    try {
      await this.ensurePassengerTypeExists(pax);

      const priceRecord = await this.findOrCreatePrice(
        pax.price.originalPrice,
        pax.price.discount,
        pax.price.finalPrice,
        pax.price.currencyCode,
      );

      const existingPax =
        await this.paxAvailabilityRepository.findBySlotAndType(
          slotId,
          pax.type,
        );

      if (existingPax) {
        await this.paxAvailabilityRepository.update(existingPax.id, {
          remaining: pax.remaining,
          priceId: priceRecord.id,
        });
        updated++;
      } else {
        await this.createPaxAvailability(
          pax.productId,
          slotId,
          pax,
          priceRecord.id,
        );
        saved++;
      }

      return { saved, updated, skipped };
    } catch (error) {
      this.logger.error(`Error processing passenger type: ${error.message}`);
      return { saved: 0, updated: 0, skipped: 1 };
    }
  }

  /**
   * Find existing price or create a new one
   */
  private async findOrCreatePrice(
    originalPrice: number,
    discount: number,
    finalPrice: number,
    currencyCode: string,
  ): Promise<{ id: number }> {
    const existingPrice = await this.priceRepository.findByValues(
      originalPrice,
      discount,
      finalPrice,
      currencyCode,
    );

    if (existingPrice) {
      return { id: existingPrice.id };
    }

    return this.priceRepository.create({
      originalPrice,
      discount,
      finalPrice,
      currencyCode,
    });
  }

  /**
   * Create a new pax availability record
   */
  private async createPaxAvailability(
    productId: string,
    slotId: string,
    pax: PaxAvailability,
    priceId: number,
  ): Promise<{ id: number }> {
    return this.paxAvailabilityRepository.create({
      slot: {
        connect: { id: slotId },
      },
      passengerType: {
        connect: { id: pax.type },
      },
      price: {
        connect: { id: priceId },
      },
      productId,
      min: pax.min,
      max: pax.max,
      remaining: pax.remaining,
      isPrimary: pax.isPrimary || false,
    });
  }

  /**
   * Ensure passenger type exists
   */
  private async ensurePassengerTypeExists(pax: PaxAvailability): Promise<void> {
    const existingType = await this.passengerTypeRepository.findById(pax.type);

    if (!existingType) {
      await this.passengerTypeRepository.create({
        id: pax.type,
        name: pax.name,
        description: pax.description,
      });
    }

    return;
  }
}
