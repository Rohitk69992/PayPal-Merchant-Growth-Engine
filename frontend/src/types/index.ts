// TypeScript data models for PayPal Merchant Growth Engine

export type Currency = 'USD' | 'EUR' | 'GBP';

export interface MerchantProfile {
  id: string;
  businessName: string;
  ownerName: string;
  avatarUrl: string;
  currency: Currency;
  isSandbox: boolean;
  totalBalance: number;
  balanceGrowthPct30d: number;
  balances: {
    usd: number;
    btcValueUsd: number;
    btcAmount: number;
    rewardsPoints: number;
    rewardsValueUsd: number;
  };
}

export type TransactionType = 'PAYMENT' | 'RECEIVED' | 'CRYPTO' | 'REWARDS';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'DISPUTED';

export interface Transaction {
  id: string;
  title: string;
  date: string;
  formattedDate: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  source: 'CARD' | 'PAYPAL_WALLET' | 'CRYPTO' | 'REWARDS_PROGRAM';
  category?: string;
  feeAmount: number;
  netAmount: number;
  customerName?: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  percentage: number;
  count: number;
  avgSpend: number;
  color: string;
  description: string;
  targetAction: string;
}

export interface LocationDistribution {
  city: string;
  percentage: number;
}

export interface CategoryPreference {
  category: string;
  percentage: number;
  iconName: string;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface ProductInventory {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockOnHand: number;
  status: StockStatus;
  reorderThreshold: number;
  leadTimeDays: number;
  unitCost: number;
  unitPrice: number;
  supplierName: string;
  imageUrl?: string;
}

export interface DemandForecastPoint {
  month: string;
  actual?: number;
  projected: number;
}

export interface ProductForecast {
  productId: string;
  productName: string;
  growthProjectionPct: number;
  forecastPeriod: string;
  recommendedUnits: number;
  targetOrderDate: string;
  rationale: string;
  points: DemandForecastPoint[];
}

export interface CryptoHolding {
  symbol: string;
  name: string;
  usdValue: number;
  cryptoAmount: number;
  change24hPct: number;
  chartTrend: number[];
}

export interface RewardsSummary {
  points: number;
  equivalentUsd: number;
  tiers: {
    title: string;
    description: string;
    pointsRequired: number;
    value: string;
    icon: string;
  }[];
}

export interface AccountHealthStatus {
  status: 'SECURE' | 'AT_RISK' | 'ACTION_REQUIRED';
  statusMessage: string;
  subMessage: string;
  checklist: {
    title: string;
    description: string;
    passed: boolean;
  }[];
  feeSchedule: {
    domesticUs: string;
    international: string;
    currencyConversion: string;
    cryptoTrade: string;
  };
}

export interface MarketingCampaignDraft {
  id: string;
  targetSegment: string;
  headline: string;
  emailSubject: string;
  bodyCopy: string;
  discountCode: string;
  discountPct: number;
  estimatedReach: number;
  expectedConversionRatePct: number;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE';
}
