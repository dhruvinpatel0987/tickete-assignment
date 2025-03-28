import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { RateLimiterService } from '../../core/services/rate-limiter.service';
import {
  FetchOptions,
  FetchWindow,
  SlotAvailability,
} from '../models/inventory.interface';
import { catchError, lastValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Service for sync data from partner API
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly BASE_URL = process.env.PARTNER_API_URL;
  private readonly DEFAULT_PRODUCT_ID = '14';
  private readonly SUNDAY_PRODUCT_ID = '15';

  constructor(
    private readonly httpService: HttpService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  /**
   * sync data for specific product IDs and date range
   */
  public async fetchInventory(
    options: FetchOptions,
  ): Promise<SlotAvailability[]> {
    this.logger.log(
      `Fetching inventory for ${options.productIds.length} products in parallel`,
    );

    const fetchPromises = options.productIds.map(async (productId) => {
      try {
        return this.fetchProductSlotWithRateLimiting(productId, options.window);
      } catch (error) {
        this.logger.error(
          `Failed to fetch inventory for product ${productId}: ${error.message}`,
          error.stack,
        );

        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    return results.flat();
  }

  /**
   * Determines the correct product ID based on the day of the week
   */
  private getProductIdForDate(date: Date, baseProductId: string): string {
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) {
      this.logger.log(
        `Using Sunday product ID (${this.SUNDAY_PRODUCT_ID}) for date: ${date.toISOString().split('T')[0]}`,
      );
      return this.SUNDAY_PRODUCT_ID;
    }

    return baseProductId;
  }

  /**
   * Fetch product slot data for a given date range
   */
  private async fetchProductSlotWithRateLimiting(
    productId: string,
    window: FetchWindow,
  ): Promise<SlotAvailability[]> {
    const dates = this.generateDateRange(window.startDate, window.endDate);

    const inventoryPromises = dates.map((date) =>
      this.rateLimiterService.schedule(async () => {
        return this.fetchSlot(productId, date);
      }),
    );

    try {
      const results = await Promise.all(inventoryPromises);

      const mergedInventory = results.flat();

      return mergedInventory;
    } catch (error) {
      this.logger.error(
        `Error fetching inventory for product ${productId} window: ${error.message}`,
      );
      throw error;
    }
  }

  private async fetchSlot(
    productId: string,
    date: Date,
  ): Promise<SlotAvailability[]> {
    const effectiveProductId = this.getProductIdForDate(date, productId);

    const url = `${this.BASE_URL}/inventory/${effectiveProductId}`;
    const params = {
      date: this.formatDateParam(date),
    };

    try {
      const response = await lastValueFrom(
        this.httpService
          .get<SlotAvailability[]>(this.urlWithQueryString(url, params), {
            headers: {
              'x-api-key': process.env.PARTNER_API_KEY,
            },
          })
          .pipe(
            map((response) => response.data),
            catchError((error: AxiosError) => {
              if (error.response?.status === 429) {
                this.logger.warn(
                  `Rate limit hit for product ${effectiveProductId}. Retry-After: ${error.response.headers['retry-after']}`,
                );
              }
              throw error;
            }),
          ),
      );

      return response.map((item) => ({
        ...item,
        productId: effectiveProductId,
      }));
    } catch (error) {
      this.logger.error(
        `Error fetching inventory for product ${effectiveProductId} on ${date}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Return an array of dates between start and end dates
   */
  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Formats a date for API request parameters
   */
  private formatDateParam(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private urlWithQueryString(
    url: String,
    params: { [key: string]: string },
  ): string {
    return url + '?' + new URLSearchParams(params).toString();
  }

  /**
   * Creates a date window for today
   */
  public createTodayWindow(): FetchWindow {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      startDate: today,
      endDate: tomorrow,
    };
  }

  /**
   * Creates a date window for the next 7 days
   */
  public createWeekWindow(): FetchWindow {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      startDate: today,
      endDate: nextWeek,
    };
  }

  /**
   * Creates a date window for the next 30 days
   */
  public createMonthWindow(): FetchWindow {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    return {
      startDate: today,
      endDate: nextMonth,
    };
  }
}
