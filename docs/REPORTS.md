# Reports

## Available Reports

### Financial Summary
- Total billed
- Total collected
- Total outstanding
- Total penalties
- Total expenses
- Collection percentage
- Net cash flow

### Monthly Collection
- Month-wise collection vs expenses
- Trend analysis

### Expense Report
- Expenses by category
- Vendor-wise expenses
- Date range filtering

### Request Report
- Total requests
- Open, in-progress, resolved, closed counts
- Average resolution time

### Resident Payment Report
- Resident-wise billing and payment summary
- Outstanding per resident

### Cash Flow
- Total collected
- Total other income
- Total expenses
- Net cash flow
- Opening/closing balance

### Aging Report
- Outstanding by age bucket
  - 0-30 days
  - 31-60 days
  - 61-90 days
  - 90+ days
- Count and amount per bucket
- Total outstanding

## Implementation

All reports use MongoDB aggregation pipelines for server-side calculation. Large datasets are not downloaded to the browser.

### Financial Summary Query
```javascript
{
  $match: { societyId: sid, status: { $ne: "CANCELLED" } }
},
{
  $group: {
    _id: null,
    totalBilled: { $sum: "$totalAmount" },
    totalPaid: { $sum: "$paidAmount" },
    penalties: { $sum: "$penalty" }
  }
}
```

### Collection Query
```javascript
{
  $match: { societyId: sid, status: "SUCCESS", billId: { $nin: cancelledBillIds } }
},
{
  $group: { _id: null, total: { $sum: "$amount" } }
}
```

## CSV Export

Admin can export payment and expense data as CSV. Export uses the same filtered queries as the UI.

## Date Filtering

Most reports support `from` and `to` date parameters for filtering.

## Access Control

- Financial reports: TREASURER or above
- Request reports: SECRETARY or above
- Resident reports: ADMIN or above
- Dashboard: Role-specific
