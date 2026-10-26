# BharathLoop (भारतलूप) ♻️
### GTIN-Anchored Pfand Deposit-Return System & Circular Packaging Intelligence for India

BharathLoop adapts the German **Pfand deposit-return model** to India's retail, kabadiwala, and dry waste collection infrastructure. It pairs retail barcodes (EAN-13 / UPC) with **unique cryptographic return tokens**, guaranteeing that packaging returns can be verified, refunded, and **never claimed twice**.

---

## 🌟 Architecture & Core Capabilities

- **Real Optical Camera Scanner**: Live camera scanning via `html5-qrcode` decoding real retail barcodes (EAN-13, UPC-A, Code 128) and dynamic QR return tokens with hardware cleanup on close.
- **Three-Tier Product Resolution**:
  1. *Persistent SQLite DB*: Instant lookup of producer deposit rules and verified packaging profiles.
  2. *Open Food Facts Live API*: Real-time resolution for external or pantry barcodes, normalizing materials, weights, and caching into SQLite.
  3. *Honest Not-Found*: Never substitutes fake products. Offers instant 1-click custom catalog registration.
- **Pfand Deposit Lifecycle**:
  - *Simulated Purchase*: Consumer pays deposit; system creates a packaging instance with a unique public token (e.g. `BLP-XXXXXXXX`) and records an immutable ledger entry.
  - *Return QR Pass*: High-resolution QR code generated on-device with `qrcode.react`.
  - *Intake Verification*: Collection agent inspects container and authorizes refund.
- **Anti-Fraud Security**:
  - Atomic database transactions transition status to `returned`.
  - Replay attempts immediately return **HTTP 400** with an audit notice indicating the prior return timestamp and intake location.
- **Demo Wallet & Vouchers**:
  - Derived balance from immutable ledger entries (`DEPOSIT_PAID`, `REFUND`, `VOUCHER_ISSUED`, `VOUCHER_REDEEMED`).
  - Single-use partner voucher generator and server-side redemption with celebratory confetti.
- **Producer / Admin Portal**:
  - Real-time Circular Recovery Rate (%), plastic diverted, CO₂e avoided, editable Pfand deposit rules, and CPCB PWM EPR compliance analysis.

---

## 📦 Prerequisites

