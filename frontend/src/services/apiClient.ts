import type {
  User,
  Merchant,
  ProductInventory,
  DailySale,
  Transaction,
  Customer,
  CustomerSegment,
  LocationDistribution,
  CategoryPreference,
  ProductForecast,
  ReorderRecommendation,
  PurchaseOrderDraft,
  MarketingCampaignDraft,
  PayPalConnectionStatus,
  AnalyticsOverview,
  AgentChatMessage,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

class ApiClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const currentMerchantId = localStorage.getItem('current_merchant_id');
    if (currentMerchantId) {
      headers['X-Merchant-ID'] = currentMerchantId;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === 'string' 
            ? errorJson.detail 
            : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fall back to status text
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async register(data: { email: string; password: string; full_name: string }): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  // --- Merchant Endpoints ---
  async createMerchant(data: {
    business_name: string;
    currency: string;
    category?: string;
    address?: string;
    phone?: string;
  }): Promise<Merchant> {
    return this.request('/merchants/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentMerchant(): Promise<Merchant> {
    return this.request('/merchants/me');
  }

  async getMyMerchants(): Promise<Merchant[]> {
    return this.request('/merchants/my-merchants');
  }

  // --- Products Endpoints ---
  async getProducts(params?: { category?: string; search?: string }): Promise<ProductInventory[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString();
    const raw = await this.request<any[]>(`/products/${qs ? `?${qs}` : ''}`);
    
    return raw.map((p) => ({
      id: p.id,
      merchant_id: p.merchant_id,
      sku: p.sku,
      name: p.name,
      category: p.category || 'General',
      unitCost: p.unit_cost,
      unitPrice: p.unit_price,
      stockOnHand: p.stock_on_hand,
      reorderThreshold: p.reorder_point,
      safetyStock: p.safety_stock,
      leadTimeDays: p.lead_time_days,
      supplierName: p.supplier_name || 'Standard Supplier',
      status: p.stock_on_hand <= 0 ? 'OUT_OF_STOCK' : p.stock_on_hand <= p.reorder_point ? 'LOW_STOCK' : 'IN_STOCK',
      created_at: p.created_at,
    }));
  }

  async createProduct(data: {
    sku: string;
    name: string;
    category?: string;
    unit_cost: number;
    unit_price: number;
    stock_on_hand?: number;
    reorder_point?: number;
    safety_stock?: number;
    lead_time_days?: number;
    supplier_name?: string;
  }): Promise<ProductInventory> {
    const raw: any = await this.request('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      id: raw.id,
      merchant_id: raw.merchant_id,
      sku: raw.sku,
      name: raw.name,
      category: raw.category || 'General',
      unitCost: raw.unit_cost,
      unitPrice: raw.unit_price,
      stockOnHand: raw.stock_on_hand,
      reorderThreshold: raw.reorder_point,
      safetyStock: raw.safety_stock,
      leadTimeDays: raw.lead_time_days,
      supplierName: raw.supplier_name || 'Standard Supplier',
      status: raw.stock_on_hand <= 0 ? 'OUT_OF_STOCK' : raw.stock_on_hand <= raw.reorder_point ? 'LOW_STOCK' : 'IN_STOCK',
    };
  }

  async importProductsCsv(csvContent: string): Promise<{ imported_count: number; message: string }> {
    return this.request('/products/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csv_content: csvContent }),
    });
  }

  // --- Sales Endpoints ---
  async getSales(params?: { product_id?: string; limit?: number }): Promise<DailySale[]> {
    const searchParams = new URLSearchParams();
    if (params?.product_id) searchParams.append('product_id', params.product_id);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const qs = searchParams.toString();
    return this.request(`/sales/${qs ? `?${qs}` : ''}`);
  }

  async recordSale(data: {
    product_id: string;
    units_sold: number;
    revenue: number;
    date?: string;
    channel?: string;
  }): Promise<DailySale> {
    return this.request('/sales/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importSalesCsv(csvContent: string): Promise<{ imported_count: number; message: string }> {
    return this.request('/sales/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csv_content: csvContent }),
    });
  }

  // --- Inventory Endpoints ---
  async getInventoryStatus(): Promise<ProductInventory[]> {
    return this.getProducts();
  }

  async adjustStock(productId: string, deltaUnits: number, reason: string): Promise<any> {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        delta_units: deltaUnits,
        reason,
      }),
    });
  }

  async getReorderRecommendations(): Promise<ReorderRecommendation[]> {
    return this.request('/inventory/reorders');
  }

  async createPurchaseOrder(productId: string, quantity: number): Promise<PurchaseOrderDraft> {
    return this.request('/inventory/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });
  }

  async getPurchaseOrders(): Promise<PurchaseOrderDraft[]> {
    return this.request('/inventory/purchase-orders');
  }

  async receivePurchaseOrder(poId: string): Promise<PurchaseOrderDraft> {
    return this.request(`/inventory/purchase-orders/${poId}/receive`, {
      method: 'POST',
    });
  }

  // --- Transactions & Customers Endpoints ---
  async getTransactions(params?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: Transaction[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') searchParams.append('transaction_type', params.type);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString();
    const raw = await this.request<any[]>(`/transactions/${qs ? `?${qs}` : ''}`);

    const items: Transaction[] = raw.map((t) => ({
      id: t.id,
      title: t.customer_name ? `Sale to ${t.customer_name}` : t.reference_id || 'PayPal Transaction',
      date: t.created_at,
      formattedDate: new Date(t.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: t.transaction_type as any,
      amount: t.gross_amount,
      currency: t.currency,
      status: t.status as any,
      source: t.payment_method || 'PAYPAL_WALLET',
      feeAmount: t.fee_amount,
      netAmount: t.net_amount,
      customerName: t.customer_name,
      paypalOrderId: t.paypal_order_id,
    }));

    return { items, total: items.length };
  }

  async getCustomers(params?: { search?: string }): Promise<Customer[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString();
    return this.request(`/transactions/customers${qs ? `?${qs}` : ''}`);
  }

  // --- PayPal Integration Endpoints ---
  async getPayPalStatus(): Promise<PayPalConnectionStatus> {
    return this.request('/paypal/status');
  }

  async connectPayPal(data: { client_id: string; client_secret: string; environment?: string }): Promise<PayPalConnectionStatus> {
    return this.request('/paypal/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async simulateSandboxPayment(data: {
    amount: number;
    description: string;
    customer_email: string;
    customer_name: string;
    product_id?: string;
  }): Promise<any> {
    return this.request('/paypal/simulate-sandbox-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Analytics & ML Endpoints ---
  async getOverview(): Promise<AnalyticsOverview> {
    return this.request('/analytics/overview');
  }

  async getRFMSegments(): Promise<{
    status: string;
    message?: string;
    segments: CustomerSegment[];
    total_customers_analyzed: number;
  }> {
    return this.request('/analytics/rfm-segments');
  }

  async getCustomerLocations(): Promise<LocationDistribution[]> {
    return this.request('/analytics/customer-locations');
  }

  async getCategoryBreakdown(): Promise<CategoryPreference[]> {
    return this.request('/analytics/categories');
  }

  async getProductForecast(productId: string): Promise<ProductForecast> {
    return this.request(`/analytics/forecasts/${productId}`);
  }

  // --- Marketing Endpoints ---
  async getCampaigns(): Promise<MarketingCampaignDraft[]> {
    const raw: any[] = await this.request('/marketing/campaigns');
    return raw.map((c) => ({
      id: c.id,
      name: c.name,
      target_segment: c.target_segment,
      discount_percentage: c.discount_percentage,
      promo_code: c.promo_code,
      channel: c.channel,
      headline: c.headline || c.name,
      message_body: c.message_body,
      status: c.status,
      created_at: c.created_at,
    }));
  }

  async createCampaign(data: {
    name: string;
    target_segment: string;
    discount_percentage: number;
    promo_code: string;
    channel: string;
    headline?: string;
    message_body: string;
  }): Promise<MarketingCampaignDraft> {
    const raw: any = await this.request('/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      id: raw.id,
      name: raw.name,
      target_segment: raw.target_segment,
      discount_percentage: raw.discount_percentage,
      promo_code: raw.promo_code,
      channel: raw.channel,
      headline: raw.headline || raw.name,
      message_body: raw.message_body,
      status: raw.status,
      created_at: raw.created_at,
    };
  }

  // --- AI Agent Endpoints ---
  async sendAgentMessage(message: string, conversationId?: string): Promise<AgentChatMessage> {
    const res: any = await this.request('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
    return {
      id: res.id || `msg_${Date.now()}`,
      role: 'assistant',
      content: res.reply,
      tool_executions: res.tool_executions,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Settings & Audit ---
  async getAuditLogs(): Promise<any[]> {
    return this.request('/settings/audit-logs');
  }

  async exportData(): Promise<any> {
    return this.request('/settings/export');
  }
}

export const apiClient = new ApiClient();
