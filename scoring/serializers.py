"""
Serializers
Converts Django model instances to JSON for the API.
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from rest_framework import serializers
from .models import (
    User, Institution, Applicant,
    ScoreRecord, BatchSession, ScoringRule
)


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name', 'institution_type', 'district', 'bnr_license_number']


class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source='institution.name', read_only=True
    )
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name',
                  'email', 'role', 'institution', 'institution_name', 'phone_number']


class ApplicantSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source='institution.name', read_only=True
    )
    class Meta:
        model = Applicant
        fields = ['id', 'applicant_ref', 'full_name', 'phone_number',
                  'gender', 'district', 'mobile_operator',
                  'institution', 'institution_name', 'created_at']


class ScoreRecordSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(
        source='applicant.full_name', read_only=True
    )
    applicant_ref = serializers.CharField(
        source='applicant.applicant_ref', read_only=True
    )
    scored_by_name = serializers.CharField(
        source='scored_by.get_full_name', read_only=True
    )
    risk_tier_display = serializers.CharField(
        source='get_risk_tier_display', read_only=True
    )
    recommendation_display = serializers.CharField(
        source='get_recommendation_display', read_only=True
    )

    class Meta:
        model = ScoreRecord
        fields = [
            'id',
            'applicant', 'applicant_name', 'applicant_ref',
            'scored_by', 'scored_by_name',
            'txn_frequency_score', 'avg_txn_value_score',
            'savings_score', 'bill_payment_score',
            'network_diversity_score', 'account_age_score',
            'csi_total', 'risk_tier', 'risk_tier_display',
            'recommendation', 'recommendation_display',
            'scoring_mode', 'observation_months',
            'scored_at', 'notes', 'batch',
        ]


class BatchSessionSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(
        source='institution.name', read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )
    class Meta:
        model = BatchSession
        fields = [
            'id', 'session_ref', 'institution', 'institution_name',
            'created_by', 'created_by_name',
            'total_applicants', 'processed_count', 'failed_count',
            'status', 'created_at', 'completed_at', 'notes',
        ]


class ScoringRuleSerializer(serializers.ModelSerializer):
    indicator_display = serializers.CharField(
        source='get_indicator_display', read_only=True
    )
    class Meta:
        model = ScoringRule
        fields = [
            'id', 'indicator', 'indicator_display',
            'condition_label', 'min_value', 'max_value',
            'points_awarded', 'max_points', 'is_active', 'updated_at',
        ]