Before running locally, ensure you have installed:
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python**: `3.11` or higher ([Download Python](https://www.python.org/))
- **Git**: For version control ([Download Git](https://git-scm.com/))

---

## 🚀 How to Install & Run Locally

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/bharatloop.git
cd bharatloop
```
*(If working inside the cloned folder, you will see `bharatloop/` containing `backend/` and `src/`)*.

---

### 2. Backend Setup (FastAPI + SQLite)

Open a terminal window:

```bash
# Navigate to the backend directory
cd bharatloop/backend

# Create a virtual environment (if not already present)
python -m venv venv

# Activate the virtual environment:
# On Windows (PowerShell):
venv\Scripts\activate
# On Linux / macOS:
# source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

*The API will start at **`http://127.0.0.1:8000`**.*  
*Interactive Swagger documentation is available at **`http://127.0.0.1:8000/docs`**.*

---

### 3. Frontend Setup (React + Vite + Tailwind CSS)

Open a **second** terminal window:

```bash
# Navigate to the frontend directory
cd bharatloop

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```

*The application will be live at **`http://localhost:5173`**.*

Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🧪 Running Automated Integration Tests

To test the complete end-to-end Pfand lifecycle (product lookup, simulated purchase, return verification, duplicate rejection, and voucher redemption):

```bash
cd bharatloop/backend

# Run with UTF-8 encoding (Windows PowerShell)
$env:PYTHONIOENCODING="utf-8"
venv\Scripts\python.exe test_pfand_flow.py
```

### Expected Output:
```text
[BharatLoop] Database ready at .../rewards.db
--- 1. Testing Product Lookup ---
✓ Seeded product lookup passed (Bisleri 1L, ₹5.00 deposit)
✓ Unknown product honest not-found passed
✓ Open Food Facts product lookup passed: Nutella (Open Food Facts API)

--- 2. Testing Simulated Purchase (Pfand Recording) ---
✓ Simulated purchase succeeded. Generated Return Token: BLP-77C9B76F
✓ Wallet updated: deposits_held = ₹5.00

--- 3. Testing Collection Agent Return Verification ---
✓ Return verified. Wallet credited with ₹5.00 refund.
✓ Wallet verified: balance = ₹5.00, total_refunded = ₹5.00

--- 4. Testing Duplicate Return Rejection (Anti-Fraud) ---
✓ Duplicate return successfully blocked: Duplicate return rejected: This item was already returned...

--- 5. Testing Voucher Flow & Single-Use Redemption ---
✓ Voucher issued: BHARAT-E1996A22
✓ Voucher BHARAT-E1996A22 successfully redeemed.
✓ Duplicate redemption successfully blocked: Vouchers are single-use only.

--- 6. Testing Circular Metrics & Collection Points ---
✓ Circular Metrics: Total Issued=1, Returned=1, Recovery Rate=100.0%, CO2e Saved=0.07kg
✓ Active collection points: 14

ALL PFAND LIFECYCLE TESTS PASSED PERFECTLY!
```

---

## 🎬 3-Minute Interactive Demo Tour

Follow these steps for a live demonstration:

1. **Step 1 — Scan or Select Product (Consumer)**:
   - On the homepage, click **"Bisleri 1L (PET)"** or click **"Scan Camera"** to point your camera at any real barcode.
   - Observe the resolved material (`PET`), recyclability (`85%`), and the **₹5.00 Refundable Pfand Deposit**.
2. **Step 2 — Simulate Purchase**:
   - Click **"Simulate Purchase (Pay Deposit)"**.
   - A unique Return QR modal appears with a cryptographic token (e.g. `BLP-77C9B76F`).
3. **Step 3 — Switch to Collection Agent & Verify Return**:
   - In the modal, click **"Verify in Collection Agent Mode"** (or use the top role switcher).
   - Click **"Confirm Receipt & Authorize ₹5.00 Refund"**.
   - Experience the instant refund receipt, updated balance, and celebratory confetti blast!
4. **Step 4 — Test Anti-Fraud Duplicate Protection**:
   - In Agent mode, click **"Test Duplicate Return (Try refunding again)"** on the same token.
   - The server immediately blocks it with:  
     `"Duplicate return rejected: This item was already returned on [date]... Duplicate refunds prevented."`
5. **Step 5 — Check Wallet & Redeem Voucher**:
   - Switch to **Consumer** → **Demo Wallet & Vouchers** tab.
   - Observe your **₹5.00 available balance** and the immutable `REFUND` transaction in the ledger.
   - Convert balance into a **GyFTR partner voucher** and click **"Redeem Now"** to test single-use redemption!
6. **Step 6 — Producer / Admin Portal**:
   - Switch to **"Producer / Admin"** in the top navigation bar to inspect the **Circular Recovery Rate (%)**, total plastic diverted, and edit live Pfand deposit rates.

---

## 📤 How to Push this Project to GitHub

Follow these steps to upload the project to your GitHub account:

```bash
# 1. Navigate to the project root
cd c:\BharatLoop\bharatloop

# 2. Initialize a git repository
git init

# 3. Add all files (the updated .gitignore will automatically exclude node_modules, venv, and .env)
git add .

# 4. Commit your changes
git commit -m "feat: complete BharathLoop Pfand deposit-return system with camera scanner and anti-fraud verification"

# 5. Rename branch to main
git branch -M main

# 6. Add your GitHub repository as origin (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/bharatloop.git

# 7. Push to GitHub
git push -u origin main
```

---

## 📁 Project Directory Structure

```text
bharatloop/
├── backend/
│   ├── data/
│   │   ├── products.csv          # GS1 seed products catalog
│   │   ├── dropoff_points.csv    # Bengaluru DWCC collection centers
│   │   ├── reward_rules.csv      # Base material recovery rates
│   │   ├── scrap_rates.csv       # Indicative kabadiwala market rates
│   │   ├── emission_factors.csv  # LCA CO2e emission factors
│   │   └── substitutes.csv       # Sustainable material alternatives
│   ├── rewards/
│   │   ├── database.py           # SQLite models, ledger transactions & anti-fraud logic
│   │   ├── engine.py             # Material reward calculation engine
│   │   └── providers.py          # Voucher providers (Demo & GyFTR boundary)
│   ├── advisor.py                # Multi-tier lookup & circular LCA intelligence
│   ├── main.py                   # FastAPI REST API endpoints
│   ├── test_pfand_flow.py        # Automated test suite
│   └── requirements.txt          # Python dependencies
├── src/
│   ├── components/
│   │   ├── CameraScanner.jsx     # Optical camera scanner with html5-qrcode
│   │   ├── ReturnQrModal.jsx     # Return QR modal with QRCodeSVG
│   │   ├── DemoGuideBar.jsx      # 3-minute guided walkthrough bar
│   │   ├── ConsumerView.jsx      # Consumer tabs: Scan, My Packaging, Wallet & Vouchers
│   │   ├── AgentView.jsx         # Collection Agent intake & anti-fraud verification
│   │   └── AdminView.jsx         # Producer/Admin circular metrics & deposit rules
│   ├── App.jsx                   # Master orchestration & navigation
│   ├── index.css                 # Tailwind CSS v4 & Plus Jakarta Sans typography
│   └── main.jsx                  # React application entry point
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite build configuration
├── .gitignore                    # Configured to ignore node_modules, venv, and secrets
└── README.md                     # Documentation & setup guide
```

---

## 🛡️ Prototype & Financial Integrity Disclaimer

- **In-App Demo Balance**: Wallet balances and transactions are tracked in an immutable local SQLite ledger for prototype demonstration. It does not transfer real bank money unless an authorized UPI/payment gateway sandbox is explicitly configured.
- **Deposit Source**: Pilot deposit rules are producer-funded simulations adapted to Indian state PWM guidelines.
