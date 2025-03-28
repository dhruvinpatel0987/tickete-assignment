export interface FetchWindow {
  readonly startDate: Date;
  readonly endDate: Date;
}

export interface FetchOptions {
  readonly productIds: string[];
  readonly window: FetchWindow;
}

export interface Price {
  readonly discount: number;
  readonly finalPrice: number;
  readonly originalPrice: number;
  readonly currencyCode: string;
}

export interface PaxAvailability {
  readonly productId: string;
  readonly max: number;
  readonly min: number;
  readonly remaining: number;
  readonly type: string;
  readonly isPrimary?: boolean;
  readonly description: string;
  readonly name: string;
  readonly price: Price;
}

export interface SlotAvailability {
  readonly productId: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly providerSlotId: string;
  readonly remaining: number;
  readonly currencyCode: string;
  readonly variantId: number;
  readonly paxAvailability: PaxAvailability[];
}

export interface PassengerType {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly minAge: number;
  readonly maxAge: number;
  readonly isPrimary: boolean;
}
