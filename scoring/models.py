from django.db import models
from django.contrib.auth.models import AbstractUser


# ─── USER MODEL ───────────────────────────────────────────────────────────────
class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Adds role-based access control for the four system roles.
    """
    ROLE_CHOICES = [
    ('admin', 'Administrator'),
    ('loan_officer', 'Loan Officer'),
    ('auditor', 'Auditor/Viewer'),
    ('branch_manager', 'Branch Manager'),
    ('applicant', 'Loan Applicant'),
    ('applicant', 'Applicant'),
]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='loan_officer'
    )
    institution = models.ForeignKey(
        'Institution',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_first_login = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_loan_officer(self):
        return self.role == 'loan_officer'

    @property
    def is_auditor(self):
        return self.role == 'auditor'

    @property
    def is_branch_manager(self):
        return self.role == 'branch_manager'


# ─── INSTITUTION MODEL ────────────────────────────────────────────────────────
class Institution(models.Model):
    """
    Represents an MFI or SACCO institution using the system.
    """
    INSTITUTION_TYPES = [
        ('mfi', 'Microfinance Institution'),
        ('sacco', 'SACCO'),
        ('bank', 'Commercial Bank'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    institution_type = models.CharField(
        max_length=10,
        choices=INSTITUTION_TYPES,
        default='sacco'
    )
    district = models.CharField(max_length=100)
    bnr_license_number = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_institution_type_display()})"


# ─── APPLICANT MODEL ──────────────────────────────────────────────────────────
class Applicant(models.Model):
    """
    Represents a loan applicant whose mobile money data is being scored.
    """
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    MOBILE_OPERATOR_CHOICES = [
        ('mtn', 'MTN Mobile Money'),
        ('airtel', 'Airtel Money'),
        ('both', 'Both MTN and Airtel'),
    ]

    applicant_ref = models.CharField(
        max_length=50,
        unique=True,
        db_index=True  # Smart indexing for fast search
    )
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=20)
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        null=True
    )
    district = models.CharField(max_length=100, blank=True, null=True)
    mobile_operator = models.CharField(
        max_length=10,
        choices=MOBILE_OPERATOR_CHOICES,
        default='mtn'
    )
    national_id = models.CharField(max_length=50, blank=True, null=True)
    institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        null=True,
        related_name='applicants'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='applicants_created'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.applicant_ref})"


# ─── SCORING RULE MODEL ───────────────────────────────────────────────────────
class ScoringRule(models.Model):
    """
    Configurable scoring rules stored in database.
    Admin can update rules without touching code.
    """
    INDICATOR_CHOICES = [
        ('txn_frequency', 'Transaction Frequency'),
        ('avg_txn_value', 'Average Transaction Value'),
        ('savings_months', 'Savings Consistency'),
        ('bill_payment_months', 'Bill Payment Regularity'),
        ('network_diversity', 'Network Diversity'),
        ('account_age_months', 'Account Age'),
    ]

    indicator = models.CharField(max_length=30, choices=INDICATOR_CHOICES)
    condition_label = models.CharField(max_length=200)
    min_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    points_awarded = models.IntegerField()
    max_points = models.IntegerField()
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rules_updated'
    )

    class Meta:
        ordering = ['indicator', '-points_awarded']

    def __str__(self):
        return f"{self.get_indicator_display()} — {self.condition_label} ({self.points_awarded}pts)"


# ─── SCORE RECORD MODEL ───────────────────────────────────────────────────────
class ScoreRecord(models.Model):
    """
    Stores the credit score result for each applicant scoring session.
    Supports both individual and batch scoring.
    """
    RISK_TIER_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('very_poor', 'Very Poor'),
    ]

    RECOMMENDATION_CHOICES = [
        ('approve', 'Approve'),
        ('approve_standard', 'Approve — Standard Terms'),
        ('review', 'Review'),
        ('conditional_decline', 'Conditional Decline'),
        ('decline', 'Decline'),
    ]

    SCORING_MODE_CHOICES = [
        ('individual', 'Individual'),
        ('batch', 'Batch/Group'),
    ]

    # Links
    applicant = models.ForeignKey(
        Applicant,
        on_delete=models.CASCADE,
        related_name='score_records'
    )
    scored_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='scores_produced'
    )
    batch = models.ForeignKey(
        'BatchSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='score_records'
    )

    # Sub-scores (one per indicator)
    txn_frequency_score = models.IntegerField(default=0)
    avg_txn_value_score = models.IntegerField(default=0)
    savings_score = models.IntegerField(default=0)
    bill_payment_score = models.IntegerField(default=0)
    network_diversity_score = models.IntegerField(default=0)
    account_age_score = models.IntegerField(default=0)

    # Final result
    csi_total = models.IntegerField(default=0)
    risk_tier = models.CharField(
        max_length=20,
        choices=RISK_TIER_CHOICES,
        db_index=True  # Smart indexing — filtered frequently
    )
    recommendation = models.CharField(
        max_length=25,
        choices=RECOMMENDATION_CHOICES
    )

    # Metadata
    scoring_mode = models.CharField(
        max_length=15,
        choices=SCORING_MODE_CHOICES,
        default='individual'
    )
    observation_months = models.IntegerField(default=6)
    scored_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True  # Smart indexing — sorted by date
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-scored_at']

    def __str__(self):
        return f"{self.applicant.full_name} — CSI: {self.csi_total} ({self.risk_tier})"


# ─── BATCH SESSION MODEL ──────────────────────────────────────────────────────
class BatchSession(models.Model):
    """
    Represents a group/batch scoring session.
    Links multiple ScoreRecords scored together.
    """
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    session_ref = models.CharField(max_length=50, unique=True)
    institution = models.ForeignKey(
        Institution,
        on_delete=models.SET_NULL,
        null=True,
        related_name='batch_sessions'
    )
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='batch_sessions'
    )
    total_applicants = models.IntegerField(default=0)
    processed_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='processing'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Batch {self.session_ref} — {self.total_applicants} applicants ({self.status})"
        # ─── OTP MODEL ────────────────────────────────────────────────────────────────
import pyotp
import random
from django.utils import timezone
from datetime import timedelta


class OTPVerification(models.Model):
    """
    Stores OTP codes for first-time login verification.
    OTP expires after 10 minutes.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('expired', 'Expired'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='otp_verifications'
    )
    otp_code = models.CharField(max_length=6)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-set expiry to 10 minutes from creation
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    def is_valid(self):
        """Check if OTP is still valid."""
        return (
            self.status == 'pending' and
            timezone.now() < self.expires_at and
            self.attempts < 3  # Max 3 attempts
        )

    def generate_otp(self):
        """Generate a secure 6-digit OTP."""
        self.otp_code = str(random.randint(100000, 999999))
        return self.otp_code

    def __str__(self):
        return f"OTP for {self.user.username} — {self.status}"