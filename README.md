# Tickete Assignment Demo

## Overview

This project implements a robust Sync Service for tickete using NestJS and TypeScript. The service is designed to fetch product availability data from partner APIs at different time intervals, respecting API rate limits, handling errors, and following best practices for TypeScript and NestJS.

## Key Components

### Core Module

- **PrismaService**: Manages database connection and disconnection using prisma client.
- **RateLimiterService**: Manages API request rate limiting using Bottleneck, ensuring the 30 requests per minute limit is respected.

### Inventory Module

- **SyncService**: Core service for making API requests to partner endpoints.
- **SchedulerService**: Implements scheduled fetching at three different intervals:
  - Daily (12 AM): Fetches availability for the next 30 days
  - Every 4 hours: Fetches availability for the next 7 days
  - Every 15 minutes: Fetches availability for today
- **SlotController**: Provides sync control and fetch availability slots and dates endpoints.

### API Endpoints

- **Slots API**

  - Api to return all the slots available for a given `date` and product `id`

  ```
   curl --location 'https://tickete-assignment-6pcm.onrender.com/api/v1/experience/{productId}?date={date}'

  ```

- **Dates API**

  - Api to return all available date for next 2 months.

  ```
   curl --location 'https://tickete-assignment-6pcm.onrender.com/api/v1/experience/{productId}/dates'
  ```

- **Sync Control API**:

  - Pauses all scheduled syncs

  ```
   curl --location --request POST 'https://tickete-assignment-6pcm.onrender.com/api/v1/experience/sync/pause'
  ```

  - Resumes paused syncs

  ```
   curl --location --request POST 'https://tickete-assignment-6pcm.onrender.com/api/v1/experience/sync/resume'
  ```


## Architecture

1. **Rate Limiting Strategy**:

   - Used Bottleneck to implement rate limiting.
   - Configured for max 2 concurrent requests.
   - Added 2-second delay between requests to stay well below the 30 requests/minute limit.
   - Included retry logic for rate limit errors (HTTP 429).

2. **Error Handling**:

   - Comprehensive error handling at all levels.
   - Failed fetches don't crash the service.
   - Detailed error logging for troubleshooting.

3. **Scheduling Strategy**:

   - Used NestJS Scheduler for cron jobs.
   - Implemented different fetch windows based on data freshness requirements.
   - Each schedule is independent to avoid cascading failures.
   - Added ability to pause/resume all scheduled operations.

4. **Sync Control**:
   - RESTful API endpoints for controlling sync operations.
   - Pause/resume capability for maintenance windows or emergency stops.

## Improvements for optimization

1. Implementing caching to avoid unnecessary API calls for frequently requested data.
2. Implementing in-memory database like redis to store all job metadata to distribute work load on the multiple servers.
3. Add metrics collection for API call success rates, response times, etc.
4. Implementing a circuit breaker pattern to handle partner API outages.
