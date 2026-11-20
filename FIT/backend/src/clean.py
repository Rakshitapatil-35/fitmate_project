"""
FITMATE ML Platform - Data Cleaning and Auditing Pipeline
Cleans raw datasets into parquet files and generates data_audit.md.
"""

import os
import re
import numpy as np
import pandas as pd
from src.utils import (
    save_parquet, load_parquet,
    parse_height_to_cm, parse_weight_to_kg, parse_bust_size,
    parse_inches_to_cm, normalise_size_label, standardise_category,
    map_fit_label, SIZE_ORDER
)

def clean_renttherunway(raw_path: str) -> tuple[pd.DataFrame, dict]:
    """Clean Rent the Runway dataset."""
    df_raw = pd.read_json(raw_path, lines=True)
    rows_initial = len(df_raw)
    
    # Drop exact duplicates
    df = df_raw.drop_duplicates().copy()
    rows_after_dup = len(df)
    
    # Map target fit
    df['fit_class'] = df['fit'].apply(map_fit_label)
    # Target size
    df['size_label'] = df['size'].apply(normalise_size_label)
    df['numeric_size'] = pd.to_numeric(df['size'], errors='coerce')
    
    # Drop rows missing targets
    df = df.dropna(subset=['fit_class', 'size_label']).copy()
    rows_after_target = len(df)
    
    # Parse measurements
    df['height_cm'] = df['height'].apply(parse_height_to_cm)
    df['weight_kg'] = df['weight'].apply(parse_weight_to_kg)
    df['age'] = pd.to_numeric(df['age'], errors='coerce')
    
    # Parse bust size
    bust_parsed = df['bust size'].apply(parse_bust_size)
    df['underbust_cm'] = [b[0] for b in bust_parsed]
    df['bust_cm'] = [b[1] for b in bust_parsed]
    df['cup'] = [b[2] for b in bust_parsed]
    
    # Outlier filtering
    height_outliers = ((df['height_cm'] < 120) | (df['height_cm'] > 220)).sum()
    weight_outliers = ((df['weight_kg'] < 30) | (df['weight_kg'] > 200)).sum()
    age_outliers = ((df['age'] < 14) | (df['age'] > 100)).sum()
    bust_outliers = ((df['bust_cm'] < 50) | (df['bust_cm'] > 200)).sum()
    
    # Filter valid domain ranges (or null)
    df.loc[(df['height_cm'] < 120) | (df['height_cm'] > 220), 'height_cm'] = np.nan
    df.loc[(df['weight_kg'] < 30) | (df['weight_kg'] > 200), 'weight_kg'] = np.nan
    df.loc[(df['age'] < 14) | (df['age'] > 100), 'age'] = np.nan
    df.loc[(df['bust_cm'] < 50) | (df['bust_cm'] > 200), 'bust_cm'] = np.nan
    
    # Drop rows where all key body measurements are missing
    df = df.dropna(subset=['height_cm', 'weight_kg'], how='all').copy()
    rows_after_body = len(df)
    
    # Categories
    df['category'] = df['category'].apply(standardise_category)
    body_col = 'body type' if 'body type' in df.columns else 'body_type'
    if body_col in df.columns:
        df['body_type'] = df[body_col].fillna('unknown').astype(str).str.lower().str.strip()
    else:
        df['body_type'] = 'unknown'

    
    # Missingness flags & median imputation for remaining missing numeric values
    num_cols = ['height_cm', 'weight_kg', 'age', 'bust_cm']
    for c in num_cols:
        df[f'{c}_was_missing'] = df[c].isnull().astype(int)
        median_val = df[c].median()
        df[c] = df[c].fillna(median_val)
        
    # Standardise user_id, item_id
    df['user_id'] = df['user_id'].astype(str)
    df['item_id'] = df['item_id'].astype(str)
    
    # Select columns
    cols_to_keep = [
        'user_id', 'item_id', 'category', 'body_type',
        'height_cm', 'height_cm_was_missing',
        'weight_kg', 'weight_kg_was_missing',
        'age', 'age_was_missing',
        'bust_cm', 'bust_cm_was_missing',
        'numeric_size', 'size_label', 'fit_class'
    ]
    df_clean = df[cols_to_keep].copy()
    
    audit = {
        'dataset': 'Rent the Runway',
        'rows_initial': rows_initial,
        'rows_after_dup': rows_after_dup,
        'exact_duplicates_removed': rows_initial - rows_after_dup,
        'rows_after_target': rows_after_target,
        'missing_target_removed': rows_after_dup - rows_after_target,
        'height_outliers_nullified': int(height_outliers),
        'weight_outliers_nullified': int(weight_outliers),
        'age_outliers_nullified': int(age_outliers),
        'bust_outliers_nullified': int(bust_outliers),
        'rows_final': len(df_clean),
        'dropped_columns': ['rating', 'rented for', 'review_text', 'review_summary', 'review_date', 'fit', 'size', 'bust size'],
        'fit_distribution': df_clean['fit_class'].value_counts().to_dict(),
        'size_distribution': df_clean['size_label'].value_counts().to_dict()
    }
    return df_clean, audit

