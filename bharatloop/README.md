# BharathLoop

A GTIN-anchored circular deposit-return system (Pfand) and packaging intelligence platform engineered for India's retail, kabadiwala, and dry waste collection network.

---

## Executive Summary

BharathLoop adapts the European deposit-return framework (*Pfand*) to Indian packaging supply chains and regulatory Extended Producer Responsibility (EPR) mandates. The platform binds retail Global Trade Item Numbers (GTINs) with unique, cryptographically signed return tokens. This architecture ensures that containers can be physically authenticated, deposited at collection kiosks, and refunded through an immutable double-entry ledger without the risk of duplicate redemptions.

### Core Problem Solved
Traditional retail barcodes (EAN-13, UPC-A) identify a product class, not a discrete container instance. Without unique item-level serialization, open-loop deposit systems fail due to double-refund fraud. BharathLoop solves this by pairing GTIN identification with server-issued, single-use return tokens generated upon simulated purchase and redeemed via atomic database transactions at authorized collection points.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                BHARATHLOOP CORE                                   |
+-----------------------------------------------------------------------------------+
       |                                                    |
       v                                                    v
[ Consumer Interface ]                             [ Collection Point Agent ]
 - Optical Barcode Scanner (EAN-13/UPC)             - Return Pass Intake & Verification
 - Tiered Product Resolution                        - Physical Container Integrity Check
 - Simulated Purchase & Deposit Ledger              - Atomic Status Transition
 - Dynamic QR Return Pass Generator                 - Cashback Disbursement & Audit Trail
       |                                                    |
       +-------------------------+--------------------------+
                                 |
                                 v
                       [ FastAPI Backend ]
                                 |
      +--------------------------+--------------------------+
      |                          |                          |
      v                          v                          v
[ SQLite Persistent DB ]  [ Open Food Facts API ]    [ Circular Analytics ]
 - Product Catalog         - Global Barcode Cache     - Recovery Rate (%)
 - Deposit Rules (paise)   - Packaging Fallback       - CO2e Avoidance (LCA)
 - Double-Entry Ledger     - Material Normalization   - CPCB PWM Compliance
 - Immutable Audit Trail
```

---

## Technical Specifications

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite, Tailwind CSS v4 |
| **Optical Scanning** | `html5-qrcode` (Hardware-accelerated video stream, EAN-13, UPC-A, Code 128, QR) |
| **Token Serialization** | `qrcode.react` (High-density SVG generator for single-use return tokens) |
| **Backend Runtime** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| **Data Engine & Ledger** | SQLite 3 with WAL mode, foreign key enforcement, and atomic transactions |
| **External Providers** | Open Food Facts v2 REST API (Automated material and packaging extraction) |
| **Environmental Models** | CPCB Plastic Waste Management (PWM) Rules, LCA emission factors |

---

## Key Modules

### 1. Optical Barcode Scanner and Product Lookup
- **Multi-Format Scanner**: Implements browser MediaStream constraints with automatic camera lifecycle teardown on unmount to prevent resource leaks.
- **Three-Tier Resolution Service**:
  1. *Persistent Local Catalog*: Queries the indexed SQLite database for verified Indian retail profiles and producer deposit rules.
  2. *Live Open Food Facts Ingestion*: If absent locally, the service queries Open Food Facts API, parses packaging taxonomy, assigns an indicative deposit rule, and caches the record.
  3. *Honest Not-Found*: Rejects artificial seed injection for unknown barcodes, prompting users with a manual product onboarding interface.

### 2. Deposit Recording and Item Serialization
- When a consumer purchases a deposit-bearing product, the system generates an unguessable token (`BLP-[HEX12]`).
- The transaction is recorded in the ledger with type `DEPOSIT_PAID`, and the deposit is added to the user's active circulating deposits.

### 3. Collection Point Authentication and Anti-Fraud Engine
- **Physical Verification**: Authorized intake operators (BBMP Dry Waste Collection Centres, kabadiwalas, or reverse vending kiosks) scan or input the return pass.
- **Concurrency & Replay Defense**:
  - The verification routine runs inside an isolated database transaction.
  - The record is verified to have status `deposit_recorded`.
  - Upon acceptance, the status transitions to `returned`, setting `returned_at`, `collection_point_id`, and `agent_id`.
  - **Duplicate Attempt Rejection**: Any secondary attempt to submit an already refunded token is rejected with HTTP 400 and an audit log detailing the exact prior return timestamp and location.

### 4. Double-Entry Ledger and Vouchers
- **Derived Balances**: In-app balances are derived directly from immutable ledger rows (`DEPOSIT_PAID`, `REFUND`, `VOUCHER_ISSUED`, `VOUCHER_REDEEMED`).
- **Single-Use Vouchers**: Cashback can be converted into single-use partner vouchers (GyFTR/retail format). Each code is cryptographically unique (`BHARAT-[HEX8]`) and marked `redeemed` upon initial use.

### 5. Producer EPR Dashboard and Rule Configurator
- Real-time calculation of Circular Recovery Rate:
  $$\text{Recovery Rate (\%)} = \left(\frac{\text{Returned Units}}{\text{Total Circulating Units}}\right) \times 100$$
- Allows administrators to configure deposit rules per material (PET, HDPE, Glass, Aluminium, Multilayer) and category in integer paise.

---

## Installation and Local Setup

### System Requirements
- Node.js 18.0.0 or higher
- Python 3.11 or higher
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Nihal-Reddy-K/BharathLoop.git
cd BharathLoop
```

