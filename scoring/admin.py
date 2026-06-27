from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Institution, Applicant,
    ScoringRule, ScoreRecord,
    BatchSession, OTPVerification
)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'full_name', 'role', 'institution', 'is_active']
    list_filter = ['role', 'institution', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering = ['username']

    fieldsets = UserAdmin.fieldsets + (
        ('Role & Institution', {
            'fields': ('role', 'institution', 'phone_number')
        }),
    )

    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Full Name'


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ['name', 'institution_type', 'district', 'bnr_license_number', 'is_active']
    list_filter = ['institution_type', 'district', 'is_active']
    search_fields = ['name', 'district', 'bnr_license_number']
    ordering = ['name']


@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'applicant_ref', 'phone_number', 'gender', 'district', 'mobile_operator', 'institution']
    list_filter = ['gender', 'mobile_operator', 'district', 'institution']
    search_fields = ['full_name', 'applicant_ref', 'phone_number', 'national_id']
    ordering = ['-created_at']


@admin.register(ScoringRule)
class ScoringRuleAdmin(admin.ModelAdmin):
    list_display = ['indicator', 'condition_label', 'min_value', 'max_value', 'points_awarded', 'max_points', 'is_active']
    list_filter = ['indicator', 'is_active']
    search_fields = ['indicator', 'condition_label']
    ordering = ['indicator', '-points_awarded']


@admin.register(ScoreRecord)
class ScoreRecordAdmin(admin.ModelAdmin):
    list_display = ['applicant', 'csi_total', 'risk_tier', 'recommendation', 'scoring_mode', 'scored_by', 'scored_at']
    list_filter = ['risk_tier', 'recommendation', 'scoring_mode', 'scored_at']
    search_fields = ['applicant__full_name', 'applicant__applicant_ref']
    ordering = ['-scored_at']
    readonly_fields = ['scored_at']


@admin.register(BatchSession)
class BatchSessionAdmin(admin.ModelAdmin):
    list_display = ['session_ref', 'institution', 'total_applicants', 'processed_count', 'failed_count', 'status', 'created_at']
    list_filter = ['status', 'institution']
    search_fields = ['session_ref']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'completed_at']
    from .models import OTPVerification

@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'otp_code', 'status', 'attempts', 'created_at', 'expires_at']
    list_filter = ['status']
    search_fields = ['user__username', 'user__email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'verified_at']
