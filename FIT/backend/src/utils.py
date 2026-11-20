"""
FITMATE ML Platform - Utility functions
Unit conversion, category normalization, size mapping, and I/O helpers.
"""

import re
import os
import numpy as np
import pandas as pd
import duckdb

# Ordinal size order
SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
SIZE_TO_ORDINAL = {s: i for i, s in enumerate(SIZE_ORDER)}
ORDINAL_TO_SIZE = {i: s for i, s in enumerate(SIZE_ORDER)}

# Fit classes
FIT_CLASSES = ['tight', 'fit', 'loose']

def save_parquet(df: pd.DataFrame, path: str):
    """Save DataFrame to parquet using DuckDB for zero-dependency portability."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    conn = duckdb.connect()
    conn.register('temp_df', df)
    conn.execute(f"COPY temp_df TO '{path}' (FORMAT PARQUET)")
    conn.close()

def load_parquet(path: str) -> pd.DataFrame:
    """Load parquet file into pandas DataFrame via DuckDB."""
    conn = duckdb.connect()
    df = conn.execute(f"SELECT * FROM read_parquet('{path}')").df()
    conn.close()
    return df

def parse_height_to_cm(val) -> float:
    """
    Parse height string or number into cm.
    Accepts:
      - "5' 8\"", "5'8", "5ft 8in", "5 ft 8 in"
      - "170 cm", "170cm", 170
      - "68 in", 68 (if clearly in inches, e.g. < 90)
    """
    if pd.isnull(val):
        return np.nan
    if isinstance(val, (int, float)):
        # If between 120 and 220, already cm
        if 120 <= val <= 220:
            return float(val)
        # If between 45 and 90, likely inches
        if 45 <= val <= 90:
            return round(val * 2.54, 1)
        return float(val)

    s = str(val).strip().lower()
    # Feet and inches: 5' 8", 5ft 8in, 5'8
    m_ft_in = re.search(r"(\d+)\s*(?:'|ft)\s*(\d+)?(?:\s*(?:\"|in))?", s)
    if m_ft_in:
        ft = float(m_ft_in.group(1))
        inch = float(m_ft_in.group(2)) if m_ft_in.group(2) else 0.0
        return round(ft * 30.48 + inch * 2.54, 1)

    # CM: 170cm, 170 cm
    m_cm = re.search(r"(\d+(?:\.\d+)?)\s*cm", s)
    if m_cm:
        return round(float(m_cm.group(1)), 1)

    # Bare number as string
    m_num = re.search(r"^(\d+(?:\.\d+)?)$", s)
    if m_num:
        num = float(m_num.group(1))
        if 120 <= num <= 220:
            return num
        if 45 <= num <= 90:
            return round(num * 2.54, 1)
        return num

    return np.nan

def parse_weight_to_kg(val) -> float:
    """
    Parse weight string or number into kg.
    Accepts: "137lbs", "137 lbs", "62kg", "62 kg", 137 (lbs or kg depending on range)
    """
    if pd.isnull(val):
        return np.nan
    if isinstance(val, (int, float)):
        # If float/int > 75, typical US weight in lbs (e.g. 130-220 lbs)
        if val > 75:
            return round(val * 0.45359237, 1)
        return float(val)

    s = str(val).strip().lower()

    # Explicit kg
    m_kg = re.search(r"(\d+(?:\.\d+)?)\s*kg", s)
    if m_kg:
        return round(float(m_kg.group(1)), 1)

    # Explicit lbs
    m_lbs = re.search(r"(\d+(?:\.\d+)?)\s*(?:lbs|lb)", s)
    if m_lbs:
        return round(float(m_lbs.group(1)) * 0.45359237, 1)

    # Number only
    m_num = re.search(r"^(\d+(?:\.\d+)?)$", s)
    if m_num:
        num = float(m_num.group(1))
        # Default assume lbs if > 75, else kg
        if num > 75:
            return round(num * 0.45359237, 1)
        return num

    return np.nan

def parse_bust_size(val):
    """
    Parse bust size strings such as '34d', '36c', '32b', '34dd', '90cm', '36in', or numeric values.
    Returns (underbust_cm, bust_cm, cup_letter).
    """
    if pd.isnull(val):
        return np.nan, np.nan, np.nan
    s = str(val).strip().lower()

    # Explicit cm string (e.g. '90cm', '92.5 cm')
    m_cm = re.match(r"^(\d+(?:\.\d+)?)\s*cm$", s)
    if m_cm:
        cm = round(float(m_cm.group(1)), 1)
        return cm, cm, np.nan

    # Explicit inches string (e.g. '36in', '36 inches', '36"')
    m_in = re.match(r"^(\d+(?:\.\d+)?)\s*(?:in|inch|inches|\")$", s)
    if m_in:
        cm = round(float(m_in.group(1)) * 2.54, 1)
        return cm, cm, np.nan

    # Bra band + cup size (e.g. '34d', '36c', '32dd', '34ddd')
    m = re.match(r"^(\d{2})\s*(aa|a|b|c|d|dd|ddd|e|f|g|h|i|j)$", s)
    if not m:
        # Bare numeric bust (e.g. from ModCloth '36' inches or '92' cm)
        try:
            num = float(s)
            cm = round(num * 2.54, 1) if 16 <= num < 60 else num
            return cm, cm, np.nan
        except ValueError:
            return np.nan, np.nan, np.nan

    band_in = float(m.group(1))
    cup = m.group(2)
    # Cup depth in inches: AA=0.5, A=1, B=2, C=3, D=4, DD/E=5, DDD/F=6, G=7, H=8
    cup_diff_map = {
        'aa': 0.5, 'a': 1.0, 'b': 2.0, 'c': 3.0, 'd': 4.0,
        'dd': 5.0, 'e': 5.0, 'ddd': 6.0, 'f': 6.0, 'g': 7.0, 'h': 8.0, 'i': 9.0, 'j': 10.0
    }
    cup_diff = cup_diff_map.get(cup, 3.0)
    underbust_cm = round(band_in * 2.54, 1)
    bust_cm = round((band_in + cup_diff) * 2.54, 1)
    return underbust_cm, bust_cm, cup


def parse_circumference_to_cm(val) -> float:
    """
    Parse waist or hip circumference (in cm or inches) into cm.
    Values in [16, 50) without units are interpreted as inches; values in [50, 220] as cm.
    """
    if pd.isnull(val):
        return np.nan
    if isinstance(val, (int, float)):
        num = float(val)
        if 16.0 <= num < 50.0:
            return round(num * 2.54, 1)
        return round(num, 1)

    s = str(val).strip().lower()
    m_cm = re.search(r"(\d+(?:\.\d+)?)\s*cm", s)
    if m_cm:
        return round(float(m_cm.group(1)), 1)
    m_in = re.search(r"(\d+(?:\.\d+)?)\s*(?:in|inch|inches|\")", s)
    if m_in:
        return round(float(m_in.group(1)) * 2.54, 1)
    m_num = re.search(r"(\d+(?:\.\d+)?)", s)
    if m_num:
        num = float(m_num.group(1))
        if 16.0 <= num < 50.0:
            return round(num * 2.54, 1)
        return round(num, 1)
    return np.nan

def parse_inches_to_cm(val) -> float:
    """Convert measurement in inches to cm."""
    if pd.isnull(val):
        return np.nan
    try:
        val_float = float(val)
        return round(val_float * 2.54, 1)
    except (ValueError, TypeError):
        s = str(val).strip().lower()
        m = re.search(r"(\d+(?:\.\d+)?)", s)
        if m:
            return round(float(m.group(1)) * 2.54, 1)
    return np.nan

def normalise_size_label(val) -> str:
    """
    Normalise size representation to standard scheme:
    XXS, XS, S, M, L, XL, XXL, XXXL.
    Accepts US numeric sizes (0 to 32+) and letter sizes.
    """
    if pd.isnull(val):
        return np.nan
    s = str(val).strip().upper()
    
    # Direct match
    if s in SIZE_ORDER:
        return s
    
    # Common variations
    alias_map = {
        '00': 'XXS', '2XS': 'XXS', 'XX-SMALL': 'XXS',
        '0': 'XS', '2': 'XS', 'X-SMALL': 'XS',
        '4': 'S', '6': 'S', 'SMALL': 'S',
        '8': 'M', '10': 'M', 'MEDIUM': 'M', 'MED': 'M',
        '12': 'L', '14': 'L', 'LARGE': 'L',
        '16': 'XL', '18': 'XL', '1X': 'XL', 'X-LARGE': 'XL',
        '20': 'XXL', '22': 'XXL', '2X': 'XXL', 'XX-LARGE': 'XXL', '2XL': 'XXL',
        '24': 'XXXL', '26': 'XXXL', '28': 'XXXL', '30': 'XXXL', '32': 'XXXL',
        '34': 'XXXL', '36': 'XXXL', '38': 'XXXL', '3X': 'XXXL', '3XL': 'XXXL',
        # UK sizes in Kitanesque
        'UK 4': 'XXS', 'UK 6': 'XS', 'UK 6-8': 'XS',
        'UK 8': 'S', 'UK 8-10': 'S', 'UK 10': 'M', 'UK 10-12': 'M',
        'UK 12': 'L', 'UK 12-14': 'L', 'UK 14': 'XL', 'UK 14-16': 'XL',
        'UK 16': 'XXL', 'UK 18': 'XXL', 'UK 20': 'XXXL'
    }
    if s in alias_map:
        return alias_map[s]
    
    # Try numeric parsing
    try:
        num = float(s)
        if num <= 0:
            return 'XXS'
        elif num <= 2:
            return 'XS'
        elif num <= 6:
            return 'S'
        elif num <= 10:
            return 'M'
        elif num <= 14:
            return 'L'
        elif num <= 18:
            return 'XL'
        elif num <= 22:
            return 'XXL'
        else:
            return 'XXXL'
    except ValueError:
        pass
        
    return np.nan

def standardise_category(cat) -> str:
    """Standardise clothing categories to a canonical vocabulary."""
    if pd.isnull(cat):
        return 'other'
    c = str(cat).strip().lower()
    
    # Synonym unification
    if c in ['dress', 'dresses', 'gown', 'sheath', 'shift', 'maxi', 'mini', 'shirtdress', 'knit dress']:
        return 'dress'
    elif c in ['top', 'tops', 'shirt', 'blouse', 't-shirt', 'tshirt', 'tee', 'tank', 'camisole', 'tunic']:
        return 'top'
    elif c in ['bottoms', 'pants', 'trousers', 'jeans', 'leggings', 'culottes', 'shorts', 'skirt', 'skirts']:
        return 'bottoms'
    elif c in ['outerwear', 'jacket', 'coat', 'blazer', 'parka', 'cardigan', 'vest', 'outer']:
        return 'outerwear'
    elif c in ['jumper/knit top', 'knitwear', 'sweater', 'pullover']:
        return 'knitwear'
    elif c in ['jumpsuit', 'romper']:
        return 'jumpsuit'
    elif c in ['wedding']:
        return 'dress'
    return c

def map_fit_label(val) -> str:
    """
    Map fit review label to canonical target classes: tight / fit / loose.
    'small' -> garment ran small / was tight
    'fit'   -> fit as expected
    'large' -> garment ran large / was loose
    """
    if pd.isnull(val):
        return np.nan
    s = str(val).strip().lower()
    mapping = {
        'small': 'tight',
        'tight': 'tight',
        'fit': 'fit',
        'large': 'loose',
        'loose': 'loose'
    }
    return mapping.get(s, np.nan)


if __name__ == '__main__':
    print('Testing utils:')
    print('5ft 8in ->', parse_height_to_cm('5ft 8in'))
    print('137lbs ->', parse_weight_to_kg('137lbs'))
    print('34d ->', parse_bust_size('34d'))
    print('size 12 ->', normalise_size_label('12'))
    print('category dresses ->', standardise_category('dresses'))
    print('fit small ->', map_fit_label('small'))
    print('All utils tested successfully!')

