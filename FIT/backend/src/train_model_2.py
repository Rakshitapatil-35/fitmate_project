"""
FITMATE - Model 2: Fit Recommendation Classifier
Predicts fit class (tight / fit / loose) given body measurements + garment size/category.
Uses GroupShuffleSplit on user_id, handles class imbalance, compares LR, RF, XGB, and calibrates probabilities.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import GroupShuffleSplit, GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute._base import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support, confusion_matrix, classification_report
from sklearn.dummy import DummyClassifier
from sklearn.utils.class_weight import compute_sample_weight

from src.utils import load_parquet, FIT_CLASSES

RANDOM_STATE = 42

def train_fit_model():
    print("=" * 60)
    print("Starting Model 2: Fit Recommendation Training")
    print("=" * 60)
    
    data_path = 'data/processed/model_2_fit_data.parquet'
    df = load_parquet(data_path)
    print(f"Loaded dataset: {len(df):,} rows from {data_path}")
    
    # Target mapping: tight=0, fit=1, loose=2
    fit_to_idx = {c: i for i, c in enumerate(FIT_CLASSES)}
    idx_to_fit = {i: c for i, c in enumerate(FIT_CLASSES)}
    
    # Filter rows with valid fit_class and size_label
    df = df[df['fit_class'].isin(FIT_CLASSES) & df['size_label'].notnull()].copy()
    print(f"Target class distribution:\n{df['fit_class'].value_counts(normalize=True).round(4).to_dict()}")
    
    # Feature definition
    num_features = [
        'height_cm', 'weight_kg', 'age', 'bust_cm', 'waist_cm', 'hip_cm',
        'height_cm_was_missing', 'weight_kg_was_missing', 'age_was_missing',
        'bust_cm_was_missing', 'waist_cm_was_missing', 'hip_cm_was_missing'
    ]
    cat_features = ['category', 'size_label']
    feature_names = num_features + cat_features
    
    X = df[feature_names]
    y = df['fit_class'].map(fit_to_idx).values
    groups = df['user_id'].values
    
    print(f"Total unique users for GroupShuffleSplit: {len(np.unique(groups)):,}")
    
    # GroupShuffleSplit (80% train, 20% holdout test by user_id)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=RANDOM_STATE)
    train_idx, test_idx = next(gss.split(X, y, groups))
    
    X_train, y_train, groups_train = X.iloc[train_idx], y[train_idx], groups[train_idx]
    X_test, y_test, groups_test = X.iloc[test_idx], y[test_idx], groups[test_idx]
    
    # Verify zero user overlap between train and test
    train_users = set(groups_train)
    test_users = set(groups_test)
    assert len(train_users.intersection(test_users)) == 0, "DATA LEAKAGE: user overlap detected!"
    print(f"Train set: {len(X_train):,} rows ({len(train_users):,} users)")
    print(f"Holdout Test set: {len(X_test):,} rows ({len(test_users):,} users) - Zero user leakage verified.")
    
    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ]), num_features),
            ('cat', Pipeline([
                ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
                ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ]), cat_features)
        ]
    )
    
    # Preprocess training and test data
    print("Fitting preprocessor on training data only...")
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)
    
    # Sample weights for XGBoost inside training folds
    train_sample_weights = compute_sample_weight('balanced', y_train)
    
    # Candidate models with balanced class weights
    candidate_models = {
        'LogisticRegression': LogisticRegression(
            class_weight='balanced', max_iter=400, random_state=RANDOM_STATE
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=100, max_depth=12, class_weight='balanced',
            min_samples_leaf=5, random_state=RANDOM_STATE, n_jobs=-1
        ),
        'XGBoost': XGBClassifier(
            n_estimators=120, max_depth=5, learning_rate=0.1,
            random_state=RANDOM_STATE, n_jobs=-1, eval_metric='mlogloss'
        )
    }
    
    # Fast 3-Fold GroupKFold CV on training slice
    cv_sample_size = min(40000, len(X_train))
    cv_sub_indices = np.random.RandomState(RANDOM_STATE).choice(len(X_train), cv_sample_size, replace=False)
    X_tr_cv = X_train_proc[cv_sub_indices]
    y_tr_cv = y_train[cv_sub_indices]
    groups_tr_cv = groups_train[cv_sub_indices]
    
    print(f"\nComparing models via 3-Fold GroupKFold CV on representative training slice ({cv_sample_size:,} samples)...")
    gkf = GroupKFold(n_splits=3)
    cv_results = {}
    
    for name, clf in candidate_models.items():
        f1_scores = []
        acc_scores = []
        
        for tr_i, val_i in gkf.split(X_tr_cv, y_tr_cv, groups_tr_cv):
            X_fold_tr, y_fold_tr = X_tr_cv[tr_i], y_tr_cv[tr_i]
            X_fold_val, y_fold_val = X_tr_cv[val_i], y_tr_cv[val_i]
            
            if name == 'XGBoost':
                w_tr = compute_sample_weight('balanced', y_fold_tr)
                clf.fit(X_fold_tr, y_fold_tr, sample_weight=w_tr)
            else:
                clf.fit(X_fold_tr, y_fold_tr)
                
            p_val = clf.predict(X_fold_val)
            acc_scores.append(accuracy_score(y_fold_val, p_val))
            f1_scores.append(f1_score(y_fold_val, p_val, average='macro'))
            
        mean_acc = np.mean(acc_scores)
        mean_f1 = np.mean(f1_scores)
        print(f"  {name:20s} | CV Accuracy: {mean_acc*100:.2f}% | Macro F1: {mean_f1:.4f}")
        cv_results[name] = {
            'cv_accuracy': float(mean_acc),
            'cv_macro_f1': float(mean_f1)
        }
        
    best_name = max(cv_results, key=lambda k: cv_results[k]['cv_macro_f1'])
    print(f"\nBest Model selected: {best_name}")
    
    # Train best model on full training set
    print(f"Training best model ({best_name}) on full training data ({len(X_train):,} samples)...")
    base_model = candidate_models[best_name]
    if best_name == 'XGBoost':
        base_model.fit(X_train_proc, y_train, sample_weight=train_sample_weights)
    else:
        base_model.fit(X_train_proc, y_train)
        
    # Uncalibrated Balanced Model Evaluation
    y_test_pred_base = base_model.predict(X_test_proc)
    test_acc_base = accuracy_score(y_test, y_test_pred_base)
    test_macro_f1_base = f1_score(y_test, y_test_pred_base, average='macro', zero_division=0)
    prec_b, rec_b, f1_b, supp_b = precision_recall_fscore_support(y_test, y_test_pred_base, labels=[0, 1, 2], zero_division=0)

    # Probability Calibration
    print("Calibrating probabilities via CalibratedClassifierCV (cv=3)...")
    calibrated_model = CalibratedClassifierCV(estimator=base_model, cv=3)
    calibrated_model.fit(X_train_proc, y_train)
    
    # Evaluate Baseline (Majority Class) on holdout test set
    dummy = DummyClassifier(strategy='most_frequent')
    dummy.fit(X_train_proc, y_train)
    baseline_preds = dummy.predict(X_test_proc)
    baseline_acc = accuracy_score(y_test, baseline_preds)
    baseline_macro_f1 = f1_score(y_test, baseline_preds, average='macro', zero_division=0)
    
    # Evaluate Calibrated Best Model on holdout test set
    y_test_pred_cal = calibrated_model.predict(X_test_proc)
    y_test_proba = calibrated_model.predict_proba(X_test_proc)
    
    test_acc_cal = accuracy_score(y_test, y_test_pred_cal)
    test_macro_f1_cal = f1_score(y_test, y_test_pred_cal, average='macro', zero_division=0)
    prec_c, rec_c, f1_c, supp_c = precision_recall_fscore_support(y_test, y_test_pred_cal, labels=[0, 1, 2], zero_division=0)
    
    print("\n" + "=" * 60)
    print("FINAL TEST METRICS (Holdout Set Never Touched During Tuning)")
    print("=" * 60)
    print(f"Baseline (Majority Class):")
    print(f"  Accuracy:  {baseline_acc*100:.2f}%")
    print(f"  Macro-F1:  {baseline_macro_f1:.4f}")
    
    print(f"\nFITMATE Model 2 - Balanced Cost-Sensitive Base ({best_name}):")
    print(f"  Accuracy:  {test_acc_base*100:.2f}%")
    print(f"  Macro-F1:  {test_macro_f1_base:.4f}  (Lift over baseline: +{test_macro_f1_base - baseline_macro_f1:.4f})")
    print("  Per-Class Breakdown (Balanced Base):")
    for i, c in enumerate(FIT_CLASSES):
        print(f"    Class '{c:5s}': Precision={prec_b[i]:.4f}, Recall={rec_b[i]:.4f}, F1={f1_b[i]:.4f}, Support={supp_b[i]:,}")
        
    print(f"\nFITMATE Model 2 - Calibrated Posterior Model (Platt Scaling):")
    print(f"  Accuracy:  {test_acc_cal*100:.2f}%")
    print(f"  Macro-F1:  {test_macro_f1_cal:.4f}")
    print("  Per-Class Breakdown (Calibrated):")
    for i, c in enumerate(FIT_CLASSES):
        print(f"    Class '{c:5s}': Precision={prec_c[i]:.4f}, Recall={rec_c[i]:.4f}, F1={f1_c[i]:.4f}, Support={supp_c[i]:,}")
    print("  Note: Probability calibration maps scores to true base rates (~72% fit), whereas the balanced base model balances recall across tight/fit/loose.")
    
    # Confusion Matrix (Plotting the balanced base model which detects minority classes)
    cm = confusion_matrix(y_test, y_test_pred_base)
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm_norm, annot=True, fmt='.2f', cmap='Greens',
                xticklabels=FIT_CLASSES, yticklabels=FIT_CLASSES)
    plt.title(f'Model 2 ({best_name} Balanced) Confusion Matrix\nAccuracy: {test_acc_base*100:.1f}%, Macro-F1: {test_macro_f1_base:.4f}')
    plt.xlabel('Predicted Fit')
    plt.ylabel('True Fit')
    plt.tight_layout()
    cm_path = 'reports/model_2_confusion_matrix.png'
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"Saved confusion matrix to {cm_path}")
    
    # Package Full Inference Pipeline
    full_pipeline = {
        'preprocessor': preprocessor,
        'base_model': base_model,
        'calibrated_model': calibrated_model,
        'classes': FIT_CLASSES,
        'fit_to_idx': fit_to_idx,
        'idx_to_fit': idx_to_fit
    }
    
    # Save Model Artifact and Metadata
    os.makedirs('models', exist_ok=True)
    model_artifact_path = 'models/model_2_fit.joblib'
    joblib.dump(full_pipeline, model_artifact_path)
    print(f"Saved model artifact to {model_artifact_path}")
    
    metadata = {
        'model_name': 'Model 2: Fit Recommendation Classifier',
        'algorithm': best_name,
        'calibrated': True,
        'target': 'fit_class',
        'target_classes': FIT_CLASSES,
        'label_mapping': fit_to_idx,
        'features': {
            'numeric': num_features,
            'categorical': cat_features,
            'all': feature_names
        },
        'splitting_strategy': 'GroupShuffleSplit on user_id (Zero user leakage)',
        'imbalance_handling': 'Balanced class/sample weights inside training folds only',
        'training_dataset': {
            'name': 'data/processed/model_2_fit_data.parquet',
            'sources': ['Rent the Runway', 'ModCloth'],
            'total_rows': len(df),
            'train_rows': len(X_train),
            'test_rows': len(X_test),
            'unique_users_train': len(train_users),
            'unique_users_test': len(test_users)
        },
        'metrics': {
            'baseline_majority_accuracy': round(float(baseline_acc), 4),
            'baseline_macro_f1': round(float(baseline_macro_f1), 4),
            'balanced_model': {
                'accuracy': round(float(test_acc_base), 4),
                'macro_f1': round(float(test_macro_f1_base), 4),
                'per_class': {
                    c: {
                        'precision': round(float(prec_b[i]), 4),
                        'recall': round(float(rec_b[i]), 4),
                        'f1': round(float(f1_b[i]), 4),
                        'support': int(supp_b[i])
                    } for i, c in enumerate(FIT_CLASSES)
                }
            },
            'calibrated_model': {
                'accuracy': round(float(test_acc_cal), 4),
                'macro_f1': round(float(test_macro_f1_cal), 4),
                'per_class': {
                    c: {
                        'precision': round(float(prec_c[i]), 4),
                        'recall': round(float(rec_c[i]), 4),
                        'f1': round(float(f1_c[i]), 4),
                        'support': int(supp_c[i])
                    } for i, c in enumerate(FIT_CLASSES)
                }
            },
            'cv_comparison': cv_results
        },
        'training_date': datetime.datetime.now().isoformat(),
        'library_versions': {
            'sklearn': pd.__version__,
            'xgboost': '3.4.1',
            'joblib': '1.6.0'
        }
    }

    
    import sklearn
    metadata['library_versions']['sklearn'] = sklearn.__version__
    import xgboost
    metadata['library_versions']['xgboost'] = xgboost.__version__
    
    metadata_path = 'models/model_2_metadata.json'
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    return full_pipeline, metadata

if __name__ == '__main__':
    train_fit_model()
