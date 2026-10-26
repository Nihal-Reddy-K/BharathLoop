# BharathLoop

A GTIN-anchored circular deposit-return system (DRS) and packaging intelligence platform engineered for India's retail, kabadiwala, and Bruhat Bengaluru Mahanagara Palike (BBMP) dry waste collection network.

---

## Executive Summary

BharathLoop adapts the European deposit-return framework (Deposit-Return System (DRS)) to Indian packaging supply chains and regulatory Extended Producer Responsibility (EPR) mandates. The platform binds retail Global Trade Item Numbers (GTINs) with unique, cryptographically signed return tokens. This architecture ensures that containers can be physically authenticated, deposited at collection kiosks, and refunded through an immutable double-entry ledger without the risk of duplicate redemptions.

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
 - Live GPS Distance & Interactive Leaflet Map      - Custom Facility Intake Selector
 - UPI Instant Cashout & Brand Voucher Hub          - Duplicate Fraud Detection
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
 - Immutable Audit Trail   - BBMP SWM Ward Registry   - Real Haversine Metrics
```

---

## Technical Specifications

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite, Tailwind CSS v4 |
| **Mapping & Routing** | Leaflet 1.9, OpenStreetMap tiles, Haversine live geodesic calculator |
| **Optical Scanning** | `html5-qrcode` (Hardware-accelerated video stream, EAN-13, UPC-A, Code 128, QR) |
| **Token Serialization** | `qrcode.react` (High-density SVG generator for single-use return tokens) |
| **State & Authentication** | Custom AuthContext with persistent session registry and 1-click demo login |
| **Backend Runtime** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| **Data Engine & Ledger** | SQLite 3 with WAL mode, foreign key enforcement, and atomic transactions |
| **External Providers** | Open Food Facts v2 REST API (Automated material and packaging extraction) |
| **Environmental Models** | CPCB Plastic Waste Management (PWM) Rules, LCA emission factors |
| **Municipal Integration**| BBMP Solid Waste Management (SWM) ward-level Dry Waste Collection Centres |

---

## Key Modules & Recent Additions

### 1. Optical Barcode Scanner & Product Resolution
- **Multi-Format Scanner**: Implements browser MediaStream constraints with automatic camera lifecycle teardown on unmount to prevent resource leaks.
- **Three-Tier Resolution Service**:
  1. *Persistent Local Catalog*: Queries the indexed SQLite database for verified Indian retail profiles and producer deposit rules.
  2. *Live Open Food Facts Ingestion*: If absent locally, the service queries Open Food Facts API, parses packaging taxonomy, assigns an indicative deposit rule, and caches the record.
  3. *Honest Not-Found*: Rejects artificial seed injection for unknown barcodes, prompting users with a manual product onboarding interface.

### 2. Live Geolocation & Interactive Turn-by-Turn Map
- **Real-Time GPS Positioning**: Automatically requests browser Geolocation (`navigator.geolocation`) and computes exact geodesic distance in kilometers and estimated driving duration via the Haversine formula.
- **Interactive Leaflet Map (`DropoffMap.jsx`)**:
  - Embedded OpenStreetMap canvas with custom vector SVG markers for user GPS position and facility intake pins.
  - Dashed trajectory route polyline connecting the user to the nearest collection center.
  - Direct 1-click **Turn-by-Turn Navigation** link opening driving directions directly in Google Maps.

### 3. BBMP Ward-Level Collection Center Directory
- **Credible Municipal Datasets**: Integrated official **Bruhat Bengaluru Mahanagara Palike (BBMP)** ward-level Dry Waste Collection Centres (DWCCs) operated in partnership with *Hasiru Dala*, *Saahas Zero Waste*, and *Swachha Eco Solutions*.
- **Executive Facility Directory**:
  - Search by facility name, ward number, or neighborhood (*Indiranagar*, *Malleshwaram*, *Jayanagar*, *HSR Layout*, *Koramangala*).
  - Filter chips for *BBMP DWCC*, *Smart Reverse Vending Machines (RVM)*, *Brand Takeback Kiosks*, and *Scrap Dealers (Kabadiwalas)*.
  - Clean material tags (`PET`, `HDPE`, `PP`, `LDPE`, `Paper & Cardboard`, `Glass`) without raw pipes or slashes.

### 4. Authentication, Live Wallet & Multi-Rail Redemption System
- **Citizen Authentication (`AuthContext.jsx`, `AuthModal.jsx`)**:
  - Complete Sign In, Registration, and **1-Click Demo Login** with session persistence in `localStorage`.
  - Header profile button displaying live wallet balance pill (`₹XX.XX`) and user menu with fast shortcuts.
- **Direct UPI & IMPS Cashout (`POST /api/wallet/withdraw`)**:
  - Instant payout to any UPI ID (`@okhdfcbank`, `@paytm`, `@upi`) or Bank Account (IMPS) with preset amount chips (`₹5`, `₹10`, `₹25`, `Max All`).
  - Realistic disbursement receipt modal displaying Bank UTR reference number, timestamp, and instant balance deduction.
- **Brand Digital Gift Vouchers (`POST /api/vouchers/issue`, `POST /api/vouchers/redeem`)**:
  - Convert cashback balance into instant e-gift vouchers for **Amazon Pay**, **Flipkart**, **Swiggy**, **Zomato**, **Decathlon**, and **Croma**.
  - Server-side single-use verification rejecting duplicate or expired vouchers with 1-click clipboard copy.
- **Immutable Ledger History**:
  - SHA-anchored double-entry ledger tracking all transactions (`DEPOSIT_PAID`, `REFUND`, `CASH_WITHDRAWAL`, `VOUCHER_ISSUED`, `VOUCHER_REDEEMED`) with category filters.

### 5. Collection Point Authentication & Anti-Fraud Engine
- **Physical Verification**: Authorized intake operators verify physical packaging integrity and scan the consumer return token.
- **Concurrency & Replay Defense**:
  - The verification routine runs inside an isolated atomic SQLite transaction.
  - The record is verified to have status `deposit_recorded`.
  - Upon acceptance, status transitions to `returned`, recording `returned_at`, `collection_point_id`, and `agent_id`.
  - **Duplicate Attempt Rejection**: Any secondary attempt to submit an already refunded token is strictly rejected with HTTP 400 and an audit log detailing the exact prior return timestamp and facility.
- **Executive Dropdown Selector**: Custom branded facility selector in Agent View with live search, ward badges, and verification status.

---

## Official Datasets & Regulatory Sources

The platform incorporates verified Indian regulatory frameworks and municipal directories cited in the application footer:
1. **BBMP SWM (Bruhat Bengaluru Mahanagara Palike)**: Ward-level Dry Waste Collection Centres (DWCCs) established under the Karnataka Municipal Corporations Act & BBMP Solid Waste Management Bye-Laws, 2020.
2. **CPCB / MoEFCC**: Central Pollution Control Board Plastic Waste Management Rules (PWM 2016, as amended 2022) & Centralized Extended Producer Responsibility (EPR) portal guidelines.
3. **GS1 India DataKart**: National Barcode GTIN-13 / EAN repository for product identification and packaging specifications.
4. **Open Food Facts**: Open crowdsourced packaged goods metadata and life cycle assessment (LCA) emission coefficients.

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

### 2. Configure and Run the Backend Service

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

### 3. Configure and Run the Frontend Application

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

An automated integration suite validates the entire DRS lifecycle, confirming deposit transactions, refund disbursals, anti-fraud barriers, and voucher state transitions:

```bash
cd bharatloop/backend