def clean_modcloth(raw_path: str) -> tuple[pd.DataFrame, dict]:
    """Clean ModCloth dataset."""
    df_raw = pd.read_json(raw_path, lines=True)
    rows_initial = len(df_raw)
    
    df = df_raw.drop_duplicates().copy()
    rows_after_dup = len(df)
    
    df['fit_class'] = df['fit'].apply(map_fit_label)
    df['size_label'] = df['size'].apply(normalise_size_label)
    df['numeric_size'] = pd.to_numeric(df['size'], errors='coerce')
    
    df = df.dropna(subset=['fit_class', 'size_label']).copy()
    rows_after_target = len(df)
    
    df['height_cm'] = df['height'].apply(parse_height_to_cm)
    df['waist_cm'] = df['waist'].apply(parse_inches_to_cm)
    df['hip_cm'] = df['hips'].apply(parse_inches_to_cm)
    df['bust_cm'] = df['bust'].apply(parse_inches_to_cm)
    
    # Outlier filtering
    height_outliers = ((df['height_cm'] < 120) | (df['height_cm'] > 220)).sum()
    waist_outliers = ((df['waist_cm'] < 50) | (df['waist_cm'] > 200)).sum()
    hip_outliers = ((df['hip_cm'] < 50) | (df['hip_cm'] > 200)).sum()
    bust_outliers = ((df['bust_cm'] < 50) | (df['bust_cm'] > 200)).sum()
    
    df.loc[(df['height_cm'] < 120) | (df['height_cm'] > 220), 'height_cm'] = np.nan
    df.loc[(df['waist_cm'] < 50) | (df['waist_cm'] > 200), 'waist_cm'] = np.nan
    df.loc[(df['hip_cm'] < 50) | (df['hip_cm'] > 200), 'hip_cm'] = np.nan
    df.loc[(df['bust_cm'] < 50) | (df['bust_cm'] > 200), 'bust_cm'] = np.nan
    
    # Must have at least height or one body measurement
    df = df.dropna(subset=['height_cm', 'waist_cm', 'hip_cm', 'bust_cm'], how='all').copy()
    
    df['category'] = df['category'].apply(standardise_category)
    
    num_cols = ['height_cm', 'waist_cm', 'hip_cm', 'bust_cm']
    for c in num_cols:
        df[f'{c}_was_missing'] = df[c].isnull().astype(int)
        df[c] = df[c].fillna(df[c].median())
        
    df['user_id'] = df['user_id'].astype(str)
    df['item_id'] = df['item_id'].astype(str)
    
    cols_to_keep = [
        'user_id', 'item_id', 'category',
        'height_cm', 'height_cm_was_missing',
        'waist_cm', 'waist_cm_was_missing',
        'hip_cm', 'hip_cm_was_missing',
        'bust_cm', 'bust_cm_was_missing',
        'numeric_size', 'size_label', 'fit_class'
    ]
    df_clean = df[cols_to_keep].copy()
    
    audit = {
        'dataset': 'ModCloth',
        'rows_initial': rows_initial,
        'rows_after_dup': rows_after_dup,
        'exact_duplicates_removed': rows_initial - rows_after_dup,
        'rows_after_target': rows_after_target,
        'missing_target_removed': rows_after_dup - rows_after_target,
        'height_outliers_nullified': int(height_outliers),
        'waist_outliers_nullified': int(waist_outliers),
        'hip_outliers_nullified': int(hip_outliers),
        'bust_outliers_nullified': int(bust_outliers),
        'rows_final': len(df_clean),
        'dropped_columns': ['user_name', 'review_text', 'review_summary', 'shoe size', 'shoe width', 'quality', 'length', 'cup size', 'bra size'],
        'fit_distribution': df_clean['fit_class'].value_counts().to_dict(),
        'size_distribution': df_clean['size_label'].value_counts().to_dict()
    }
    return df_clean, audit

