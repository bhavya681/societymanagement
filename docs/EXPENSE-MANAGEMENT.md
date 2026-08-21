# Expense Management

## Expense Categories

- electricity
- water
- security
- housekeeping
- repairs
- lift
- gardening
- plumbing
- painting
- insurance
- staff
- administrative
- other

## Expense Recording

Admin records actual expenses incurred by the society.

### Fields
- Title
- Category
- Description
- Amount (in rupees, stored as paise)
- Vendor
- Invoice number
- Expense date
- Payment method
- Status (PENDING, PAID, CANCELLED)

### Validation
- Amount must be positive
- Category must be from predefined list
- Expense date required

## Recurring Expenses

Admin can configure recurring expenses that repeat on a schedule.

### Frequencies
- DAILY
- WEEKLY
- MONTHLY
- QUARTERLY
- YEARLY

### Fields
- Title
- Category
- Expected amount
- Vendor reference
- Frequency
- Start date
- End date (optional)
- Next due date
- Payment method
- Status (ACTIVE, PAUSED, COMPLETED, CANCELLED)

### Important
- Expected amount != actual paid amount
- Both are tracked separately
- Actual expenses are recorded separately in Expense collection

## Vendor Management

Admin maintains a vendor database.

### Fields
- Name
- Category
- Contact person
- Phone
- Email
- Address
- GST number
- PAN number
- Services offered
- Payment terms
- Notes
- Status (ACTIVE, INACTIVE, BLACKLISTED)

### Usage
- Vendors can be referenced by expenses
- Vendor category helps in reporting
- Status controls whether vendor is active for new expenses

## Cash Flow

Cash flow is calculated from:
- Total collected (payments)
- Total other income (parking, hall booking, etc.)
- Total expenses

```
Net Cash Flow = Total Collected + Total Other Income - Total Expenses
Closing Balance = Opening Balance + Net Cash Flow
```

## Month Closing

Treasurer can close a month to lock financial records.

### Process
1. Treasurer reviews month
2. Clicks "Close month"
3. System snapshots financial totals
4. Status changes to CLOSED
5. Further modifications require reopening

### Reopen
- Only allowed if month is CLOSED
- Creates audit log entry
- Requires notes/reason
