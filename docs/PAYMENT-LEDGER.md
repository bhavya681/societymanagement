# Payment Ledger

## Payment Recording

Only ADMIN/TREASURER can record payments. Residents cannot mark themselves as paid.

### Payment Record Structure

```json
{
  "societyId": "...",
  "residentId": "...",
  "flatId": "...",
  "billId": "...",
  "amount": 150000,
  "paymentDate": "2026-08-18T09:26:11.426Z",
  "paymentMethod": "UPI",
  "transactionId": "UPI123456",
  "notes": "Partial payment",
  "status": "SUCCESS",
  "recordedBy": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Payment Methods

- CASH
- UPI
- BANK_TRANSFER
- NEFT
- RTGS
- IMPS
- CHEQUE
- ONLINE
- OTHER

### Payment Types

#### Full Payment
- Amount equals remaining balance
- Bill status becomes PAID

#### Partial Payment
- Amount less than remaining balance
- Bill status becomes PARTIALLY_PAID or OVERDUE

#### Multiple Payments
- Multiple payments can be recorded against same bill
- `paidAmount` accumulates
- When total paid reaches totalAmount, status becomes PAID

## Validation Rules

Backend enforces:
- Amount > 0
- Amount <= remaining balance
- Bill exists and belongs to society
- Bill is not cancelled
- Bill is not already fully paid

## Payment Receipt

Each recorded payment generates a receipt view showing:
- Society name
- Resident name and flat
- Bill month
- Amount received
- Payment method
- Reference number
- Payment date
- Recorded by
- Remaining balance

## Audit Trail

Every payment is recorded in the audit log with:
- User who recorded it
- Timestamp
- Amount
- Bill
- Resident
- Payment method
- Reference

## No Double Counting

- Each payment is a separate MongoDB document
- `paidAmount` on bill is updated transactionally
- Dashboard calculates from Payment collection, not from `paidAmount`
- Cancelled payments (if ever implemented) would be excluded
