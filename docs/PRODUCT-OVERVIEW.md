# Product Overview

## What is Society Maintenance Hub?

Society Maintenance Hub is a complete digital office for Indian residential housing societies. It replaces manual systems such as:

- Paper maintenance registers
- Excel sheets for billing and collections
- WhatsApp-based notices
- Manual expense registers
- Manual outstanding calculations
- Paper receipts

## Target Users

### Admin / Treasurer / Secretary
- Generate monthly maintenance bills
- Record payments received
- Manage expenses and vendors
- Track outstanding dues
- Configure penalty rules
- View financial reports
- Manage residents, flats, and buildings
- Publish announcements
- Track maintenance requests

### Resident
- View current and past bills
- See outstanding amount and penalty
- View payment history
- Submit maintenance requests
- Read announcements
- Update profile

## Key Features

1. **Society Management** - Buildings, flats, residents
2. **Monthly Billing** - Automated bill generation with itemized charges
3. **Payment Recording** - Admin records actual payments received
4. **Penalty Engine** - Configurable late payment penalties (fixed, percentage, per-day)
5. **Expense Management** - Track all society expenses with categories
6. **Vendor Management** - Maintain vendor database
7. **Recurring Expenses** - Scheduled expenses with automatic tracking
8. **Income Tracking** - Other income sources (parking, hall booking, etc.)
9. **Cash Flow** - Real-time cash flow calculation
10. **Aging Report** - Outstanding dues by age (0-30, 31-60, 61-90, 90+ days)
11. **Month Closing** - Lock months with audit trail
12. **Maintenance Requests** - Complaint tracking with status updates
13. **Announcements** - Society notices with expiry
14. **Documents** - Society documents library
15. **Audit Log** - Complete audit trail for all financial actions
16. **Reports** - Financial, maintenance, expense, and resident reports
17. **Responsive UI** - Works on mobile, tablet, and desktop

## Architecture

- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT with httpOnly cookies

## Society Isolation

Every record (bill, payment, expense, etc.) belongs to a society. Backend enforces `societyId` on every query. Users from Society A can never access Society B data.

## Financial Integrity

- All calculations happen server-side
- Frontend never trusts financial values
- MongoDB transactions ensure payment + bill update consistency
- Individual payment records maintained (no overwriting)
- Cancelled bills excluded from totals
- Penalty calculated deterministically based on bill, due date, payment date, and society config

## Currency

All amounts use Indian Rupee formatting: ₹1,25,000
