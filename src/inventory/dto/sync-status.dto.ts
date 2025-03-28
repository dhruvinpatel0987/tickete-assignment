/**
 * Response DTO for sync status
 */
export class SyncStatusResponseDto {
    readonly isPaused: boolean;
    readonly lastSyncTime?: Date;
    readonly message?: string;
    readonly syncState?: any;
}

/**
 * Response DTO for sync action results
 */
export class SyncActionResponseDto {
    readonly success: boolean;
    readonly message: string;
    readonly isPaused: boolean;
    readonly timestamp: Date;
    readonly syncState?: any;
} 