# User Roles

## Supported Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| SUPER_ADMIN | Platform administrator | All societies, all features |
| SOCIETY_ADMIN | Society administrator | Full society management |
| TREASURER | Financial manager | Billing, payments, expenses, reports |
| SECRETARY | Administrative manager | Residents, announcements, requests |
| RESIDENT | Flat occupant | Own data only |
| COMMITTEE_MEMBER | Committee member | Read-only reports and oversight |
| STAFF | Maintenance staff | Assigned requests only |

## Permissions Matrix

### SUPER_ADMIN
- Manage all societies
- Manage all users
- System configuration

### SOCIETY_ADMIN
- Manage society settings
- Manage buildings and flats
- Manage residents
- Generate bills
- Record payments
- Manage expenses
- Manage vendors
- Configure recurring expenses
- Record income
- View all reports
- Close months
- Publish announcements
- Manage documents
- View audit log

### TREASURER
- Generate bills
- Record payments
- Manage expenses
- Manage vendors
- Configure recurring expenses
- Record income
- View financial reports
- View cash flow
- View aging report
- Close months
- View resident ledger

### SECRETARY
- Manage residents
- Publish announcements
- Manage maintenance requests
- Manage documents
- View resident directory
- View basic reports

### RESIDENT
- View own dashboard
- View own bills
- View own payment history
- View own ledger
- Submit maintenance requests
- View announcements
- View documents
- Update own profile

### COMMITTEE_MEMBER
- View dashboard
- View reports
- View announcements
- View requests

### STAFF
- View assigned requests
- Update request status

## Implementation

Backend enforces permissions via middleware:

- `requireAdmin` - ADMIN, SECRETARY, CHAIRMAN, ACCOUNTANT, COMMITTEE, SOCIETY_ADMIN, TREASURER, SUPER_ADMIN
- `requireTreasurerOrAbove` - ADMIN, SOCIETY_ADMIN, TREASURER, ACCOUNTANT, SUPER_ADMIN
- `requireSecretaryOrAbove` - ADMIN, SOCIETY_ADMIN, SECRETARY, CHAIRMAN, SUPER_ADMIN
- `requireRoles(...roles)` - Exact role match

Frontend hides buttons based on role, but backend always enforces.
