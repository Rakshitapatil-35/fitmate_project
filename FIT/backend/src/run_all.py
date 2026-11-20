"""
FITMATE ML Platform - Master End-to-End Orchestrator
Executes data cleaning, model training for Models 1, 2, and 3,
and runs verification tests in a single command:
    python -m src.run_all
"""

import sys
import time
import subprocess
from src.clean import run_cleaning_pipeline
from src.train_model_1 import train_size_model
from src.train_model_2 import train_fit_model
from src.train_model_3 import train_garment_model

def run_all():
    print("=" * 70)
    print("      FITMATE ML PLATFORM - MASTER EXECUTION PIPELINE")
    print("=" * 70)
    start_total = time.time()
    
    # 1. Clean and audit data
    print("\n>>> STEP 1: DATA AUDIT AND CLEANING")
    t0 = time.time()
    run_cleaning_pipeline()
    print(f"--- Data cleaning complete in {time.time() - t0:.1f}s ---\n")
    
    # 2. Train Model 1
    print("\n>>> STEP 2A: TRAIN MODEL 1 (SIZE PREDICTION)")
    t0 = time.time()
    train_size_model()
    print(f"--- Model 1 training complete in {time.time() - t0:.1f}s ---\n")
    
    # 3. Train Model 2
    print("\n>>> STEP 2B: TRAIN MODEL 2 (FIT RECOMMENDATION)")
    t0 = time.time()
    train_fit_model()
    print(f"--- Model 2 training complete in {time.time() - t0:.1f}s ---\n")
    
    # 4. Train Model 3
    print("\n>>> STEP 2C: TRAIN MODEL 3 (GARMENT DIMENSION REGRESSION)")
    t0 = time.time()
    train_garment_model()
    print(f"--- Model 3 training complete in {time.time() - t0:.1f}s ---\n")
    
    # 5. Run Pytest Suite
    print("\n>>> STEP 3: RUN PYTEST VERIFICATION SUITE")
    t0 = time.time()
    import pytest
    ret_code = pytest.main(["tests/", "-v"])
    print(f"--- Tests finished with exit code {ret_code} in {time.time() - t0:.1f}s ---\n")
    
    print("=" * 70)
    print(f"ALL STEPS COMPLETED SUCCESSFULLY in {time.time() - start_total:.1f}s!")
    print("Artifacts generated:")
    print("  - data/processed/*.parquet")
    print("  - models/model_1_size.joblib + metadata.json")
    print("  - models/model_2_fit.joblib + metadata.json")
    print("  - models/model_3_garment.joblib + metadata.json")
    print("  - reports/data_audit.md")
    print("  - reports/model_1_confusion_matrix.png")
    print("  - reports/model_2_confusion_matrix.png")
    print("  - reports/summary.md")
    print("=" * 70)

if __name__ == '__main__':
    run_all()