# Windows PowerShell:
$env:PYTHONIOENCODING="utf-8"
python test_DRS_flow.py

# Linux / macOS:
# python test_DRS_flow.py
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

Follow this 3-minute sequence to test the entire platform locally:

1. **Authentication & Profile**:
   - Click **Sign In** in the top-right header and click **1-Click Demo Login** (or register a new citizen account).
   - Notice the live wallet balance chip (`₹XX.XX`) in the header.

2. **Product Discovery & Geodesic Intake Routing**:
   - On the homepage, select **Kinley 500ml (PET)** or **Diet Coke (Can)** or click **Camera** to scan a physical barcode.
   - Inspect the resolved material profile (`PET`), EPR category (`Cat I Rigid`), and the **Refundable DRS Deposit (₹5.00)**.
   - View the **Nearest Authorized Intake Center** card showing clean material pills (`PET`, `HDPE`, `PP`) and live calculated distance from your GPS position.
   - Click **View Interactive Map & Route** to inspect the Leaflet route trajectory and click **Get Directions** to test Google Maps navigation.

3. **Simulate Purchase**:
   - Click **Simulate Purchase (Pay Deposit)**.
   - The system charges the simulated deposit and renders the modal containing the **Return QR Pass** and token (`BLP-XXXXXXXX`).

4. **Collection Point Authentication (Agent View)**:
   - In the pass modal, click **Verify in Collection Agent Mode** (or switch to **Collection Agent** in the header).
   - Inspect the active intake center using the custom dropdown.
   - Click **Confirm Receipt & Authorize Refund**.
   - An instant refund receipt is displayed and the consumer's wallet balance increases by ₹5.00.

5. **Anti-Fraud Duplicate Return Test**:
   - In Agent view, click **Test Duplicate Return**.
   - The backend immediately rejects the attempt with an anti-fraud alert:
     `Duplicate return rejected: This item was already returned on [timestamp]... Duplicate refunds prevented.`

