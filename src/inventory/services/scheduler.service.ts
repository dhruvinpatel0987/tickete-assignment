import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncService } from './sync.service';
import { FetchWindow } from '../models/inventory.interface';
import { InventoryService } from './inventory.service';

/**
 * Service for scheduling periodic product data syncing
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly productIds = ['14', '15'];
  private isPaused = false;
  private syncState: { [key: string]: any } = {};
  private currentSyncTasks: Map<string, AbortController> = new Map();

  constructor(
    private readonly syncService: SyncService,
    private readonly inventoryStorageService: InventoryService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Initializing inventory scheduler service');

    setTimeout(() => {
      this.fetch15MinInventory().catch((err) =>
        this.logger.error(`Error in initial 15-min fetch: ${err.message}`),
      );

      setTimeout(() => {
        this.fetch4HourlyInventory().catch((err) =>
          this.logger.error(`Error in initial 4-hour fetch: ${err.message}`),
        );
      }, 5000);

      setTimeout(() => {
        this.fetchDailyInventory().catch((err) =>
          this.logger.error(`Error in initial daily fetch: ${err.message}`),
        );
      }, 10000);
    }, 0);
  }

  /**
   * Pauses all inventory sync operations
   */
  public pauseSync(): boolean {
    this.isPaused = true;
    this.logger.log('Inventory sync operations have been paused');

    this.currentSyncTasks.forEach((controller, taskName) => {
      this.logger.log(`Aborting sync task: ${taskName}`);
      controller.abort();
    });

    return this.isPaused;
  }

  /**
   * Resumes all inventory sync operations
   */
  public resumeSync(): boolean {
    this.isPaused = false;
    this.logger.log('Inventory sync operations have been resumed');

    if (this.syncState.daily?.interrupted) {
      this.logger.log('Resuming interrupted daily sync');
      this.fetchDailyInventory();
    }
    if (this.syncState.fourHourly?.interrupted) {
      this.logger.log('Resuming interrupted 4-hourly sync');
      this.fetch4HourlyInventory();
    }
    if (this.syncState.fifteenMin?.interrupted) {
      this.logger.log('Resuming interrupted 15-minute sync');
      this.fetch15MinInventory();
    }

    return this.isPaused;
  }

  /**
   * Gets the current sync status
   */
  public getSyncStatus(): { isPaused: boolean; syncState: any } {
    return {
      isPaused: this.isPaused,
      syncState: this.syncState,
    };
  }

  /**
   * Fetch inventory daily for a 30-day window
   * Runs at 1:00 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async fetchDailyInventory(): Promise<void> {
    if (this.isPaused) {
      this.logger.log('Skipping daily inventory fetch - sync is paused');
      return;
    }

    const abortController = new AbortController();
    this.currentSyncTasks.set('daily', abortController);

    try {
      this.syncState.daily = {
        status: 'running',
        startTime: new Date(),
        progress: 0,
        interrupted: false,
      };

      this.logger.log('Running daily inventory fetch for 30-day window');

      const window = this.syncService.createMonthWindow();

      await this.fetchAndProcessIncremental(
        'daily',
        this.productIds,
        window,
        abortController.signal,
      );

      this.syncState.daily.status = 'completed';
      this.syncState.daily.endTime = new Date();
      this.syncState.daily.interrupted = false;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.log('Daily fetch interrupted by pause command');
        this.syncState.daily.interrupted = true;
        this.syncState.daily.status = 'interrupted';
      } else {
        this.logger.error(
          `Failed to complete daily fetch: ${error.message}`,
          error.stack,
        );
        this.syncState.daily.status = 'failed';
        this.syncState.daily.error = error.message;
      }
    } finally {
      this.currentSyncTasks.delete('daily');
    }
  }

  /**
   * Fetch inventory every 4 hours.
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async fetch4HourlyInventory(): Promise<void> {
    if (this.isPaused) {
      this.logger.log('Skipping 4-hourly inventory fetch - sync is paused');
      return;
    }

    const abortController = new AbortController();
    this.currentSyncTasks.set('fourHourly', abortController);

    try {
      this.syncState.fourHourly = {
        status: 'running',
        startTime: new Date(),
        progress: 0,
        interrupted: false,
      };

      this.logger.log('Running 4-hourly inventory fetch for 7-day window');

      const window = this.syncService.createWeekWindow();

      await this.fetchAndProcessIncremental(
        'fourHourly',
        this.productIds,
        window,
        abortController.signal,
      );

      this.syncState.fourHourly.status = 'completed';
      this.syncState.fourHourly.endTime = new Date();
      this.syncState.fourHourly.interrupted = false;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.log('4-hourly fetch interrupted by pause command');
        this.syncState.fourHourly.interrupted = true;
        this.syncState.fourHourly.status = 'interrupted';
      } else {
        this.logger.error(
          `Failed to complete 4-hourly fetch: ${error.message}`,
          error.stack,
        );
        this.syncState.fourHourly.status = 'failed';
        this.syncState.fourHourly.error = error.message;
      }
    } finally {
      this.currentSyncTasks.delete('fourHourly');
    }
  }

  /**
   * Fetch inventory every 15 minutes for today
   */
  @Cron('*/15 * * * *')
  async fetch15MinInventory(): Promise<void> {
    if (this.isPaused) {
      this.logger.log('Skipping 15-minute inventory fetch - sync is paused');
      return;
    }

    const abortController = new AbortController();
    this.currentSyncTasks.set('fifteenMin', abortController);

    try {
      this.syncState.fifteenMin = {
        status: 'running',
        startTime: new Date(),
        progress: 0,
        interrupted: false,
      };

      this.logger.log('Running 15 minute inventory fetch for today');

      const window = this.syncService.createTodayWindow();

      // For today's data, just fetch all at once since it's a small window
      const results = await this.syncService.fetchInventory({
        productIds: this.productIds,
        window,
      });

      // Check if operation was aborted
      if (abortController.signal.aborted) {
        throw new Error('AbortError');
      }

      // Save results immediately
      const saveResult =
        await this.inventoryStorageService.storeSlotAvailabilities(results);

      this.logger.log(
        `15-minute fetch completed. Fetched ${results.length} products for today. ` +
          `Saved: ${saveResult.saved}, Updated: ${saveResult.updated}, Skipped: ${saveResult.skipped}`,
      );

      this.syncState.fifteenMin.status = 'completed';
      this.syncState.fifteenMin.endTime = new Date();
      this.syncState.fifteenMin.interrupted = false;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.log('15-minute fetch interrupted by pause command');
        this.syncState.fifteenMin.interrupted = true;
        this.syncState.fifteenMin.status = 'interrupted';
      } else {
        this.logger.error(
          `Failed to complete 15-minute fetch: ${error.message}`,
          error.stack,
        );
        this.syncState.fifteenMin.status = 'failed';
        this.syncState.fifteenMin.error = error.message;
      }
    } finally {
      this.currentSyncTasks.delete('fifteenMin');
    }
  }

  /**
   * Fetch and process data incrementally by splitting date ranges
   */
  private async fetchAndProcessIncremental(
    taskType: string,
    productIds: string[],
    window: FetchWindow,
    abortSignal: AbortSignal,
  ): Promise<void> {
    const dates = this.generateDateChunks(window.startDate, window.endDate, 3);
    const totalChunks = dates.length;

    let processedChunks = 0;
    let totalSaved = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const chunk of dates) {
      if (abortSignal.aborted) {
        throw new Error('AbortError');
      }

      const chunkWindow = {
        startDate: chunk.start,
        endDate: chunk.end,
      };

      const results = await this.syncService.fetchInventory({
        productIds,
        window: chunkWindow,
      });

      if (abortSignal.aborted) {
        throw new Error('AbortError');
      }

      const saveResult =
        await this.inventoryStorageService.storeSlotAvailabilities(results);

      totalSaved += saveResult.saved;
      totalUpdated += saveResult.updated;
      totalSkipped += saveResult.skipped;

      processedChunks++;
      this.syncState[taskType].progress = Math.round(
        (processedChunks / totalChunks) * 100,
      );

      this.logger.log(
        `${taskType} fetch progress: ${this.syncState[taskType].progress}% complete. ` +
          `Processed chunk ${processedChunks}/${totalChunks}`,
      );
    }

    this.logger.log(
      `${taskType} fetch completed. ` +
        `Saved: ${totalSaved}, Updated: ${totalUpdated}, Skipped: ${totalSkipped} records.`,
    );
  }

  /**
   * Generate date chunks for incremental processing
   */
  private generateDateChunks(
    startDate: Date,
    endDate: Date,
    chunkSize: number,
  ): Array<{ start: Date; end: Date }> {
    const chunks = [];
    const current = new Date(startDate);

    while (current < endDate) {
      const chunkStart = new Date(current);

      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + chunkSize - 1);

      const end = new Date(Math.min(chunkEnd.getTime(), endDate.getTime()));

      chunks.push({
        start: chunkStart,
        end,
      });

      current.setDate(current.getDate() + chunkSize);
    }

    return chunks;
  }
}
