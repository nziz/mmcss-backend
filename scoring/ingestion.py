"""
Data Ingestion Module
Parses CSV/JSON transaction files and extracts
the six behavioral indicators for scoring.
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

import pandas as pd
import json


REQUIRED_COLUMNS = [
    'transaction_date',
    'transaction_type',
    'amount_rwf',
    'counterparty_id',
    'is_savings',
    'is_bill_payment',
]


class DataIngestionError(Exception):
    pass


def extract_indicators(file_path: str,
                        account_age_months: int,
                        observation_months: int = 6) -> dict:
    """
    Parse transaction file (CSV or JSON) and compute
    the six behavioral credit scoring indicators.
    """
    # ── Load file ──────────────────────────────────────
    if file_path.endswith('.json'):
        with open(file_path, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
    else:
        df = pd.read_csv(file_path)

    # ── Validate columns ───────────────────────────────
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise DataIngestionError(f'Missing columns: {missing}')

    # ── Parse dates ────────────────────────────────────
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])

    # ── Filter to observation window ───────────────────
    cutoff = pd.Timestamp.now() - pd.DateOffset(months=observation_months)
    df = df[df['transaction_date'] >= cutoff]

    if df.empty:
        raise DataIngestionError('No transactions found in observation window.')

    # ── Compute indicators ─────────────────────────────
    df['month'] = df['transaction_date'].dt.to_period('M')

    # 1. Transaction Frequency — avg monthly
    txn_frequency = round(df.groupby('month').size().mean(), 1)

    # 2. Average Transaction Value
    avg_txn_value = round(df['amount_rwf'].mean(), 2)

    # 3. Savings Consistency — months with savings
    savings_months = int(df[df['is_savings'] == True]['month'].nunique())

    # 4. Bill Payment Regularity — months with bill payment
    bill_payment_months = int(df[df['is_bill_payment'] == True]['month'].nunique())

    # 5. Network Diversity — distinct counterparties
    network_diversity = int(df['counterparty_id'].nunique())

    # 6. Account Age — provided by loan officer
    if account_age_months < 0:
        raise DataIngestionError('Account age cannot be negative.')

    return {
        'txn_frequency':       float(txn_frequency),
        'avg_txn_value':       float(avg_txn_value),
        'savings_months':      savings_months,
        'bill_payment_months': bill_payment_months,
        'network_diversity':   network_diversity,
        'account_age_months':  int(account_age_months),
    }


def extract_indicators_batch(file_path: str,
                               account_ages: dict,
                               observation_months: int = 6) -> dict:
    """
    For batch/group scoring — file contains multiple applicants.
    Expects a column 'applicant_ref' identifying each person.
    account_ages: dict of {applicant_ref: age_in_months}
    Returns: dict of {applicant_ref: indicators_dict}
    """
    if file_path.endswith('.json'):
        with open(file_path, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
    else:
        df = pd.read_csv(file_path)

    if 'applicant_ref' not in df.columns:
        raise DataIngestionError('Batch file must contain applicant_ref column.')

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise DataIngestionError(f'Missing columns: {missing}')

    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    cutoff = pd.Timestamp.now() - pd.DateOffset(months=observation_months)
    df = df[df['transaction_date'] >= cutoff]

    results = {}
    for ref, group in df.groupby('applicant_ref'):
        group = group.copy()
        group['month'] = group['transaction_date'].dt.to_period('M')
        age = account_ages.get(str(ref), 0)
        results[str(ref)] = {
            'txn_frequency':       round(group.groupby('month').size().mean(), 1),
            'avg_txn_value':       round(group['amount_rwf'].mean(), 2),
            'savings_months':      int(group[group['is_savings'] == True]['month'].nunique()),
            'bill_payment_months': int(group[group['is_bill_payment'] == True]['month'].nunique()),
            'network_diversity':   int(group['counterparty_id'].nunique()),
            'account_age_months':  int(age),
        }
    return results