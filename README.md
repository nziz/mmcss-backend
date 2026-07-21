# MMCSS — Mobile Money Credit Scoring System (Backend)

Django REST API powering a fintech credit scoring platform for mobile money lenders in Rwanda. Handles applicant management, credit scoring, batch processing, OTP authentication, and MoMo statement analysis.

## 🏗 Tech Stack

- **Django 4.x** — Web framework
- **Django REST Framework** — API layer
- **PostgreSQL** — Production database
- **JWT (djangorestframework-simplejwt)** — Authentication
- **Tree-sitter** — Code parsing (via Graphify analysis)
- **Python 3.11+**

## 📁 Project Structure
mmcss/
├── api/                    # REST API endpoints
│   ├── views.py            # APIView classes
│   ├── serializers.py      # DRF serializers
│   └── urls.py             # URL routing
├── scoring/                # Credit scoring engine
│   ├── models.py           # ScoringRule, ScoreRecord, CreditScoringEngine
│   ├── engine.py           # Core scoring logic
│   └── utils.py            # MoMo parsing, metric calculation
├── applicants/             # Applicant management
│   ├── models.py           # Applicant, Institution, BatchSession
│   └── admin.py            # Django admin configuration
├── users/                  # User management & auth
│   ├── models.py           # Custom User model
│   └── serializers.py      # UserSerializer
├── core/                   # Project settings
│   ├── settings.py         # Django config
│   ├── urls.py             # Root URL conf
│   ├── wsgi.py             # WSGI entry
│   └── asgi.py             # ASGI entry
├── staticfiles/            # Admin static assets
├── initial_data.py         # Seed data / fixtures
└── manage.py

## 🗄 Database Models

| Model | Purpose |
|-------|---------|
| `User` | Custom user with role-based access (admin, loan_officer, applicant) |
| `Applicant` | Loan applicant profile with financial data |
| `Institution` | Lending institution / organization |
| `BatchSession` | Group scoring session for multiple applicants |
| `ScoringRule` | Configurable scoring rules per indicator |
| `ScoreRecord` | Individual score result with sub-scores |
| `CreditScoringEngine` | Core scoring computation |

## 🔑 Key Features

| Feature | Description |
|---------|-------------|
| **JWT Auth** | Token-based authentication with refresh |
| **OTP Verification** | SMS/Email OTP for applicant registration |
| **5-Tier Risk Scoring** | Low, Medium-Low, Medium, Medium-High, High risk |
| **MoMo Parsing** | Parse mobile money statements for behavioral metrics |
| **Batch Scoring** | Process multiple applicants via CSV upload |
| **Admin Dashboard** | Full Django admin for all models |
| **API Documentation** | DRF browsable API |

## ⚡ Quick Start

```bash
# Clone the repo
git clone https://github.com/nziz/mmcss-backend.git
cd mmcss-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure database (PostgreSQL)
# Edit core/settings.py DATABASES config

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data (optional)
python manage.py shell < initial_data.py

# Run development server
python manage.py runserver
API runs at http://127.0.0.1:8000
create.env file
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://user:pass@localhost:5432/mmcss
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
api endpoints

| Endpoint                 | Method         | Description            |
| ------------------------ | -------------- | ---------------------- |
| `/api/auth/login/`       | POST           | JWT token obtain       |
| `/api/auth/refresh/`     | POST           | JWT token refresh      |
| `/api/applicants/`       | GET/POST       | List/create applicants |
| `/api/applicants/<id>/`  | GET/PUT/DELETE | Applicant detail       |
| `/api/score/individual/` | POST           | Score single applicant |
| `/api/score/batch/`      | POST           | Batch score applicants |
| `/api/score/history/`    | GET            | Score history          |
| `/api/institutions/`     | GET            | List institutions      |
| `/api/otp/send/`         | POST           | Send OTP               |
| `/api/otp/verify/`       | POST           | Verify OTP             |

Test coverage includes:
Authentication (login failure, role restrictions)
Scoring computation (boundary cases, negative values)
Applicant model creation
Batch session creation
Self-registration restrictions
 Credit Scoring Engine
The CreditScoringEngine computes scores from behavioral indicators:
Savings History — consistency, amount, duration
Transaction Patterns — frequency, volume, regularity
Debt Indicators — existing obligations, repayment history
MoMo Metrics — parsed from mobile money statements
Returns: (risk_tier, recommendation, sub_scores)
 What I Learned
Designing REST APIs for multi-role fintech applications
Implementing JWT authentication with token refresh
Building configurable scoring engines with rule-based logic
Parsing unstructured financial data (MoMo statements)
Django admin customization for complex workflows
Writing comprehensive test suites for financial logic
 Future Improvements
[ ] Add Celery for async batch processing
[ ] Implement Redis caching for score lookups
[ ] Add WebSocket notifications for batch completion
[ ] Integrate with actual MoMo API (currently parses statements)
[ ] Add audit logging for all scoring decisions
[ ] Docker containerization for deployment
 License
MIT
 Author
Aime Octave Nziza
BSc Business Information & Technology, University of Kigali
Kigali, Rwanda
LinkedIn | nziza1999@gmail.com