### 2. Configure the Backend Service

Open a terminal session:
```bash
# Navigate to backend directory
cd bharatloop/backend

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell):
venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI via Uvicorn
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API service initializes at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

### 3. Configure the Frontend Application

Open a second terminal session:
```bash
# Navigate to frontend directory
cd bharatloop

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

The web client runs locally at `http://localhost:5173`.

---

## Automated Verification Suite

An automated integration suite validates the entire Pfand lifecycle, confirming deposit transactions, refund disbursals, anti-fraud barriers, and voucher state transitions:

```bash
cd bharatloop/backend

# Windows PowerShell:
$env:PYTHONIOENCODING="utf-8"
venv\Scripts\python.exe test_pfand_flow.py

# Linux / macOS:
# python test_pfand_flow.py
```

### Test Coverage
- `test_product_lookup`: Resolves local seed GTINs, verifies Open Food Facts fallback, and enforces honest not-found responses.
- `test_simulated_purchase`: Generates single-use packaging instances and verifies ledger deposit debits.
- `test_agent_verification`: Executes collection verification and confirms ledger balance credits.
- `test_anti_fraud_duplicate_rejection`: Attempts redundant verification of a processed token and asserts HTTP 400 rejection.
- `test_voucher_issuance_and_redemption`: Issues single-use voucher codes and asserts second-use rejection.
- `test_circular_metrics`: Confirms accurate calculation of recovery percentage and environmental offsets.

---

## End-to-End Demonstration Walkthrough

Follow this 3-minute sequence to demonstrate the platform:

1. **Product Discovery (Consumer)**:
   - On the homepage, select the **Bisleri 1L (PET)** quick-selector or click **Scan Camera** to scan a physical packaging barcode.
   - Inspect the resolved material profile (`PET`), EPR category (`Cat I Rigid`), and the **INR 5.00 Refundable Pfand Deposit**.

2. **Simulate Purchase**:
   - Click **Simulate Purchase (Pay Deposit)**.
   - The system charges the simulated deposit and renders the modal containing the **Return QR Pass** and token (`BLP-XXXXXXXX`).

3. **Collection Point Authentication**:
   - In the pass modal, click **Verify in Collection Agent Mode** (or switch roles via the top navigation bar).
   - Review container integrity and click **Confirm Receipt & Authorize Refund**.
   - An instant refund receipt is displayed and the consumer's wallet balance increases by INR 5.00.

