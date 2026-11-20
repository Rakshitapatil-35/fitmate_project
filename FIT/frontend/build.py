#!/usr/bin/env python3
"""Bundle individual frontend ES modules into a single zero-dependency standalone bundle.js."""

import re
from pathlib import Path

BASE = Path(__file__).resolve().parent

FILES = [
    'config/images.js',
    'services/api.js',
    'state/store.js',
    'components/motion.js',
    'routes/router.js',
    'components/LoadingState.js',
    'components/Toast.js',
    'components/BottomTabBar.js',
    'components/TopNav.js',
    'pages/LandingPage.js',
    'pages/AuthPage.js',
    'pages/OnboardingPage.js',
    'pages/DashboardPage.js',
    'pages/MeasurementsPage.js',
    'pages/BrandProductPickerPage.js',
    'pages/ResultPage.js',
    'pages/ComparisonTablePage.js',
    'pages/HistoryProfilesPage.js',
    'app.js',
]

def build():
    chunks = [
        "/**\n * ============================================================================\n"
        " * FITMATE STANDALONE ALL-IN-ONE BUNDLE\n"
        " * Bundled for instant zero-dependency execution across any local server or file protocol.\n"
        " * ============================================================================\n */\n"
        "(function() {\n  'use strict';\n"
    ]

    for rel in FILES:
        content = (BASE / rel).read_text(encoding='utf-8')
        content = re.sub(r'^\s*import\s+[\s\S]*?from\s+[\'\"].*?[\'\"];?\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*export\s+default\s+', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*export\s+(async\s+function|function|const|let|var|class)\s+', r'\1 ', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*export\s*\{[\s\S]*?\}\s*;?\s*$', '', content, flags=re.MULTILINE)
        chunks.append(f'\n// --- Source: {Path(rel).name} ---\n' + content)

    chunks.append('\n\n})();\n')
    bundle_path = BASE / 'bundle.js'
    bundle_path.write_text('\n'.join(chunks), encoding='utf-8')
    print(f"Bundle written to {bundle_path} ({bundle_path.stat().st_size} bytes)")

if __name__ == '__main__':
    build()
