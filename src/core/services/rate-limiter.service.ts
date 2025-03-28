import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';

/**
 * Service for managing API rate limiting
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limiter: Bottleneck;

  constructor() {
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 2000,
    });

    this.limiter.on('failed', (error, jobInfo) => {
      this.logger.warn(
        `Rate limiter job failed: ${error}, ${JSON.stringify(jobInfo)}`,
      );
    });

    this.limiter.on('dropped', (dropped) => {
      this.logger.warn(`Rate limiter dropped job: ${JSON.stringify(dropped)}`);
    });
  }

  /**
   * Execute a function with rate limiting applied
   */
  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.limiter.schedule(fn);
    } catch (error) {
      this.logger.error(
        `Error in rate limited function: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
