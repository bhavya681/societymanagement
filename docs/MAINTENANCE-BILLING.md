# Maintenance Billing

## Bill Generation

Admin generates monthly bills for selected flats.

### Process

1. Admin selects month, year, and flats
2. System creates bills with:
   - `baseAmount` from society default or flat-specific rate
   - `additionalCharges` (itemized if provided)
   - `discount` (if applicable)
   - `dueDate` (default: 10th of month)
   - `status` = PENDING
3. System prevents duplicate bills for same flat/month/year

### Bill Structure

```json
{
  "billNumber": "MH-2026-00001",
  "societyId": "...",
  "flatId": "...",
  "residentId": "...",
  "billingMonth": 8,
  "billingYear": 2026,
  "billKind": "MAINTENANCE",
  "baseAmount": 350000,
  "additionalCharges": 0,
  "additionalChargeItems": [],
  "penalty": 0,
  "discount": 0,
  "totalAmount": 350000,
  "paidAmount": 0,
  "dueDate": "2026-08-10T18:29:59.000Z",
  "status": "PENDING",
  "notes": "Monthly maintenance 8/2026"
}
```

### Itemized Billing

A bill can contain multiple charge categories:

- Regular Maintenance
- Water
- Parking
- Repair Fund
- Sinking Fund
- Common Electricity
- Lift
- Other Charges

Each item has a label and amount.

### Rate Configuration

Admin can configure:
- Society default maintenance amount
- Flat-wise amounts
- Wing-wise amounts
- Additional charge templates

## Bill Status Updates

Status updates automatically when:
- Payment is recorded
- Penalty is applied
- Due date passes
- Admin manually updates

## Bill Cancellation

Admin can cancel a bill. Cancelled bills:
- Are excluded from financial totals
- Cannot have payments recorded against them
- Remain in database for historical reporting
