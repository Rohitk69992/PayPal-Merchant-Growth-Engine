# Machine Learning & Data Science Pipelines

## 1. Overview of ML Architectures

The platform integrates two core statistical and machine learning engines:
1. **Unsupervised Customer Segmentation**: Scikit-learn K-Means RFM clustering.
2. **Time-Series Demand Forecasting**: Statsmodels Holt-Winters Exponential Smoothing & Rolling Moving Average.
3. **Deterministic Inventory Replenishment**: Statistical Reorder Point ($ROP$) and Safety Stock formula.

---

## 2. Customer Intelligence: RFM K-Means Pipeline

### 2.1 Feature Engineering
For each customer in `customers`, the pipeline calculates:
- **Recency ($R$)**: Days elapsed since the customer's `last_purchase_at` relative to current UTC time.
- **Frequency ($F$)**: Total verified order count (`order_count`).
- **Monetary ($M$)**: Total net spend (`total_spend`).

Because monetary spend and frequency distributions typically exhibit severe positive skewness, we apply natural logarithm transformations:

$$R_{\text{log}} = \ln(R + 1), \quad F_{\text{log}} = \ln(F + 1), \quad M_{\text{log}} = \ln(M + 1)$$

Features are subsequently normalized using `StandardScaler`:

$$z = \frac{x - \mu}{\sigma}$$

### 2.2 Model Training & Cluster Sizing
- **Algorithm**: `sklearn.cluster.KMeans` with `init='k-means++'`, `n_init=10`, and `random_state=42`.
- **Threshold Rule**: Enforces $N \ge 4$. If fewer than 4 customers exist, returns `INSUFFICIENT_DATA`.
- **Cluster Count ($k$)**: Dynamically chosen as $\min(4, N)$.
- **Validation**: Evaluates `silhouette_score(scaled_features, labels)` to measure cluster separation.
- **Segment Labeling**: Cohorts are sorted by average monetary spend and frequency into:
  1. *VIP Customers* (Highest spend & repeat frequency)
  2. *Loyal Shoppers* (Consistent purchasing cadence)
  3. *Promising / Returning* (Recent repeat shoppers)
  4. *New / At-Risk* (Recent first-time shoppers or longer inactivity)

---

## 3. Sales Intelligence: Holt-Winters Demand Forecasting

### 3.1 Mathematical Formulation
When $\ge 5$ distinct daily sales observations exist, the engine fits an exponential smoothing model:

$$\hat{y}_{t+h\mid t} = \ell_t + h b_t + s_{t+h-m(k+1)}$$

Where:
- $\ell_t$ is the level term
- $b_t$ is the trend component
- $s_t$ is the seasonal component

If seasonal periods are not fully populated or sample size is between 5 and 14 days, the model gracefully applies a **Weighted Moving Average** with exponential decay and calculates 95% confidence intervals:

$$\text{Confidence Interval} = \hat{y} \pm (1.96 \times \sigma)$$

### 3.2 Sufficiency Evaluation
- $< 5$ sales days: Returns `INSUFFICIENT_DATA` with exact data point deficit.
- $5 - 13$ sales days: Fits `MOVING_AVERAGE` with 95% confidence intervals.
- $\ge 14$ sales days: Fits full `HOLT_WINTERS` additive model.

---

## 4. Deterministic Inventory Math

The inventory assistant calculates scientific reorder points using standard operations research principles:

$$ROP = (D_{\text{avg}} \times L) + SS$$

Where:
- $D_{\text{avg}}$: Empirical average daily demand units.
- $L$: Supplier lead time in days.
- $SS$: Safety stock protecting against demand and lead-time variability.

### Safety Stock Formula:
$$SS = Z \times \sqrt{L \sigma_D^2 + D_{\text{avg}}^2 \sigma_L^2}$$

For a 95% service level ($Z = 1.65$) with deterministic supplier lead time ($\sigma_L = 0$):

$$SS = 1.65 \times \sigma_D \times \sqrt{L}$$
