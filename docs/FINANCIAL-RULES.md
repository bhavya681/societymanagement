# Financial Rules

## Currency

All monetary values are stored in **paise** (1 INR = 100 paise) in MongoDB. The backend converts to/from rupees for API responses using `paiseToRupees` and `rupeesToPaise` utilities.

Frontend displays amounts using `formatINR` which formats as `₹1,25,000`.

## Bill Calculation

```
grossAmount = baseAmount + additionalCharges
amountDue = grossAmount + penalty - discount
amountRemaining = amountDue - totalSuccessfulPayments
```

All calculations happen server-side. Frontend values are never trusted.

## Payment Recording

1. Admin selects resident and outstanding bill
2. Admin enters amount received, payment method, reference, date
3. Backend validates:
   - Amount > 0
   - Amount <= remaining balance
   - Bill exists and belongs to society
   - Bill is not cancelled or already paid
4. Backend creates Payment record
5. Backend updates bill.paidAmount
6. Backend recalculates bill status
7. Backend applies penalty if due
8. Dashboard and reports update automatically

## Penalty Rules

Penalty is calculated deterministically. Opening the dashboard NEVER creates additional penalties.

### Configuration (Society-level)

```json
{
  "type": "FIXED" | "PERCENTAGE" | "PER_DAY",
  "fixedPenalty": 10000,
  "percentage": 2,
  "gracePeriodDays": 10,
  "maxPenalty": 50000,
  "autoApply": true
}
```

### Calculation

1. If bill is PAID or CANCELLED → no penalty
2. If autoApply is false → no penalty
3. If penalty already applied (> 0) → no additional penalty
4. If within grace period → no penalty
5. Otherwise:
   - FIXED: `min(fixedPenalty, maxPenalty)`
   - PERCENTAGE: `min(round(baseAmount * percentage / 100), maxPenalty)`
   - PER_DAY: `min(lateDays * fixedPenalty, maxPenalty)`

### Payment Date Matters

For completed payments, penalty is calculated based on the actual payment date, not current date.

## Status Logic

| Condition | Status |
|-----------|--------|
| paidAmount >= totalAmount | PAID |
| paidAmount > 0 AND paidAmount < totalAmount AND overdue | OVERDUE |
| paidAmount > 0 AND paidAmount < totalAmount AND not overdue | PARTIALLY_PAID |
| paidAmount = 0 AND overdue | OVERDUE |
| paidAmount = 0 AND not overdue | PENDING |
| status = CANCELLED | CANCELLED |

## No Double Counting

- Payments are individual records, never overwritten
- Bill `paidAmount` is updated transactionally with payment creation
- `financialSummary` sums from Payment collection for collected amount
- `financialSummary` sums from Bill collection for billed amount
- Cancelled bills excluded from totals
- Cancelled bill payments excluded via `billId: { $nin: cancelledBillIds }`
- All queries enforce `societyId`

## Month Closing

When a month is closed:
- Financial totals are snapshot'd
- Status is set to CLOSED
- Subsequent modifications require reopening
- Audit log records the action

## Audit Trail

Every financial action creates an audit log entry:
- Payment recorded
- Bill updated
- Expense created/modified/deleted
- Month closed/reopened
- Vendor created/modified/deleted
- Income recorded

Audit log records:
- User
- Action
- Date/time
- Entity
- Entity ID
- Metadata
