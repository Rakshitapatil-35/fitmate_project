"""
FITMATE - Model 1: Clothing Size Prediction
Ordinal Size Classification (body measurements + category + fit preference -> size label).
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

from sklearn.model_selection import train_test_split, KFold
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute._base import SimpleImputer
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report
from sklearn.dummy import DummyClassifier

from src.utils import load_parquet, SIZE_ORDER

RANDOM_STATE = 42

def compute_within_one_size_accuracy(y_true, y_pred):
    """Calculate the percentage of predictions within +/- 1 ordinal size rank."""
    return float(np.mean(np.abs(y_true - y_pred) <= 1))

def train_size_model():
    print("=" * 60)
    print("Starting Model 1: Clothing Size Prediction Training")
    print("=" * 60)
    
    data_path = 'data/processed/model_1_size_data.parquet'
    df = load_parquet(data_path)
    print(f"Loaded dataset: {len(df):,} rows from {data_path}")
    
    # Define ordinal label mapping
    # Check sizes present
    unique_sizes = [s for s in SIZE_ORDER if s in df['size_label'].values]
    size_to_idx = {s: i for i, s in enumerate(unique_sizes)}
    idx_to_size = {i: s for i, s in enumerate(unique_sizes)}
    print(f"Ordinal Target Sizes ({len(unique_sizes)} classes): {unique_sizes}")
    
    # Filter only rows with valid unique_sizes
    df = df[df['size_label'].isin(unique_sizes)].copy()
    
    # Features
    num_features = [
        'height_cm', 'weight_kg', 'age', 'bust_cm', 'waist_cm', 'hip_cm',
        'height_cm_was_missing', 'weight_kg_was_missing', 'age_was_missing',
        'bust_cm_was_missing', 'waist_cm_was_missing', 'hip_cm_was_missing'
    ]
    cat_features = ['category', 'fit_preference']
    feature_names = num_features + cat_features
    
    X = df[feature_names]
    y = df['size_label'].map(size_to_idx).values
    
    # Train / Test split (80/20 holdout)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train size: {len(X_train):,}, Holdout Test size: {len(X_test):,}")
    
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
    
    # Models to compare
    candidate_models = {
        'DecisionTree': DecisionTreeClassifier(max_depth=12, min_samples_leaf=10, random_state=RANDOM_STATE),
        'RandomForest': RandomForestClassifier(n_estimators=100, max_depth=14, min_samples_leaf=5, random_state=RANDOM_STATE, n_jobs=-1),
        'XGBoost': XGBClassifier(n_estimators=120, max_depth=6, learning_rate=0.1, random_state=RANDOM_STATE, n_jobs=-1, eval_metric='mlogloss')
    }
    
    # Subsample for fast cross-validation comparison (under 10 mins)
    cv_sample_size = min(40000, len(X_train))
    cv_indices = np.random.RandomState(RANDOM_STATE).choice(len(X_train), cv_sample_size, replace=False)
    X_train_cv = X_train.iloc[cv_indices]
    y_train_cv = y_train[cv_indices]
    
    print(f"\nComparing models via 3-Fold Cross-Validation on representative training slice ({cv_sample_size:,} samples)...")
    kf = KFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)
    cv_results = {}
    
    for name, clf in candidate_models.items():
        pipe = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', clf)
        ])
        
        acc_scores = []
        within_one_scores = []
        f1_scores = []
        
        for fold, (trn_idx, val_idx) in enumerate(kf.split(X_train_cv, y_train_cv)):
            X_tr, y_tr = X_train_cv.iloc[trn_idx], y_train_cv[trn_idx]
            X_va, y_va = X_train_cv.iloc[val_idx], y_train_cv[val_idx]
            
            pipe.fit(X_tr, y_tr)
            preds = pipe.predict(X_va)
            
            acc = accuracy_score(y_va, preds)
            within_one = compute_within_one_size_accuracy(y_va, preds)
            f1 = f1_score(y_va, preds, average='macro')
            
            acc_scores.append(acc)
            within_one_scores.append(within_one)
            f1_scores.append(f1)
            
        mean_acc = np.mean(acc_scores)
        mean_within_one = np.mean(within_one_scores)
        mean_f1 = np.mean(f1_scores)
        
        print(f"  {name:15s} | CV Accuracy: {mean_acc*100:.2f}% | Within-1-Size: {mean_within_one*100:.2f}% | Macro F1: {mean_f1:.4f}")
        cv_results[name] = {
            'cv_accuracy': float(mean_acc),
            'cv_within_one': float(mean_within_one),
            'cv_macro_f1': float(mean_f1)
        }
        
    # Best model selection by Macro F1 and Within-1-Size accuracy
    best_name = max(cv_results, key=lambda k: cv_results[k]['cv_within_one'] + cv_results[k]['cv_macro_f1'])
    print(f"\nBest Model selected: {best_name}")
    
    # Train Best Model on full training set
    print(f"Training best model ({best_name}) on full training set ({len(X_train):,} samples)...")
    best_clf = candidate_models[best_name]
    final_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', best_clf)
    ])
    final_pipeline.fit(X_train, y_train)
    
    # Evaluate Baseline (Majority Class) on test set
    dummy = DummyClassifier(strategy='most_frequent')
    dummy.fit(X_train, y_train)
    baseline_preds = dummy.predict(X_test)
    baseline_acc = accuracy_score(y_test, baseline_preds)
    baseline_within_one = compute_within_one_size_accuracy(y_test, baseline_preds)
    baseline_macro_f1 = f1_score(y_test, baseline_preds, average='macro', zero_division=0)
    
    # Evaluate Final Model on holdout test set (reported once)
    y_test_pred = final_pipeline.predict(X_test)
    test_acc = accuracy_score(y_test, y_test_pred)
    test_within_one = compute_within_one_size_accuracy(y_test, y_test_pred)
    test_macro_f1 = f1_score(y_test, y_test_pred, average='macro')
    
    print("\n" + "=" * 60)
    print("FINAL TEST METRICS (Holdout Set Never Touched During Tuning)")
    print("=" * 60)
    print(f"Baseline (Majority Class):")
    print(f"  Accuracy:          {baseline_acc*100:.2f}%")
    print(f"  Within-1-Size Acc: {baseline_within_one*100:.2f}%")
    print(f"  Macro-F1:          {baseline_macro_f1:.4f}")
    print(f"\nFITMATE Model 1 ({best_name}):")
    print(f"  Accuracy:          {test_acc*100:.2f}%  (Lift: +{(test_acc - baseline_acc)*100:.2f}%)")
    print(f"  Within-1-Size Acc: {test_within_one*100:.2f}%  (Lift: +{(test_within_one - baseline_within_one)*100:.2f}%)")
    print(f"  Macro-F1:          {test_macro_f1:.4f}  (Lift: +{(test_macro_f1 - baseline_macro_f1):.4f})")
    print("\nClassification Report:")
    print(classification_report(y_test, y_test_pred, target_names=unique_sizes))
    
    # Plot and save Confusion Matrix
    cm = confusion_matrix(y_test, y_test_pred)
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm_norm, annot=True, fmt='.2f', cmap='Blues',
                xticklabels=unique_sizes, yticklabels=unique_sizes)
    plt.title(f'Model 1 ({best_name}) Normalized Confusion Matrix\nWithin-1-Size: {test_within_one*100:.1f}%, Acc: {test_acc*100:.1f}%')
    plt.xlabel('Predicted Size')
    plt.ylabel('True Size')
    plt.tight_layout()
    cm_path = 'reports/model_1_confusion_matrix.png'
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"Saved confusion matrix to {cm_path}")
    
    # Save Model Artifact and Metadata
    os.makedirs('models', exist_ok=True)
    model_artifact_path = 'models/model_1_size.joblib'
    joblib.dump(final_pipeline, model_artifact_path)
    print(f"Saved model artifact to {model_artifact_path}")
    
    metadata = {
        'model_name': 'Model 1: Clothing Size Prediction',
        'algorithm': best_name,
        'target': 'size_label',
        'ordinal_classes': unique_sizes,
        'label_mapping': size_to_idx,
        'features': {
            'numeric': num_features,
            'categorical': cat_features,
            'all': feature_names
        },
        'training_dataset': {
            'name': 'data/processed/model_1_size_data.parquet',
            'sources': ['Rent the Runway', 'ModCloth'],
            'total_rows': len(df),
            'train_rows': len(X_train),
            'test_rows': len(X_test)
        },
        'metrics': {
            'baseline_majority_accuracy': round(float(baseline_acc), 4),
            'baseline_within_one_accuracy': round(float(baseline_within_one), 4),
            'baseline_macro_f1': round(float(baseline_macro_f1), 4),
            'test_accuracy': round(float(test_acc), 4),
            'test_within_one_accuracy': round(float(test_within_one), 4),
            'test_macro_f1': round(float(test_macro_f1), 4),
            'cv_comparison': cv_results
        },
        'training_date': datetime.datetime.now().isoformat(),
        'library_versions': {
            'sklearn': pd.__version__, # Note: will store respective versions
            'xgboost': '3.4.1',
            'joblib': '1.6.0'
        }
    }
    
    import sklearn
    metadata['library_versions']['sklearn'] = sklearn.__version__
    import xgboost
    metadata['library_versions']['xgboost'] = xgboost.__version__
    
    metadata_path = 'models/model_1_metadata.json'
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    return final_pipeline, metadata

if __name__ == '__main__':
    train_size_model()
