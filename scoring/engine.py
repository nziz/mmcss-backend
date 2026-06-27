"""
Credit Scoring Engine
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from dataclasses import dataclass
from .models import ScoringRule


@dataclass
class ScoreResult:
    txn_frequency_score: int
    avg_txn_value_score: int
    savings_score: int
    bill_payment_score: int
    network_diversity_score: int
    account_age_score: int
    csi_total: int
    risk_tier: str
    recommendation: str


class CreditScoringEngine:
    """
    Loads rules from database and applies them to
    mobile money behavioral indicators to compute
    a Credit Score Index (CSI) from 0 to 100.
    """

    def __init__(self):
        self.rules = self._load_rules()

    def _load_rules(self):
        """Load active scoring rules from database."""
        rules = {}
        for rule in ScoringRule.objects.filter(is_active=True):
            if rule.indicator not in rules:
                rules[rule.indicator] = []
            rules[rule.indicator].append({
                'min': float(rule.min_value) if rule.min_value is not None else None,
                'max': float(rule.max_value) if rule.max_value is not None else None,
                'points': rule.points_awarded,
            })
        return rules

    def _apply_rule(self, indicator: str, value: float) -> int:
        """
        Apply scoring rule for a given indicator.
        Returns points awarded based on value range.
        """
        if value < 0:
            raise ValueError(f'{indicator} cannot be negative.')
        for rule in self.rules.get(indicator, []):
            min_val = rule['min']
            max_val = rule['max']
            if max_val is None:
                if value >= min_val:
                    return rule['points']
            else:
                if min_val <= value <= max_val:
                    return rule['points']
        return 0

    def _classify(self, csi: int):
        """
        Classify CSI into 5-tier risk system.
        Returns (risk_tier, recommendation)
        """
        if csi >= 85:
            return ('excellent', 'approve')
        elif csi >= 70:
            return ('good', 'approve_standard')
        elif csi >= 50:
            return ('fair', 'review')
        elif csi >= 30:
            return ('poor', 'conditional_decline')
        else:
            return ('very_poor', 'decline')

    def compute_score(self, indicators: dict) -> ScoreResult:
        """
        Main method — computes full credit score
        from a dictionary of behavioral indicators.

        Expected indicators:
        {
            'txn_frequency': float,       # avg monthly transactions
            'avg_txn_value': float,       # avg transaction value RWF
            'savings_months': int,        # months with savings (0-6)
            'bill_payment_months': int,   # months with bill payment (0-6)
            'network_diversity': int,     # distinct counterparties
            'account_age_months': int,    # account age in months
        }
        """
        txn_score  = self._apply_rule('txn_frequency',       indicators['txn_frequency'])
        val_score  = self._apply_rule('avg_txn_value',       indicators['avg_txn_value'])
        sav_score  = self._apply_rule('savings_months',      indicators['savings_months'])
        bill_score = self._apply_rule('bill_payment_months', indicators['bill_payment_months'])
        net_score  = self._apply_rule('network_diversity',   indicators['network_diversity'])
        age_score  = self._apply_rule('account_age_months',  indicators['account_age_months'])

        csi = txn_score + val_score + sav_score + bill_score + net_score + age_score
        csi = max(0, min(100, csi))  # Enforce 0-100 bounds

        risk_tier, recommendation = self._classify(csi)

        return ScoreResult(
            txn_frequency_score=txn_score,
            avg_txn_value_score=val_score,
            savings_score=sav_score,
            bill_payment_score=bill_score,
            network_diversity_score=net_score,
            account_age_score=age_score,
            csi_total=csi,
            risk_tier=risk_tier,
            recommendation=recommendation,
        )