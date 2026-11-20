# FITMATE Data Audit Report

Generated automatically by `src/clean.py`.

## 1. Executive Summary

All raw datasets were inspected, audited, and processed into cleaned parquet artifacts under `data/processed/`.
Raw datasets in `data/raw/` remain pristine and unmodified.

| Dataset | Initial Rows | Final Clean Rows | Exact Duplicates Dropped | Outliers Nullified |
|---|---|---|---|---|
| **Rent the Runway** | 192,544 | 192,123 | 189 | Height: 0, Weight: 6, Age: 129, Bust: 0 |
| **ModCloth** | 82,790 | 81,553 | 377 | Height: 53, Waist: 0, Hips: 0, Bust: 0 |
| **Kitanesque Vintage** | 884 | 653 | 0 | Invalid dimensions filtered out |

---

## 2. Dataset Specific Audits

### 2.1 Rent the Runway (`renttherunway_final_data.json`)
- **Initial Count:** 192,544 rows
- **Removed & Why:**
  - **Exact Duplicates:** 189 rows dropped.
  - **Missing Target:** 0 rows dropped due to missing fit or size label.
  - **Irrelevant / Free-Text Columns Dropped:** `rating`, `rented for`, `review_text`, `review_summary`, `review_date`.
  - **Identifiers Retained For Splitting:** `user_id` and `item_id` are preserved exclusively for `GroupShuffleSplit`, never used as training features.
- **Unit Normalizations:**
  - Height converted from feet/inches (e.g., `5' 8"`) to **cm**.
  - Weight converted from lbs strings (e.g., `137lbs`) to **kg**.
  - Bust parsed from bra sizes (e.g., `34d`) to underbust and bust circumference in **cm**.
- **Domain Outlier Ranges Applied:**
  - Adult height: 120 cm – 220 cm
  - Weight: 30 kg – 200 kg
  - Age: 14 – 100 years
  - Bust: 50 cm – 200 cm
- **Class Balance (Fit Target):**
| Fit Class | Count |
|---|---|
| fit | 141753 |
| tight | 25711 |
| loose | 24659 |

- **Class Balance (Size Target):**
| Size Label | Count |
|---|---|
| M | 44035 |
| L | 39534 |
| S | 31971 |
| XXXL | 21296 |
| XXL | 20228 |
| XL | 20098 |
| XS | 14961 |

---

### 2.2 ModCloth (`modcloth_final_data.json`)
- **Initial Count:** 82,790 rows
- **Removed & Why:**
  - **Exact Duplicates:** 377 rows dropped.
  - **Missing Target:** 0 rows dropped.
  - **Irrelevant Columns Dropped:** `user_name`, `review_text`, `review_summary`, `shoe size`, `shoe width`, `quality`, `length`, `cup size`, `bra size`.
  - **Identifiers Retained For Splitting:** `user_id` and `item_id`.
- **Unit Normalizations:**
  - Height strings (`5ft 6in`) to **cm**.
  - Waist, hips, bust numeric values in inches to **cm**.
- **Domain Outlier Ranges Applied:**
  - Height: 120 cm – 220 cm
  - Waist: 50 cm – 200 cm
  - Hips: 50 cm – 200 cm
  - Bust: 50 cm – 200 cm
- **Class Balance (Fit Target):**
| Fit Class | Count |
|---|---|
| fit | 55935 |
| loose | 12847 |
| tight | 12771 |

- **Class Balance (Size Target):**
| Size Label | Count |
|---|---|
| M | 20310 |
| L | 18452 |
| S | 15475 |
| XXXL | 10811 |
| XXL | 7365 |
| XL | 7251 |
| XS | 1889 |

---

### 2.3 Kitanesque Vintage Garment Measurements
- **Initial Count:** 884 records across 4 vintage garment CSVs.
- **Clean Count:** 653 records with verified real garment dimensions.
- **Measured Dimensions Available:**
| Dimension | Measured Non-Null Count |
|---|---|
| bust_cm | 345 |
| waist_cm | 362 |
| hip_cm | 14 |
| length_cm | 373 |
| inseam_cm | 251 |
- **Unit Normalizations:**
  - Flat and round measurements in inches converted to circumference in **cm** (multiplied by 2.54).
- **Size Normalisation:** UK sizes and waist labels standardized to canonical sizes (`XXS` through `XXXL`).

---

## 3. Anthropometric Survey Datasets (Cataloged but Excluded from Clothing Models)

1. **NHANES 2011–2018 (Men and Women Adult Surveys):**
   - 32,316 total records containing clinical anthropometry (`BMXHT`, `BMXWT`, `BMXWAIST`, `BMXBMI`).
   - **Reason for Exclusion:** These surveys contain human body dimensions and laboratory data with zero clothing purchase, size, or fit labels. Incorporating them into clothing size/fit classifiers would require fabricating synthetic garment labels, which violates project guidelines.
2. **ANSUR II (`ansur.csv`):**
   - 6,068 military personnel records with 108 detailed 3D body measurements.
   - **Reason for Exclusion:** Contains no garment sizes, brand data, or fit ratings.
3. **Body Measurements Original Sample (`body_measurements_original.csv`):**
   - 716 rows of synthetic body measurements without clothing size labels.

---

## 4. Target Leakage Prevention

- Columns that could directly leak the target were removed or carefully separated:
  - In Model 1 (Size prediction), the fit label is treated as an optional user preference ("fit preference": whether the user prefers tight, fit, or loose fits), but size is never derived from any size-chart lookup table in the training data.
  - In Model 2 (Fit prediction), the purchased/rented garment size is an input feature alongside body dimensions, but review scores, ratings, and feedback text that reflect post-purchase sentiment were strictly excluded.
  - Group splitting by `user_id` ensures that repeat buyers/renters never leak between train and test folds.

---

## 5. Artifacts Generated

- `data/processed/renttherunway_clean.parquet`
- `data/processed/modcloth_clean.parquet`
- `data/processed/kitanesque_clean.parquet`
- `data/processed/model_1_size_data.parquet` (273,676 rows)
- `data/processed/model_2_fit_data.parquet` (273,676 rows)
- `data/processed/model_3_garment_data.parquet` (653 rows)
