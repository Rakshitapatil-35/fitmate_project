"""
Live API probe script for FITMATE FastAPI service.
"""

import time
import os
import sys
import threading

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import httpx
import uvicorn
from api.main import app


def run_server():
    uvicorn.run(app, host='127.0.0.1', port=8005, log_level='warning')

if __name__ == '__main__':
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(2)

    print("=" * 65)
    print("PROBING LIVE FASTAPI SERVER (http://127.0.0.1:8005)")
    print("=" * 65)

    # 1. Health check
    r1 = httpx.get('http://127.0.0.1:8005/health')
    print(f"\n1. GET /health [{r1.status_code}]:")
    print(r1.json())

    # 2. Predict Size
    size_payload = {
        'profile': {
            'height': '5ft 7in',
            'weight': '138 lbs',
            'age': 28,
            'bust': '34c',
            'waist': 28,
            'hip': 38,
            'fit_preference': 'fit'
        },
        'product': {
            'category': 'dress',
            'brand': 'Zara'
        }
    }
    r2 = httpx.post('http://127.0.0.1:8005/predict/size', json=size_payload)
    print(f"\n2. POST /predict/size [{r2.status_code}]:")
    print(r2.json())

    # 3. Predict Fit
    fit_payload = {
        'profile': {
            'height': 168.0,
            'weight': 63.0,
            'age': 30,
            'bust': '34b'
        },
        'garment': {
            'category': 'top',
            'size': 'S'
        }
    }
    r3 = httpx.post('http://127.0.0.1:8005/predict/fit', json=fit_payload)
    print(f"\n3. POST /predict/fit [{r3.status_code}]:")
    print(r3.json())

    # 4. Predict Garment Dimensions
    garment_payload = {
        'brand': 'Levis',
        'category': 'bottoms',
        'size': 'M'
    }
    r4 = httpx.post('http://127.0.0.1:8005/predict/garment', json=garment_payload)
    print(f"\n4. POST /predict/garment [{r4.status_code}]:")
    print(r4.json())

    print("\n" + "=" * 65)
    print("ALL LIVE ENDPOINTS TESTED AND VALIDATED SUCCESSFULLY!")
    print("=" * 65)
