"""
API Views
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

import os
import uuid
import tempfile
from django.utils import timezone
from django.db.models import Avg, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    Applicant, ScoreRecord, BatchSession,
    Institution, ScoringRule, User
)
from .engine import CreditScoringEngine
from .ingestion import extract_indicators, extract_indicators_batch, DataIngestionError
from .serializers import (
    ScoreRecordSerializer, ApplicantSerializer,
    BatchSessionSerializer, InstitutionSerializer,
    ScoringRuleSerializer, UserSerializer
)


# ─── PERMISSION HELPERS ───────────────────────────────────────────────────────
def is_admin(user):
    return user.role == 'admin'

def is_loan_officer(user):
    return user.role in ['admin', 'loan_officer']

def is_branch_manager(user):
    return user.role in ['admin', 'branch_manager']

def can_view(user):
    return user.role in ['admin', 'loan_officer', 'auditor', 'branch_manager']


# ─── AUTH: USER PROFILE ───────────────────────────────────────────────────────
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ─── INDIVIDUAL SCORING ───────────────────────────────────────────────────────
class ScoreIndividualView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not is_loan_officer(request.user):
            return Response(
                {'error': 'Permission denied. Loan Officer role required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get form data
        transaction_file = request.FILES.get('transaction_file')
        applicant_ref    = request.data.get('applicant_ref', '').strip()
        applicant_name   = request.data.get('applicant_name', '').strip()
        phone_number     = request.data.get('phone_number', '').strip()
        account_age      = int(request.data.get('account_age_months', 0))
        gender           = request.data.get('gender', '')
        district         = request.data.get('district', '')
        mobile_operator  = request.data.get('mobile_operator', 'mtn')
        notes            = request.data.get('notes', '')

        # Validate required fields
        if not transaction_file:
            return Response({'error': 'Transaction file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not applicant_ref:
            return Response({'error': 'Applicant reference code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not applicant_name:
            return Response({'error': 'Applicant name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save file temporarily
        suffix = '.json' if transaction_file.name.endswith('.json') else '.csv'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in transaction_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            # Extract indicators
            indicators = extract_indicators(tmp_path, account_age)

            # Run scoring engine
            engine = CreditScoringEngine()
            result = engine.compute_score(indicators)

            # Get or create applicant
            applicant, created = Applicant.objects.get_or_create(
                applicant_ref=applicant_ref,
                defaults={
                    'full_name':       applicant_name,
                    'phone_number':    phone_number,
                    'gender':          gender,
                    'district':        district,
                    'mobile_operator': mobile_operator,
                    'institution':     request.user.institution,
                    'created_by':      request.user,
                }
            )

            # Save score record
            score = ScoreRecord.objects.create(
                applicant=applicant,
                scored_by=request.user,
                txn_frequency_score=result.txn_frequency_score,
                avg_txn_value_score=result.avg_txn_value_score,
                savings_score=result.savings_score,
                bill_payment_score=result.bill_payment_score,
                network_diversity_score=result.network_diversity_score,
                account_age_score=result.account_age_score,
                csi_total=result.csi_total,
                risk_tier=result.risk_tier,
                recommendation=result.recommendation,
                scoring_mode='individual',
                notes=notes,
            )

            serializer = ScoreRecordSerializer(score)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except DataIngestionError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Scoring failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            os.unlink(tmp_path)


# ─── BATCH SCORING ────────────────────────────────────────────────────────────
class ScoreBatchView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not is_loan_officer(request.user):
            return Response(
                {'error': 'Permission denied. Loan Officer role required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        transaction_file = request.FILES.get('transaction_file')
        account_ages_raw = request.data.get('account_ages', '{}')
        notes            = request.data.get('notes', '')

        if not transaction_file:
            return Response({'error': 'Transaction file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        import json
        try:
            account_ages = json.loads(account_ages_raw)
        except Exception:
            account_ages = {}

        suffix = '.json' if transaction_file.name.endswith('.json') else '.csv'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in transaction_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        # Create batch session
        session_ref = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
        batch = BatchSession.objects.create(
            session_ref=session_ref,
            institution=request.user.institution,
            created_by=request.user,
            notes=notes,
        )

        try:
            all_indicators = extract_indicators_batch(tmp_path, account_ages)
            batch.total_applicants = len(all_indicators)
            batch.save()

            engine = CreditScoringEngine()
            results = []
            failed = 0

            for ref, indicators in all_indicators.items():
                try:
                    result = engine.compute_score(indicators)
                    applicant, _ = Applicant.objects.get_or_create(
                        applicant_ref=ref,
                        defaults={
                            'full_name':    f'Applicant {ref}',
                            'phone_number': '',
                            'institution':  request.user.institution,
                            'created_by':   request.user,
                        }
                    )
                    score = ScoreRecord.objects.create(
                        applicant=applicant,
                        scored_by=request.user,
                        batch=batch,
                        txn_frequency_score=result.txn_frequency_score,
                        avg_txn_value_score=result.avg_txn_value_score,
                        savings_score=result.savings_score,
                        bill_payment_score=result.bill_payment_score,
                        network_diversity_score=result.network_diversity_score,
                        account_age_score=result.account_age_score,
                        csi_total=result.csi_total,
                        risk_tier=result.risk_tier,
                        recommendation=result.recommendation,
                        scoring_mode='batch',
                        notes=notes,
                    )
                    results.append(ScoreRecordSerializer(score).data)
                    batch.processed_count += 1
                    batch.save()
                except Exception:
                    failed += 1
                    batch.failed_count += 1
                    batch.save()

            batch.status = 'completed'
            batch.completed_at = timezone.now()
            batch.save()

            return Response({
                'batch_session': BatchSessionSerializer(batch).data,
                'results': results,
                'summary': {
                    'total': batch.total_applicants,
                    'processed': batch.processed_count,
                    'failed': batch.failed_count,
                }
            }, status=status.HTTP_201_CREATED)

        except DataIngestionError as e:
            batch.status = 'failed'
            batch.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            batch.status = 'failed'
            batch.save()
            return Response({'error': f'Batch scoring failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            os.unlink(tmp_path)


# ─── SCORE HISTORY ────────────────────────────────────────────────────────────
class ScoreHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        scores = ScoreRecord.objects.select_related('applicant', 'scored_by')

        # Branch managers see only their institution
        if request.user.role == 'branch_manager':
            scores = scores.filter(applicant__institution=request.user.institution)

        # Search filter
        search = request.query_params.get('search', '')
        if search:
            scores = scores.filter(
                applicant__full_name__icontains=search
            ) | scores.filter(
                applicant__applicant_ref__icontains=search
            )

        # Risk tier filter
        tier = request.query_params.get('risk_tier', '')
        if tier:
            scores = scores.filter(risk_tier=tier)

        # Mode filter
        mode = request.query_params.get('mode', '')
        if mode:
            scores = scores.filter(scoring_mode=mode)

        scores = scores.order_by('-scored_at')[:100]
        serializer = ScoreRecordSerializer(scores, many=True)
        return Response(serializer.data)


# ─── SINGLE SCORE DETAIL ──────────────────────────────────────────────────────
class ScoreDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, score_id):
        try:
            score = ScoreRecord.objects.select_related(
                'applicant', 'scored_by', 'batch'
            ).get(id=score_id)
            serializer = ScoreRecordSerializer(score)
            return Response(serializer.data)
        except ScoreRecord.DoesNotExist:
            return Response({'error': 'Score record not found.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, score_id):
        try:
            score = ScoreRecord.objects.get(id=score_id)
            if not can_view(request.user):
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            score.notes = request.data.get('notes', score.notes)
            score.save()
            return Response(ScoreRecordSerializer(score).data)
        except ScoreRecord.DoesNotExist:
            return Response({'error': 'Score record not found.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, score_id):
        try:
            score = ScoreRecord.objects.get(id=score_id)
            if not is_admin(request.user):
                return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            score.delete()
            return Response({'message': 'Deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except ScoreRecord.DoesNotExist:
            return Response({'error': 'Score record not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─── APPLICANT HISTORY ────────────────────────────────────────────────────────
class ApplicantHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, applicant_ref):
        try:
            applicant = Applicant.objects.get(applicant_ref=applicant_ref)
            scores = ScoreRecord.objects.filter(
                applicant=applicant
            ).order_by('-scored_at')
            return Response({
                'applicant': ApplicantSerializer(applicant).data,
                'score_history': ScoreRecordSerializer(scores, many=True).data,
            })
        except Applicant.DoesNotExist:
            return Response({'error': 'Applicant not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─── DASHBOARD STATISTICS ─────────────────────────────────────────────────────
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scores = ScoreRecord.objects.all()

        if request.user.role == 'branch_manager':
            scores = scores.filter(applicant__institution=request.user.institution)

        total = scores.count()
        avg_csi = scores.aggregate(avg=Avg('csi_total'))['avg'] or 0

        tier_counts = scores.values('risk_tier').annotate(count=Count('risk_tier'))
        tier_summary = {item['risk_tier']: item['count'] for item in tier_counts}

        return Response({
            'total_scored': total,
            'average_csi': round(avg_csi, 1),
            'tier_summary': tier_summary,
            'individual_count': scores.filter(scoring_mode='individual').count(),
            'batch_count': scores.filter(scoring_mode='batch').count(),
        })


# ─── SCORING RULES ────────────────────────────────────────────────────────────
class ScoringRulesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rules = ScoringRule.objects.filter(is_active=True)
        serializer = ScoringRuleSerializer(rules, many=True)
        return Response(serializer.data)

    def put(self, request, rule_id):
        if not is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            rule = ScoringRule.objects.get(id=rule_id)
            rule.points_awarded = request.data.get('points_awarded', rule.points_awarded)
            rule.min_value = request.data.get('min_value', rule.min_value)
            rule.max_value = request.data.get('max_value', rule.max_value)
            rule.updated_by = request.user
            rule.save()
            return Response(ScoringRuleSerializer(rule).data)
        except ScoringRule.DoesNotExist:
            return Response({'error': 'Rule not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─── BATCH SESSION LIST ───────────────────────────────────────────────────────
class BatchSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        batches = BatchSession.objects.select_related('institution', 'created_by').order_by('-created_at')[:50]
        serializer = BatchSessionSerializer(batches, many=True)
        return Response(serializer.data)


# ─── INSTITUTIONS ─────────────────────────────────────────────────────────────
class InstitutionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        institutions = Institution.objects.filter(is_active=True)
        serializer = InstitutionSerializer(institutions, many=True)
        return Response(serializer.data)
        # ─── OTP VIEWS ────────────────────────────────────────────────────────────────
from .otp_utils import generate_and_send_otp, verify_otp


class RequestOTPView(APIView):
    """
    Called after username/password login.
    Sends OTP to user's email if first login.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled. Contact administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # If first login — require OTP
        if user.is_first_login:
            if not user.email:
                return Response(
                    {'error': 'No email on file. Contact administrator.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            otp_obj, email_sent = generate_and_send_otp(user)
            return Response({
                'requires_otp': True,
                'message': f'OTP sent to {user.email[:3]}***@***.com',
                'username': username,
            })

        # Not first login — issue JWT directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return Response({
            'requires_otp': False,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class VerifyOTPView(APIView):
    """
    Verifies OTP entered by user.
    On success issues JWT access token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        otp_code = request.data.get('otp_code', '').strip()

        if not username or not otp_code:
            return Response(
                {'error': 'Username and OTP code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        success, message = verify_otp(user, otp_code)

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Issue JWT token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'message': message,
        })


class ResendOTPView(APIView):
    """Resends a fresh OTP to the user's email."""
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user.email:
            return Response(
                {'error': 'No email on file. Contact administrator.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_obj, email_sent = generate_and_send_otp(user)
        return Response({
            'message': f'New OTP sent to {user.email[:3]}***',
        })# ─── USER MANAGEMENT ──────────────────────────────────────────────────────────
class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all().order_by('username')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(
                username=request.data.get('username'),
                email=request.data.get('email', ''),
                password=password,
                first_name=request.data.get('first_name', ''),
                last_name=request.data.get('last_name', ''),
                role=request.data.get('role', 'loan_officer'),
                phone_number=request.data.get('phone_number', ''),
                is_active=request.data.get('is_active', True),
            )
            institution_id = request.data.get('institution')
            if institution_id:
                try:
                    user.institution = Institution.objects.get(id=institution_id)
                    user.save()
                except Institution.DoesNotExist:
                    pass
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if not is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=user_id)
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.email = request.data.get('email', user.email)
            user.role = request.data.get('role', user.role)
            user.phone_number = request.data.get('phone_number', user.phone_number)
            user.is_active = request.data.get('is_active', user.is_active)
            password = request.data.get('password')
            if password:
                user.set_password(password)
            institution_id = request.data.get('institution')
            if institution_id:
                try:
                    user.institution = Institution.objects.get(id=institution_id)
                except Institution.DoesNotExist:
                    pass
            user.save()
            return Response(UserSerializer(user).data)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, user_id):
        if not is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=user_id)
            if user == request.user:
                return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({'message': 'User deleted.'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)