def clean_kitanesque_garments() -> tuple[pd.DataFrame, dict]:
    """Clean and merge Kitanesque vintage garment measurements datasets."""
    files = [
        ('data/raw/kitanesque-vintage-garments-measurements-2026-10-26.csv', 'garments'),
        ('data/raw/kitanesque-vintage-jeans-measurements-2026-10-26.csv', 'jeans'),
        ('data/raw/kitanesque-vintage-knitwear-measurements-2026-10-26.csv', 'knitwear'),
        ('data/raw/kitanesque-vintage-rise-measurements-2026-10-26.csv', 'rise')
    ]
    
    records = []
    total_raw_rows = 0
    for path, source_type in files:
        if not os.path.exists(path):
            continue
        df = pd.read_csv(path)
        total_raw_rows += len(df)
        
        for _, row in df.iterrows():
            brand = str(row.get('brand', 'unknown')).strip().lower()
            if brand in ['nan', 'none', '']:
                brand = 'unknown'
                
            raw_garment = str(row.get('garment', source_type)).strip().lower()
            category = standardise_category(raw_garment)
            
            # Size
            raw_size = row.get('listed_size') or row.get('listed_uk_size') or row.get('label_waist')
            size_label = normalise_size_label(raw_size)
            
            # Dimensions in cm
            # Bust / chest
            bust_in = row.get('bust_round_in')
            if pd.isnull(bust_in) and 'bust_flat_in' in row and pd.notnull(row['bust_flat_in']):
                bust_in = row['bust_flat_in'] * 2.0
            bust_cm = parse_inches_to_cm(bust_in)
            
            # Waist
            waist_in = row.get('waist_round_in')
            if pd.isnull(waist_in):
                waist_in = row.get('waistband_round_in')
            if pd.isnull(waist_in) and 'waist_flat_in' in row and pd.notnull(row['waist_flat_in']):
                waist_in = row['waist_flat_in'] * 2.0
            waist_cm = parse_inches_to_cm(waist_in)
            
            # Hip
            hip_in = row.get('hip_round_in')
            if pd.isnull(hip_in) and 'hip_flat_in' in row and pd.notnull(row['hip_flat_in']):
                hip_in = row['hip_flat_in'] * 2.0
            hip_cm = parse_inches_to_cm(hip_in)
            
            # Length
            length_in = row.get('length_in')
            length_cm = parse_inches_to_cm(length_in)
            
            # Inseam / inside leg
            inseam_in = row.get('inside_leg_in')
            inseam_cm = parse_inches_to_cm(inseam_in)
            
            records.append({
                'brand': brand,
                'category': category,
                'size_label': size_label,
                'bust_cm': bust_cm,
                'waist_cm': waist_cm,
                'hip_cm': hip_cm,
                'length_cm': length_cm,
                'inseam_cm': inseam_cm,
                'source': source_type
            })
            
    df_merged = pd.DataFrame(records)
    rows_before_filter = len(df_merged)
    
    # Must have size_label and at least one measured dimension
    dim_cols = ['bust_cm', 'waist_cm', 'hip_cm', 'length_cm', 'inseam_cm']
    df_merged = df_merged.dropna(subset=['size_label']).copy()
    df_merged = df_merged.dropna(subset=dim_cols, how='all').copy()
    
    # Sanity filter on dimensions
    for c in dim_cols:
        df_merged.loc[(df_merged[c] < 20) | (df_merged[c] > 250), c] = np.nan
        
    df_merged = df_merged.dropna(subset=dim_cols, how='all').copy()
    
    audit = {
        'dataset': 'Kitanesque Vintage Garments',
        'rows_initial': total_raw_rows,
        'rows_final': len(df_merged),
        'size_distribution': df_merged['size_label'].value_counts().to_dict(),
        'dimensions_measured_counts': {c: int(df_merged[c].notnull().sum()) for c in dim_cols}
    }
    return df_merged, audit