6. **Wallet Cashout & Brand Voucher Hub**:
   - Switch back to **Consumer** mode and open the **Wallet & Redeem** tab.
   - **UPI / Bank Cashout**: Enter a demo UPI ID (`name@okhdfcbank`), choose an amount (e.g. `₹5`), and click **Withdraw via UPI** to view the instant disbursement receipt with Bank UTR reference number.
   - **Brand Vouchers**: Select **Amazon Pay** or **Swiggy**, choose `₹10`, and click **Generate Voucher** to receive a verified single-use voucher code with 1-click clipboard copy and server redemption validation.

7. **Producer & Regulatory Analytics**:
   - Switch to **Producer / Admin** in the navigation bar to inspect live recovery rates, plastic diverted (kg), and modify active DRS deposit tariffs per material.

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products/lookup?code={gtin}` | `GET` | Multi-tier resolution (SQLite, Open Food Facts, or not found). |
| `/api/consumer/verdict/{gtin}` | `GET` | Circular advice, nearest BBMP collection point, scrap economics, and deposit. |
| `/api/demo/purchases` | `POST` | Records simulated purchase, debits deposit, issues return token. |
| `/api/packaging/token/{token}` | `GET` | Validates circulating packaging instance metadata prior to intake. |
| `/api/returns/verify` | `POST` | Atomically transitions packaging to returned and credits refund. |
| `/api/wallet/{user_id}` | `GET` | Retrieves derived balance, active packaging count, and vouchers. |
| `/api/wallet/{user_id}/transactions` | `GET` | Paginated immutable ledger transactions. |
| `/api/wallet/withdraw` | `POST` | Disburses wallet balance to recipient UPI ID or IMPS Bank Account. |
| `/api/vouchers/issue` | `POST` | Converts wallet balance into single-use partner voucher. |
| `/api/vouchers/redeem` | `POST` | Server-side validation and single-use redemption of voucher code. |
| `/api/deposit-rules` | `GET` / `POST` | Retrieves or modifies active deposit rules per material. |
| `/api/admin/metrics` | `GET` | Aggregated circular economy KPIs and recovery metrics. |
| `/api/collection-points` | `GET` | Active BBMP dry waste collection centres, RVMs, and takeback points. |

---

## Directory Organization

```text
BharathLoop/
|-- README.md                     # Root project documentation
|-- .gitignore                    # Git exclusions (dependencies, virtualenvs, secrets)
`-- bharatloop/
    |-- README.md                 # Package-level documentation
    |-- index.html                # HTML5 entry with metadata, favicon, and typography
    |-- package.json              # Client dependencies (React 19, Leaflet, Lucide)
    |-- vite.config.js            # Vite build configuration with Tailwind CSS v4 plugin
    |-- public/
    |   `-- favicon.svg           # High-resolution vector DRS recycling loop favicon
    |-- backend/
    |   |-- main.py               # FastAPI application routing, validation schemas, withdrawal API
    |   |-- advisor.py            # Resolution service, Open Food Facts client, LCA models
    |   |-- test_drs_flow.py      # Automated test suite
    |   |-- requirements.txt      # Python runtime dependencies
    |   |-- data/                 # Baseline CSV datasets (products, dropoffs, scrap rates)
    |   |   |-- products.csv      # GS1 seed product catalog
    |   |   `-- dropoff_points.csv# Verified BBMP ward-level DWCC intake registry
    |   `-- rewards/
    |       |-- database.py       # SQLite database schema, ledger, withdrawal, and anti-fraud logic
    |       |-- engine.py         # Scrap and deposit calculation engine
    |       `-- providers.py      # Digital reward integration boundaries
    `-- src/
        |-- App.jsx               # Top-level state, role orchestration, and regulatory provenance footer
        |-- index.css             # Design tokens, typography, and optical scanner styles
        |-- context/
        |   `-- AuthContext.jsx   # Authentication context, session persistence, and wallet syncing
        `-- components/
            |-- AuthModal.jsx     # Sign In / Create Account modal with 1-click demo login
            |-- DropoffMap.jsx    # Interactive Leaflet map with GPS routing and turn-by-turn navigation
            |-- DemoGuideBar.jsx  # Interactive guided demo sequence
            |-- CameraScanner.jsx # html5-qrcode video viewport component
            |-- ReturnQrModal.jsx # Dynamic return pass SVG modal
            |-- ConsumerView.jsx  # Consumer flows (Scan, Centers directory, My Packaging, Wallet Hub)
            |-- AgentView.jsx     # Intake verification, custom center selector, and anti-fraud proof
            `-- AdminView.jsx     # Producer metrics and DRS tariff configuration
```

---

## Disclaimer

This implementation is a prototype demonstration platform. In-app balances and simulated deposits reflect internal SQLite ledger updates and do not represent actual Indian Rupee transfers via commercial banking networks or UPI rails until production payment gateways and legal custody accounts are configured.
