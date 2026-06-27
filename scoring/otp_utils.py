"""
OTP Utility Functions
Handles OTP generation, sending, and verification.
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import OTPVerification


def generate_and_send_otp(user):
    """
    Generates a 6-digit OTP, saves it to database,
    and sends it to the user's email.
    Returns the OTP object.
    """
    # Expire any existing pending OTPs for this user
    OTPVerification.objects.filter(
        user=user,
        status='pending'
    ).update(status='expired')

    # Create new OTP
    otp_obj = OTPVerification(user=user)
    otp_code = otp_obj.generate_otp()
    otp_obj.save()

    # Send email
    subject = 'MMCSS — Your Verification Code'
    message = f"""
Dear {user.get_full_name()},

Your verification code for the Mobile Money Credit Scoring System is:

    {otp_code}

This code expires in 10 minutes.
Do not share this code with anyone.

If you did not request this code, please contact your system administrator immediately.

University of Kigali — MMCSS System
    """

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return otp_obj, True
    except Exception as e:
        # If email fails, still return OTP object
        # In production, log this error
        print(f"Email sending failed: {e}")
        return otp_obj, False


def verify_otp(user, entered_code):
    """
    Verifies the OTP entered by the user.
    Returns (success: bool, message: str)
    """
    try:
        # Get latest pending OTP for this user
        otp_obj = OTPVerification.objects.filter(
            user=user,
            status='pending'
        ).latest('created_at')

    except OTPVerification.DoesNotExist:
        return False, 'No active OTP found. Please request a new one.'

    # Check if OTP is still valid
    if not otp_obj.is_valid():
        otp_obj.status = 'expired'
        otp_obj.save()
        return False, 'OTP has expired. Please request a new one.'

    # Increment attempt counter
    otp_obj.attempts += 1
    otp_obj.save()

    # Check max attempts
    if otp_obj.attempts > 3:
        otp_obj.status = 'expired'
        otp_obj.save()
        return False, 'Too many failed attempts. Please request a new OTP.'

    # Verify code
    if otp_obj.otp_code != entered_code:
        remaining = 3 - otp_obj.attempts
        return False, f'Invalid OTP. {remaining} attempts remaining.'

    # Success — mark as verified
    otp_obj.status = 'verified'
    otp_obj.verified_at = timezone.now()
    otp_obj.save()

    # Mark user as verified
    user.is_first_login = False
    user.save()

    return True, 'OTP verified successfully.'