def build_combined_datasets(df_rtr: pd.DataFrame, df_mc: pd.DataFrame):
    """
    Build specialized datasets for Model 1 (size) and Model 2 (fit).
    """
    # For Model 1: Body measurements + category + fit_preference -> size_label
    # RentTheRunway has height_cm, weight_kg, age, bust_cm, category, fit_class
    # ModCloth has height_cm, waist_cm, hip_cm, bust_cm, category, fit_class
    
    rtr_m1 = df_rtr[['user_id', 'item_id', 'height_cm', 'weight_kg', 'age', 'bust_cm', 'category', 'fit_class', 'size_label']].copy()
    rtr_m1['source'] = 'renttherunway'
    rtr_m1['waist_cm'] = np.nan
    rtr_m1['hip_cm'] = np.nan
    
    mc_m1 = df_mc[['user_id', 'item_id', 'height_cm', 'waist_cm', 'hip_cm', 'bust_cm', 'category', 'fit_class', 'size_label']].copy()
    mc_m1['source'] = 'modcloth'
    mc_m1['weight_kg'] = np.nan
    mc_m1['age'] = np.nan
    
    m1_df = pd.concat([rtr_m1, mc_m1], ignore_index=True)
    # Add fit_preference (the fit class acts as the fit preference context)
    m1_df['fit_preference'] = m1_df['fit_class']
    
    # Impute missing values per source / globally with flags
    for c in ['height_cm', 'weight_kg', 'age', 'bust_cm', 'waist_cm', 'hip_cm']:
        m1_df[f'{c}_was_missing'] = m1_df[c].isnull().astype(int)
        med = m1_df[c].median()
        m1_df[c] = m1_df[c].fillna(med)
        
    # Model 2: Fit classifier
    # Predicts fit_class ('tight', 'fit', 'loose') given body + garment info
    # Both RTR and MC
    m2_df = pd.concat([rtr_m1, mc_m1], ignore_index=True)
    for c in ['height_cm', 'weight_kg', 'age', 'bust_cm', 'waist_cm', 'hip_cm']:
        m2_df[f'{c}_was_missing'] = m2_df[c].isnull().astype(int)
        med = m2_df[c].median()
        m2_df[c] = m2_df[c].fillna(med)
        
    return m1_df, m2_df

def run_cleaning_pipeline():
    """Main execution entry point."""
    print('Starting Data Cleaning and Auditing Pipeline...')
    
    rtr_raw = 'data/raw/renttherunway_final_data.json'
    mc_raw = 'data/raw/modcloth_final_data.json'
    
    print('Cleaning Rent the Runway...')
    df_rtr, audit_rtr = clean_renttherunway(rtr_raw)
    save_parquet(df_rtr, 'data/processed/renttherunway_clean.parquet')
    print(f'Rent the Runway clean: {len(df_rtr):,} rows saved.')
    
    print('Cleaning ModCloth...')
    df_mc, audit_mc = clean_modcloth(mc_raw)
    save_parquet(df_mc, 'data/processed/modcloth_clean.parquet')
    print(f'ModCloth clean: {len(df_mc):,} rows saved.')
    
    print('Cleaning Kitanesque Garments...')
    df_kit, audit_kit = clean_kitanesque_garments()
    save_parquet(df_kit, 'data/processed/kitanesque_clean.parquet')
    print(f'Kitanesque clean: {len(df_kit):,} rows saved.')
    
    print('Building Model 1 and Model 2 processed datasets...')
    df_m1, df_m2 = build_combined_datasets(df_rtr, df_mc)
    save_parquet(df_m1, 'data/processed/model_1_size_data.parquet')
    save_parquet(df_m2, 'data/processed/model_2_fit_data.parquet')
    save_parquet(df_kit, 'data/processed/model_3_garment_data.parquet')
    print(f'Model 1 Size dataset: {len(df_m1):,} rows')
    print(f'Model 2 Fit dataset: {len(df_m2):,} rows')
    print(f'Model 3 Garment dataset: {len(df_kit):,} rows')
    
    # Generate reports/data_audit.md
    write_audit_report(audit_rtr, audit_mc, audit_kit, df_m1, df_m2)
    print('Audit report successfully written to reports/data_audit.md')

