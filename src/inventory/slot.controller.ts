import {
  Controller,
  Get,
  Post,
  HttpStatus,
  HttpCode,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SchedulerService } from './services/scheduler.service';
import { SyncActionResponseDto } from './dto/sync-status.dto';
import { SlotRepository } from './repositories/slot.repository';
import {
  AvailableSlot,
  Price,
  PassengerType,
  PaxAvailability,
} from '@prisma/client';
import { PaxAvailabilityRepository } from './repositories/pax-availability.repository';
type AvailableSlotWithRelations = AvailableSlot & {
  paxAvailabilities: (PaxAvailability & {
    price: Price;
    passengerType: PassengerType;
  })[];
};

/**
 * Controller for experience-related endpoints
 */
@Controller({
  path: 'experience',
  version: '1',
})
export class SlotController {
  constructor(
    private readonly SchedulerService: SchedulerService,
    private readonly SlotRepository: SlotRepository,
    private readonly paxAvailabilityRepository: PaxAvailabilityRepository,
  ) {}

  /**
   * Pause inventory sync
   */
  @Post('/sync/pause')
  @HttpCode(HttpStatus.OK)
  pauseSync(): SyncActionResponseDto {
    const isPaused = this.SchedulerService.pauseSync();
    const { syncState } = this.SchedulerService.getSyncStatus();
    return {
      success: true,
      message: 'Inventory sync has been paused',
      isPaused,
      timestamp: new Date(),
      syncState,
    };
  }

  /**
   * Resume inventory sync
   */
  @Post('/sync/resume')
  @HttpCode(HttpStatus.OK)
  resumeSync(): SyncActionResponseDto {
    const isPaused = this.SchedulerService.resumeSync();
    const { syncState } = this.SchedulerService.getSyncStatus();
    return {
      success: true,
      message: 'Inventory sync has been resumed',
      isPaused,
      timestamp: new Date(),
      syncState,
    };
  }

  /**
   * Get inventory data for a product from the database
   */
  @Get('/:productId')
  async getInventory(
    @Param('productId') productId: string,
    @Query('date') date?: string,
  ): Promise<AvailableSlotWithRelations[]> {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    if (!date || isNaN(new Date(date).getTime())) {
      throw new BadRequestException(
        'Invalid date format, please use YYYY-MM-DD',
      );
    }
    const start = new Date(date);

    const inventory = (await this.SlotRepository.findByDateRange(
      start,
      productId,
    )) as AvailableSlotWithRelations[];

    return inventory;
  }

  /**
   * Get available dates for a product for the next 2 months
   */
  @Get('/:productId/dates')
  async getInventoryDates(
    @Param('productId') productId: string,
  ): Promise<{ date: string; price: Price }[]> {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    const startDate = new Date();

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 2);

    const inventory = await this.paxAvailabilityRepository.findByProductId(
      productId,
      startDate,
      endDate,
    );

    return inventory.map(({ slot, price }) => ({
      date: slot.startDate.toISOString().slice(0, 10),
      price,
    }));
  }
}
