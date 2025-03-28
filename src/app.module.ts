import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule } from './core/core.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [ScheduleModule.forRoot(), CoreModule, InventoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
