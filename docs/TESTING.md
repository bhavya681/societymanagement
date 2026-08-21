# Testing

## Automated Tests

### Backend Tests
```bash
cd backend && npm test
```

**Test Files:**
- `src/tests/api.test.ts` - 13 tests
- `src/tests/billing.test.ts` - 6 tests

**Total: 19/19 passing**

### Frontend Build
```bash
cd frontend && npm run build
```

Builds successfully with no TypeScript errors.

## Manual API Verification

### Health Check
```bash
curl http://localhost:5000/api/health
```
Expected: `{"success": true, "server": "ok", "database": "connected"}`

### Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```
Expected: Returns JWT token

### Generate Bills
```bash
curl -X POST http://localhost:5000/api/bills/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"billingMonth":8,"billingYear":2026,"dueDate":"2026-08-10","baseAmount":2500}'
```
Expected: Bills created for selected flats

### Record Payment
```bash
curl -X POST http://localhost:5000/api/bills/<billId>/payment \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":1500,"paymentMethod":"UPI","transactionId":"UPI123"}'
```
Expected: Payment recorded, bill status updated

### Dashboard
```bash
curl http://localhost:5000/api/dashboard/admin \
  -H "Authorization: Bearer <token>"
```
Expected: Financial totals, recent payments, bill stats

### Reports
```bash
curl http://localhost:5000/api/reports/financial \
  -H "Authorization: Bearer <token>"
```
Expected: Financial summary with totals in rupees

### Cash Flow
```bash
curl http://localhost:5000/api/reports/cash-flow \
  -H "Authorization: Bearer <token>"
```
Expected: Cash flow with collected, expenses, net

### Aging
```bash
curl http://localhost:5000/api/reports/aging \
  -H "Authorization: Bearer <token>"
```
Expected: Aging buckets with outstanding amounts

## End-to-End Workflow

1. **Admin Login** → Success
2. **Generate Bills** → Bills created
3. **Record Partial Payment** → Bill status PARTIALLY_PAID
4. **Record Second Payment** → Bill status PAID
5. **Late Payment** → Penalty applied deterministically
6. **Resident Dashboard** → Shows correct outstanding
7. **Reports** → All values consistent
8. **Month Closing** → Snapshot created
9. **Cash Flow** → Correct calculation
10. **Aging Report** → Correct buckets

## Seed Data

```bash
cd backend && npm run seed
```

Creates:
- 1 society (Sunrise Residency)
- 2 buildings (A Wing, B Wing)
- 9 flats (1 vacant)
- 8 residents
- 1 admin
- 1 staff
- 32 maintenance bills (May-August 2026)
- 24 payments (seed payments)
- 5 expenses
- 2 maintenance requests
- 3 announcements
- 2 documents

## Known Limitations

1. Payment reversal not implemented (audit log exists)
2. Duplicate payment reference not enforced at DB level
3. Online payment gateway not integrated
4. Email/SMS notifications not implemented