4. **Duplicate Fraud Rejection**:
   - In Agent view, click **Test Duplicate Return**.
   - The backend halts the request and returns an explicit fraud notification:  
     `Duplicate return rejected: This item was already returned on [timestamp]... Duplicate refunds prevented.`

5. **Ledger Audit & Voucher Redemption**:
   - Return to Consumer mode and select **Demo Wallet & Vouchers**.
   - Review the immutable ledger history displaying both `DEPOSIT_PAID` and `REFUND` transactions.
   - Convert available credit into a **GyFTR Partner Voucher** and click **Redeem Now** to test one-time voucher invalidation.

6. **Producer & Regulatory Analytics**:
   - Switch to **Producer / Admin** in the navigation bar to inspect live recovery rates, plastic diverted (kg), and modify active Pfand deposit tariffs.

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products/lookup?code={gtin}` | `GET` | Multi-tier resolution (SQLite, Open Food Facts, or not found). |
| `/api/consumer/verdict/{gtin}` | `GET` | Circular advice, nearest collection point, scrap economics, and deposit. |
| `/api/demo/purchases` | `POST` | Records simulated purchase, debits deposit, issues return token. |
| `/api/packaging/token/{token}` | `GET` | Validates circulating packaging instance metadata prior to intake. |
| `/api/returns/verify` | `POST` | Atomically transitions packaging to returned and credits refund. |
| `/api/wallet/{user_id}` | `GET` | Retrieves derived balance, active packaging count, and vouchers. |
| `/api/wallet/{user_id}/transactions` | `GET` | Paginated immutable ledger transactions. |
| `/api/vouchers/issue` | `POST` | Converts wallet balance into single-use partner voucher. |
| `/api/vouchers/redeem` | `POST` | Server-side validation and redemption of voucher code. |
| `/api/deposit-rules` | `GET` / `POST` | Retrieves or modifies active deposit rules per material. |
| `/api/admin/metrics` | `GET` | Aggregated circular economy KPIs and recovery metrics. |
| `/api/collection-points` | `GET` | Active dry waste collection centres and RVM locations. |

---

## Directory Organization

```text
BharathLoop/
├── README.md                     # Root project documentation
├── .gitignore                    # Git exclusions (dependencies, virtualenvs, secrets)
└── bharatloop/
    ├── README.md                 # Package-level documentation
    ├── index.html                # HTML5 entry with metadata and Plus Jakarta Sans font
    ├── package.json              # Client dependencies and build scripts
    ├── vite.config.js            # Vite build configuration with Tailwind CSS v4 plugin
    ├── backend/
    │   ├── main.py               # FastAPI application routing and validation schemas
    │   ├── advisor.py            # Resolution service, Open Food Facts client, LCA models
    │   ├── test_pfand_flow.py    # Automated test suite
    │   ├── requirements.txt      # Python runtime dependencies
    │   ├── data/                 # Baseline CSV datasets (products, dropoffs, scrap rates)
    │   └── rewards/
    │       ├── database.py       # SQLite database schema, ledger, and anti-fraud logic
    │       ├── engine.py         # Scrap and deposit calculation engine
    │       └── providers.py      # Digital reward integration boundaries
    └── src/
        ├── App.jsx               # Top-level state and role orchestration
        ├── index.css             # Design tokens, typography, and optical scanner styles
        └── components/
            ├── DemoGuideBar.jsx  # Interactive guided demo sequence
            ├── CameraScanner.jsx # html5-qrcode video viewport component
            ├── ReturnQrModal.jsx # Dynamic return pass SVG modal
            ├── ConsumerView.jsx  # Consumer flows (Search, My Packaging, Wallet)
            ├── AgentView.jsx     # Intake verification and anti-fraud proof
            └── AdminView.jsx     # Producer metrics and Pfand tariff configuration
```

---

## Disclaimer

This implementation is a prototype demonstration platform. In-app balances and simulated deposits reflect internal SQLite ledger updates and do not represent actual Indian Rupee transfers via commercial banking networks or UPI rails until production payment gateways and legal custody accounts are configured.
