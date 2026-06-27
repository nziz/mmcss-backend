
"""
URL Routes
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # ── Authentication ─────────────────────────────────
    path('auth/login/',   TokenObtainPairView.as_view(),  name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(),     name='token_refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
    # ── OTP ────────────────────────────────────────────
    path('auth/request-otp/', views.RequestOTPView.as_view(),  name='request_otp'),
    path('auth/verify-otp/',  views.VerifyOTPView.as_view(),   name='verify_otp'),
    path('auth/resend-otp/',  views.ResendOTPView.as_view(),   name='resend_otp'),

    # ── Scoring ────────────────────────────────────────
    path('score/individual/', views.ScoreIndividualView.as_view(),  name='score_individual'),
    path('score/batch/',      views.ScoreBatchView.as_view(),       name='score_batch'),

    # ── Records ────────────────────────────────────────
    path('scores/',                          views.ScoreHistoryView.as_view(),    name='score_history'),
    path('scores/<int:score_id>/',           views.ScoreDetailView.as_view(),     name='score_detail'),
    path('applicants/<str:applicant_ref>/',  views.ApplicantHistoryView.as_view(), name='applicant_history'),

    # ── Dashboard ──────────────────────────────────────
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),

    # ── Admin ──────────────────────────────────────────
    path('rules/',               views.ScoringRulesView.as_view(),    name='rules_list'),
    path('rules/<int:rule_id>/', views.ScoringRulesView.as_view(),    name='rules_update'),
    path('batches/',             views.BatchSessionListView.as_view(), name='batch_list'),
    path('institutions/',        views.InstitutionListView.as_view(),  name='institution_list'),
]
