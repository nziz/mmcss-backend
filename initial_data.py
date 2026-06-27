"""
Initial Scoring Rules Data
Run this once to populate the scoring rules in the database.
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mmcss_backend.settings')
django.setup()

from scoring.models import ScoringRule

rules = [
    # ── TRANSACTION FREQUENCY (max 25 points) ──────────────────────────
    {'indicator': 'txn_frequency', 'condition_label': '>= 20 transactions/month', 'min_value': 20, 'max_value': None, 'points_awarded': 25, 'max_points': 25},
    {'indicator': 'txn_frequency', 'condition_label': '10–19 transactions/month', 'min_value': 10, 'max_value': 19, 'points_awarded': 15, 'max_points': 25},
    {'indicator': 'txn_frequency', 'condition_label': '5–9 transactions/month',   'min_value': 5,  'max_value': 9,  'points_awarded': 8,  'max_points': 25},
    {'indicator': 'txn_frequency', 'condition_label': '< 5 transactions/month',   'min_value': 0,  'max_value': 4,  'points_awarded': 0,  'max_points': 25},

    # ── AVERAGE TRANSACTION VALUE (max 20 points) ───────────────────────
    {'indicator': 'avg_txn_value', 'condition_label': '>= 50,000 RWF average',    'min_value': 50000, 'max_value': None,  'points_awarded': 20, 'max_points': 20},
    {'indicator': 'avg_txn_value', 'condition_label': '20,000–49,999 RWF',        'min_value': 20000, 'max_value': 49999, 'points_awarded': 12, 'max_points': 20},
    {'indicator': 'avg_txn_value', 'condition_label': '5,000–19,999 RWF',         'min_value': 5000,  'max_value': 19999, 'points_awarded': 6,  'max_points': 20},
    {'indicator': 'avg_txn_value', 'condition_label': '< 5,000 RWF',              'min_value': 0,     'max_value': 4999,  'points_awarded': 0,  'max_points': 20},

    # ── SAVINGS CONSISTENCY (max 20 points) ────────────────────────────
    {'indicator': 'savings_months', 'condition_label': 'Saves every month (6/6)',  'min_value': 6, 'max_value': None, 'points_awarded': 20, 'max_points': 20},
    {'indicator': 'savings_months', 'condition_label': 'Saves 3–5 of 6 months',   'min_value': 3, 'max_value': 5,    'points_awarded': 12, 'max_points': 20},
    {'indicator': 'savings_months', 'condition_label': 'Saves 1–2 of 6 months',   'min_value': 1, 'max_value': 2,    'points_awarded': 5,  'max_points': 20},
    {'indicator': 'savings_months', 'condition_label': 'No savings deposits',      'min_value': 0, 'max_value': 0,    'points_awarded': 0,  'max_points': 20},

    # ── BILL PAYMENT REGULARITY (max 15 points) ─────────────────────────
    {'indicator': 'bill_payment_months', 'condition_label': 'Pays bills every month (6/6)', 'min_value': 6, 'max_value': None, 'points_awarded': 15, 'max_points': 15},
    {'indicator': 'bill_payment_months', 'condition_label': 'Pays bills 3–5 of 6 months',  'min_value': 3, 'max_value': 5,    'points_awarded': 9,  'max_points': 15},
    {'indicator': 'bill_payment_months', 'condition_label': 'Pays bills 1–2 of 6 months',  'min_value': 1, 'max_value': 2,    'points_awarded': 4,  'max_points': 15},
    {'indicator': 'bill_payment_months', 'condition_label': 'No bill payments',             'min_value': 0, 'max_value': 0,    'points_awarded': 0,  'max_points': 15},

    # ── NETWORK DIVERSITY (max 10 points) ───────────────────────────────
    {'indicator': 'network_diversity', 'condition_label': '>= 10 distinct counterparties', 'min_value': 10, 'max_value': None, 'points_awarded': 10, 'max_points': 10},
    {'indicator': 'network_diversity', 'condition_label': '5–9 distinct counterparties',   'min_value': 5,  'max_value': 9,    'points_awarded': 6,  'max_points': 10},
    {'indicator': 'network_diversity', 'condition_label': '2–4 distinct counterparties',   'min_value': 2,  'max_value': 4,    'points_awarded': 3,  'max_points': 10},
    {'indicator': 'network_diversity', 'condition_label': '< 2 counterparties',            'min_value': 0,  'max_value': 1,    'points_awarded': 0,  'max_points': 10},

    # ── ACCOUNT AGE (max 10 points) ─────────────────────────────────────
    {'indicator': 'account_age_months', 'condition_label': '>= 24 months active', 'min_value': 24, 'max_value': None, 'points_awarded': 10, 'max_points': 10},
    {'indicator': 'account_age_months', 'condition_label': '12–23 months active', 'min_value': 12, 'max_value': 23,   'points_awarded': 6,  'max_points': 10},
    {'indicator': 'account_age_months', 'condition_label': '6–11 months active',  'min_value': 6,  'max_value': 11,   'points_awarded': 3,  'max_points': 10},
    {'indicator': 'account_age_months', 'condition_label': '< 6 months active',   'min_value': 0,  'max_value': 5,    'points_awarded': 0,  'max_points': 10},
]

def load_rules():
    # Clear existing rules first
    ScoringRule.objects.all().delete()
    count = 0
    for rule in rules:
        ScoringRule.objects.create(**rule)
        count += 1
    print(f"Successfully loaded {count} scoring rules into the database!")

if __name__ == '__main__':
    load_rules()