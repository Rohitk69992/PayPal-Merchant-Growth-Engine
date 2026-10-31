import type {
  MerchantProfile,
  Transaction,
  CustomerSegment,
  LocationDistribution,
  CategoryPreference,
  ProductInventory,
  ProductForecast,
  CryptoHolding,
  RewardsSummary,
  AccountHealthStatus,
  MarketingCampaignDraft,
} from '../types';

import {
  INITIAL_MERCHANT_PROFILE,
  INITIAL_TRANSACTIONS,
  INITIAL_CUSTOMER_SEGMENTS,
  INITIAL_LOCATIONS,
  INITIAL_PREFERENCES,
  INITIAL_INVENTORY,
  INITIAL_FORECAST,
  INITIAL_CRYPTO,
  INITIAL_REWARDS,
  INITIAL_ACCOUNT_HEALTH,
  INITIAL_CAMPAIGNS,
} from './demoData';

// Local in-memory state for interactive mutations during demo
const merchantProfile = { ...INITIAL_MERCHANT_PROFILE };
const transactions = [...INITIAL_TRANSACTIONS];
const inventory = [...INITIAL_INVENTORY];
const campaigns = [...INITIAL_CAMPAIGNS];

export const apiClient = {
  // Merchant Profile
  getMerchantProfile: async (): Promise<MerchantProfile> => {
    return { ...merchantProfile };
  },

  // Transactions
  getTransactions: async (filter?: {
    type?: string;
    search?: string;
  }): Promise<{ items: Transaction[]; total: number }> => {
    let items = [...transactions];

    if (filter?.type && filter.type !== 'ALL') {
      items = items.filter((t) => t.type === filter.type);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.customerName?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }

    return { items, total: items.length };
  },

  // Customer Intelligence
  getCustomerSegments: async (): Promise<CustomerSegment[]> => {
    return [...INITIAL_CUSTOMER_SEGMENTS];
  },

  getLocations: async (): Promise<LocationDistribution[]> => {
    return [...INITIAL_LOCATIONS];
  },

  getCategoryPreferences: async (): Promise<CategoryPreference[]> => {
    return [...INITIAL_PREFERENCES];
  },

  // Inventory
  getInventory: async (): Promise<ProductInventory[]> => {
    return [...inventory];
  },

  updateProductStock: async (
    productId: string,
    deltaUnits: number
  ): Promise<ProductInventory> => {
    const item = inventory.find((p) => p.id === productId);
    if (!item) throw new Error('Product not found');
    item.stockOnHand += deltaUnits;
    if (item.stockOnHand <= 0) {
      item.status = 'OUT_OF_STOCK';
      item.stockOnHand = 0;
    } else if (item.stockOnHand <= item.reorderThreshold) {
      item.status = 'LOW_STOCK';
    } else {
      item.status = 'IN_STOCK';
    }
    return { ...item };
  },

  addProduct: async (
    product: Omit<ProductInventory, 'id' | 'status'>
  ): Promise<ProductInventory> => {
    const newProduct: ProductInventory = {
      ...product,
      id: `prod_${Date.now()}`,
      status: product.stockOnHand <= product.reorderThreshold ? 'LOW_STOCK' : 'IN_STOCK',
    };
    inventory.push(newProduct);
    return newProduct;
  },

  // Forecasting
  getProductForecast: async (productId: string): Promise<ProductForecast> => {
    if (productId === INITIAL_FORECAST.productId) {
      return { ...INITIAL_FORECAST };
    }
    const product = inventory.find((p) => p.id === productId);
    return {
      productId,
      productName: product?.name || 'Selected Product',
      growthProjectionPct: 28,
      forecastPeriod: 'Next 3 months',
      recommendedUnits: 65,
      targetOrderDate: 'Within 3 weeks',
      rationale: `Statistical moving-average forecast predicts increased volume for ${product?.name}. Restock suggested prior to threshold breach.`,
      points: [
        { month: 'Oct', actual: 20, projected: 20 },
        { month: 'Nov', actual: 35, projected: 36 },
        { month: 'Dec', actual: undefined, projected: 50 },
        { month: 'Jan', actual: undefined, projected: 45 },
        { month: 'Feb', actual: undefined, projected: 38 },
      ],
    };
  },

  confirmReorder: async (
    productId: string,
    quantity: number
  ): Promise<{ orderId: string; status: string; units: number; product: ProductInventory }> => {
    const product = inventory.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');
    
    // Simulate stock incoming replenishment
    product.stockOnHand += quantity;
    product.status = 'IN_STOCK';

    // Record an outgoing transaction for supplier payment
    const totalCost = product.unitCost * quantity;
    const newTx: Transaction = {
      id: `tx_reorder_${Date.now()}`,
      title: `${product.supplierName} (Restock)`,
      date: new Date().toISOString(),
      formattedDate: 'Just now',
      type: 'PAYMENT',
      amount: -totalCost,
      currency: 'USD',
      status: 'COMPLETED',
      source: 'CARD',
      category: 'Inventory Restock',
      feeAmount: parseFloat((totalCost * 0.029 + 0.30).toFixed(2)),
      netAmount: -(totalCost + (totalCost * 0.029 + 0.30)),
    };
    transactions.unshift(newTx);
    merchantProfile.totalBalance -= totalCost;
    merchantProfile.balances.usd -= totalCost;

    return {
      orderId: `PO-${Date.now().toString().slice(-6)}`,
      status: 'CONFIRMED',
      units: quantity,
      product: { ...product },
    };
  },

  // Crypto & Rewards
  getCryptoHoldings: async (): Promise<CryptoHolding[]> => {
    return [...INITIAL_CRYPTO];
  },

  getRewardsSummary: async (): Promise<RewardsSummary> => {
    return { ...INITIAL_REWARDS };
  },

  redeemRewards: async (points: number, option: string): Promise<number> => {
    if (points > INITIAL_REWARDS.points) throw new Error('Insufficient points');
    INITIAL_REWARDS.points -= points;
    INITIAL_REWARDS.equivalentUsd = parseFloat((INITIAL_REWARDS.points * 0.01).toFixed(2));
    merchantProfile.balances.rewardsPoints = INITIAL_REWARDS.points;
    merchantProfile.balances.rewardsValueUsd = INITIAL_REWARDS.equivalentUsd;
    
    if (option === 'Cash Back') {
      const addedCash = points * 0.01;
      merchantProfile.totalBalance += addedCash;
      merchantProfile.balances.usd += addedCash;
    }
    return INITIAL_REWARDS.points;
  },

  // Account Health
  getAccountHealth: async (): Promise<AccountHealthStatus> => {
    return { ...INITIAL_ACCOUNT_HEALTH };
  },

  // Campaigns
  getCampaigns: async (): Promise<MarketingCampaignDraft[]> => {
    return [...campaigns];
  },

  createCampaign: async (
    draft: Omit<MarketingCampaignDraft, 'id' | 'status'>
  ): Promise<MarketingCampaignDraft> => {
    const newCampaign: MarketingCampaignDraft = {
      ...draft,
      id: `cmp_${Date.now()}`,
      status: 'ACTIVE',
    };
    campaigns.unshift(newCampaign);
    return newCampaign;
  },
};
