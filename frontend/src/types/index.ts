// TypeScript data models for PayPal Merchant Growth Engine

export type Currency = 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified?: boolean;
  has_merchant?: boolean;
  created_at?: string;
}

export interface Merchant {
  id: string;
  business_name: string;
  currency: Currency;
  category?: string;
  address?: string;
  phone?: string;
  created_at?: string;
}

export interface MerchantMembership {
  id: string;
  merchant_id: string;
  user_id: string;
  role: string;
  merchant: Merchant;
}

export interface AuthState {
  user: User | null;
  merchants: Merchant[];
  currentMerchant: Merchant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type TransactionType = 'PAYMENT' | 'RECEIVED' | 'REFUND';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';

export interface Transaction {
  id: string;
  title: string;
  date: string;
  formattedDate?: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  source?: string;
  category?: string;
  feeAmount: number;
  netAmount: number;
  customerName?: string;
  paypalOrderId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  total_orders: number;
  total_spend: number;
  last_purchase_date?: string;
  segment?: string;
}

export interface CustomerSegment {
  id?: string;
  name?: string;
  segment_name: string;
  customer_count: number;
  percentage: number;
  avg_recency_days: number;
  avg_frequency: number;
  avg_spend?: number;
  avg_monetary: number;
  color?: string;
  description?: string;
  recommended_actions?: string[];
}

export interface LocationDistribution {
  city: string;
  percentage: number;
  customer_count: number;
}

export interface CategoryPreference {
  category: string;
  percentage: number;
  sales_count: number;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface ProductInventory {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  stockOnHand: number;
  reorderThreshold: number;
  safetyStock: number;
  leadTimeDays: number;
  supplierName: string;
  status: StockStatus;
  created_at?: string;
}

export interface DailySale {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  date: string;
  units_sold: number;
  revenue: number;
  channel?: string;
}

export interface DemandForecastPoint {
  date: string;
  projected_units: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ProductForecast {
  product_id: string;
  product_name: string;
  method: string;
  status: 'OPTIMAL' | 'FALLBACK_MA' | 'INSUFFICIENT_DATA';
  growth_rate_pct: number;
  recommended_units_next_period: number;
  target_reorder_date: string;
  rationale: string;
  data_points_used: number;
  points: DemandForecastPoint[];
}

export interface ReorderRecommendation {
  product_id: string;
  sku: string;
  product_name: string;
  stock_on_hand: number;
  reorder_point: number;
  safety_stock: number;
  daily_demand_avg: number;
  lead_time_days: number;
  recommended_order_qty: number;
  supplier_name: string;
  urgency: 'URGENT' | 'MONITOR' | 'OK';
}

export interface PurchaseOrderDraft {
  id: string;
  po_number: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
  created_at: string;
}

export interface MarketingCampaignDraft {
  id: string;
  name: string;
  target_segment: string;
  discount_percentage: number;
  promo_code: string;
  channel: string;
  headline?: string;
  message_body: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  created_at?: string;
}

export interface PayPalConnectionStatus {
  is_connected: boolean;
  client_id?: string;
  has_secret?: boolean;
  webhook_id?: string;
  environment?: string;
  updated_at?: string;
  last_sync_at?: string;
  partner_onboarding_url?: string;
}

export interface AnalyticsOverview {
  total_balance: number;
  gross_sales_30d: number;
  growth_rate_pct: number;
  transaction_count: number;
  active_products: number;
  customer_count: number;
  low_stock_count: number;
  paypal_connected: boolean;
  account_status: string;
  currency: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_executions?: {
    tool_name: string;
    arguments: Record<string, any>;
    status: string;
  }[];
  timestamp: string;
}

export interface ManualSaleRequest {
  product_id?: string;
  sku?: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  currency?: string;
  transaction_date?: string;
  payment_method?: string;
  transaction_status?: string;
  customer_name?: string;
  customer_email?: string;
  customer_city?: string;
  customer_country?: string;
  deduct_inventory?: boolean;
  notes?: string;
}

export interface CsvPreviewRow {
  row_number: number;
  date: string;
  sku?: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  customer_email?: string;
  customer_name?: string;
  payment_method: string;
  status: string;
  external_id?: string;
  validation_status: 'VALID' | 'INVALID' | 'DUPLICATE';
  error_message?: string;
}

export interface CsvRowError {
  row_number: number;
  field: string;
  error: string;
  raw_data?: Record<string, any>;
}

export interface CsvPreviewResponse {
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_count: number;
  detected_columns: string[];
  preview_rows: CsvPreviewRow[];
  errors: CsvRowError[];
}

export interface ImportSummaryResponse {
  job_id: string;
  status: string;
  total_rows: number;
  imported_records: number;
  failed_records: number;
  skipped_duplicates: number;
  errors: Array<{ row?: number; field?: string; error?: string }>;
  message: string;
}

export interface DataImportJob {
  id: string;
  source_type: string;
  filename?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  total_rows: number;
  imported_records: number;
  failed_records: number;
  skipped_duplicates: number;
  error_summary?: string;
  created_at: string;
  completed_at?: string;
}