def dict_to_md_table(d: dict, col1: str = 'Key', col2: str = 'Value') -> str:
    """Format dictionary as Markdown table without external dependencies."""
    lines = [f'| {col1} | {col2} |', '|---|---|']
    for k, v in d.items():
        lines.append(f'| {k} | {v} |')
    return '\n'.join(lines)

def write_audit_report(audit_rtr, audit_mc, audit_kit, df_m1, df_m2):
    """Write markdown audit report."""
    os.makedirs('reports', exist_ok=True)
    report = f"""# FITMATE Data Audit Report

Generated automatically by `src/clean.py`.

## 1. Executive Summary

All raw datasets were inspected, audited, and processed into cleaned parquet artifacts under `data/processed/`.
Raw datasets in `data/raw/` remain pristine and unmodified.

| Dataset | Initial Rows | Final Clean Rows | Exact Duplicates Dropped | Outliers Nullified |
|---|---|---|---|---|
| **Rent the Runway** | {audit_rtr['rows_initial']:,} | {audit_rtr['rows_final']:,} | {audit_rtr['exact_duplicates_removed']:,} | Height: {audit_rtr['height_outliers_nullified']}, Weight: {audit_rtr['weight_outliers_nullified']}, Age: {audit_rtr['age_outliers_nullified']}, Bust: {audit_rtr['bust_outliers_nullified']} |
| **ModCloth** | {audit_mc['rows_initial']:,} | {audit_mc['rows_final']:,} | {audit_mc['exact_duplicates_removed']:,} | Height: {audit_mc['height_outliers_nullified']}, Waist: {audit_mc['waist_outliers_nullified']}, Hips: {audit_mc['hip_outliers_nullified']}, Bust: {audit_mc['bust_outliers_nullified']} |
| **Kitanesque Vintage** | {audit_kit['rows_initial']:,} | {audit_kit['rows_final']:,} | 0 | Invalid dimensions filtered out |

---

## 2. Dataset Specific Audits

### 2.1 Rent the Runway (`renttherunway_final_data.json`)
- **Initial Count:** {audit_rtr['rows_initial']:,} rows
- **Removed & Why:**
  - **Exact Duplicates:** {audit_rtr['exact_duplicates_removed']:,} rows dropped.
  - **Missing Target:** {audit_rtr['missing_target_removed']:,} rows dropped due to missing fit or size label.
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
{dict_to_md_table(audit_rtr['fit_distribution'], 'Fit Class', 'Count')}

- **Class Balance (Size Target):**
{dict_to_md_table(audit_rtr['size_distribution'], 'Size Label', 'Count')}

---

### 2.2 ModCloth (`modcloth_final_data.json`)
- **Initial Count:** {audit_mc['rows_initial']:,} rows
- **Removed & Why:**
  - **Exact Duplicates:** {audit_mc['exact_duplicates_removed']:,} rows dropped.
  - **Missing Target:** {audit_mc['missing_target_removed']:,} rows dropped.
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
{dict_to_md_table(audit_mc['fit_distribution'], 'Fit Class', 'Count')}

- **Class Balance (Size Target):**
{dict_to_md_table(audit_mc['size_distribution'], 'Size Label', 'Count')}

---

### 2.3 Kitanesque Vintage Garment Measurements
- **Initial Count:** {audit_kit['rows_initial']:,} records across 4 vintage garment CSVs.
- **Clean Count:** {audit_kit['rows_final']:,} records with verified real garment dimensions.
- **Measured Dimensions Available:**
{dict_to_md_table(audit_kit['dimensions_measured_counts'], 'Dimension', 'Measured Non-Null Count')}
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
- `data/processed/model_1_size_data.parquet` ({len(df_m1):,} rows)
- `data/processed/model_2_fit_data.parquet` ({len(df_m2):,} rows)
- `data/processed/model_3_garment_data.parquet` ({audit_kit['rows_final']:,} rows)
"""
    with open('reports/data_audit.md', 'w', encoding='utf-8') as f:
        f.write(report)


if __name__ == '__main__':
    run_cleaning_pipeline()
