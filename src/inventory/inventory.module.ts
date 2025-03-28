import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './services/sync.service';
import { SchedulerService } from './services/scheduler.service';
import { InventoryService } from './services/inventory.service';
import { CoreModule } from '../core/core.module';
import { SlotController } from './slot.controller';
import { PriceRepository } from './repositories/price.repository';
import { PaxAvailabilityRepository } from './repositories/pax-availability.repository';
import { SlotRepository } from './repositories/slot.repository';
import { PassengerTypeRepository } from './repositories/passenger-type.repository';

@Module({
  imports: [HttpModule, CoreModule],
  controllers: [SlotController],
  providers: [
    SyncService,
    SchedulerService,
    InventoryService,
    PriceRepository,
    PaxAvailabilityRepository,
    SlotRepository,
    PassengerTypeRepository,
  ],
  exports: [
    SyncService,
    InventoryService,
    PriceRepository,
    PaxAvailabilityRepository,
    SlotRepository,
    PassengerTypeRepository,
  ],
})
export class InventoryModule {}
