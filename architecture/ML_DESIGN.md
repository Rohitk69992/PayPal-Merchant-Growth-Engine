# ML_DESIGN.md
## PayPal Merchant Growth Engine — Data Science & Machine Learning Pipeline
### PayPal AI Hackathon 2026

---

## 1. Principles & Objectives
The platform intentionally isolates **deterministic mathematical calculations and statistical machine learning** from generative language models. Large Language Models (LLMs) are prone to arithmetic hallucination; therefore:
- All financial aggregation, RFM scoring, clustering, time-series projections, and safety-stock equations run in pure Python (NumPy, Pandas, Scikit-learn, Statsmodels).
- Generative AI (Gemini) acts as an **interpreter, summarizer, and contextual copywriter**, consuming the structured outputs of the ML models rather than calculating numbers directly.

---

## 2. Customer Segmentation Engine (RFM + K-Means)

### 2.1 Feature Engineering (RFM Metrics)
For each customer $i$ belonging to a merchant, three primary behavioral vectors are computed over a 365-day rolling observation window:
1. **Recency ($R_i$)**: Days elapsed between the snapshot date $T_{\text{now}}$ and the customer's most recent completed PayPal transaction:
   $$R_i = \max\left(0, \frac{T_{\text{now}} - \max(t_j)}{86400}\right)$$
2. **Frequency ($F_i$)**: Total count of completed transactions within the observation window:
   $$F_i = \sum_{j \in \text{Transactions}_i} 1$$
3. **Monetary Value ($M_i$)**: Total gross spending processed across all completed transactions:
   $$M_i = \sum_{j \in \text{Transactions}_i} \text{GrossAmount}_j$$

### 2.2 Data Validation & Preprocessing
1. **Outlier Mitigation**: Filter non-retail edge cases (e.g. bulk test charges) by capping values at the 99th percentile via Winsorization.
2. **Log Transformation**: Mitigate strong positive skewness common in transaction spending:
   $$\tilde{R}_i = \ln(R_i + 1), \quad \tilde{F}_i = \ln(F_i + 1), \quad \tilde{M}_i = \ln(M_i + 1)$$
3. **Standard Scaling**: Standardize features using Scikit-Learn's `StandardScaler`:
   $$z = \frac{x - \mu}{\sigma}$$

### 2.3 Clustering Methodology (K-Means)
- **Algorithm**: `KMeans(n_clusters=4, init='k-means++', n_init=10, random_state=42)`
- **Cluster Assignment & Semantic Mapping**:
  Clusters are ordered and mapped deterministically to four standard business cohorts:
  - **VIP (High M, High F, Low R)**: ~10% of customers, highest revenue contributors. Target: Exclusive VIP rewards, early access.
  - **Loyal (Moderate-High M, High F, Moderate R)**: ~20% of customers, dependable recurring volume. Target: Brand loyalty perks, bundle cross-sells.
  - **Returning / Promising (Moderate M, Moderate F, Low R)**: ~28% of customers, repeat buyers. Target: Category discovery discounts.
  - **New Customers (Low F=1, Very Low R)**: ~42% of customers, recent first purchase. Target: 2nd purchase onboarding campaign within 14 days.
  - **At-Risk (High M or F in past, High R > 60 days)**: Churn candidates. Target: Win-back promotion with time-limited discount.

### 2.4 Model Evaluation
- Track **Silhouette Coefficient** (target $> 0.55$) and **Davies-Bouldin Index** on each training cycle.
- Persist model centroids and scaler weights using `joblib`.

---

## 3. Demand Forecasting Engine

### 3.1 Input Data Preparation
1. Aggregate transactions by `product_id` and `sales_date` ($Y_t$ = daily units sold).
2. **Zero-Filling**: Ensure a contiguous daily time series by filling non-transaction dates with $0$ units sold.
3. Remove anomalous bulk test spikes with median rolling filters.

### 3.2 Time-Series Forecasting Models
To balance computational efficiency, explainability, and small-data robustness in a hackathon deployment:
1. **Baseline Model: 7-Day & 30-Day Moving Average**
   $$\hat{Y}_{t+1} = \frac{1}{k} \sum_{i=0}^{k-1} Y_{t-i}$$
2. **Primary Model: Holt-Winters Exponential Smoothing (Additive Trend & Seasonality)**
   Decomposes series into Level ($\ell_t$), Trend ($b_t$), and Seasonality ($s_t$):
   $$\ell_t = \alpha(Y_t - s_{t-m}) + (1-\alpha)(\ell_{t-1} + b_{t-1})$$
   $$b_t = \beta(\ell_t - \ell_{t-1}) + (1-\beta)b_{t-1}$$
   $$s_t = \gamma(Y_t - \ell_t) + (1-\gamma)s_{t-m}$$
   $$\hat{Y}_{t+h} = \ell_t + h b_t + s_{t-m + (h \bmod m)}$$
3. **Forecast Horizon**:
   - Short-term: 14 days (daily granularity for urgent stock replenishment).
   - Medium-term: 3 months (monthly projections for quarterly purchasing planning, e.g. Nov: 70 units, Dec: 115 units (+42% holiday spike), Jan: 85 units).

### 3.3 Forecast Evaluation Metrics
The pipeline computes backtesting metrics across historical 14-day holdout sets:
- **Mean Absolute Error (MAE)**: $\frac{1}{n} \sum |Y_t - \hat{Y}_t|$
- **Root Mean Squared Error (RMSE)**: $\sqrt{\frac{1}{n}\sum (Y_t - \hat{Y}_t)^2}$
- **Mean Absolute Percentage Error (MAPE)**: $\frac{100\%}{n} \sum \left|\frac{Y_t - \hat{Y}_t}{Y_t}\right|$ (evaluated only on non-zero days).

---

## 4. Deterministic Inventory Optimization Logic

### 4.1 Safety Stock ($SS$) Calculation
Safety stock accounts for demand variability ($\sigma_D$) and supplier lead time variability ($\sigma_L$):
$$SS = Z \times \sqrt{L \times \sigma_D^2 + D_{\text{avg}}^2 \times \sigma_L^2}$$
Where:
- $Z = 1.65$ (corresponding to a 95% service level / target stockout probability $\le 5\%$).
- $L$ = Supplier lead time in days.
- $\sigma_D$ = Standard deviation of daily demand.
- $D_{\text{avg}}$ = Average daily sales over the last 30 days.

### 4.2 Reorder Point ($ROP$)
The inventory level that automatically triggers a restock order:
$$ROP = (D_{\text{avg}} \times L) + SS$$

### 4.3 Recommended Order Quantity ($Q^*$)
When on-hand stock ($I_{\text{on\_hand}}$) approaches or dips below $ROP$:
$$Q^* = \max\left(Q_{\text{min}}, \lceil \hat{D}_{\text{forecast}}(L + \text{ReviewPeriod}) + SS - I_{\text{on\_hand}} - I_{\text{incoming}} \rceil\right)$$

### 4.4 Example Verification: Wireless Headphones
- Current stock on hand: $80$ units.
- Average daily sales ($D_{\text{avg}}$): $4.0$ units/day.
- Supplier lead time ($L$): $14$ days.
- Projected demand spike over next month: $+42\%$ ($D_{\text{peak}} \approx 5.7$ units/day).
- Review period: $30$ days.
- Lead time demand: $14 \times 5.7 \approx 80$ units.
- Required replenishment to cover holiday spike: **$120$ units**.
- Result: Perfectly matches the wireframe recommendation: *"Based on your sales trend and seasonal demand, we suggest ordering 120 units of Wireless Headphones in the next 2 weeks."*
