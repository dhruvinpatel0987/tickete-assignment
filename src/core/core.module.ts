import { Module } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { PrismaService } from './services/prisma.service';

@Module({
  providers: [RateLimiterService, PrismaService],
  exports: [RateLimiterService, PrismaService],
})
export class CoreModule {}
