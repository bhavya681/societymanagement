# Test Matrix

## Authentication

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Auth | Valid login | 200 + token | ✅ | - |
| Auth | Invalid credentials | 401 | ✅ | - |
| Auth | Register new user | 201 + token | ✅ | - |
| Auth | Duplicate email | 409 | ✅ | - |
| Auth | Get current user | 200 | ✅ | - |
| Auth | Logout | 200 | ✅ | - |
| Auth | Unauthorized access | 401 | ✅ | - |
| Auth | Inactive account | 403 | ✅ | - |

## Authorization

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Auth | Resident access admin dashboard | 403 | ✅ | - |
| Auth | Admin access resident routes | Redirect | ✅ | - |
| Auth | Cross-society bill access | 404 | ✅ | - |
| Auth | Resident view another resident's bill | 404 | ✅ | - |

## Residents

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Residents | List residents | 200 + paginated | ✅ | - |
| Residents | Create resident | 201 | ✅ | Password required fix |
| Residents | Update resident | 200 | ✅ | - |
| Residents | Update resident status | 200 | ✅ | - |
| Residents | Reset password | 200 | ✅ | - |
| Residents | Search residents | Filtered results | ✅ | - |
| Residents | Privacy filter | Email/phone hidden | ✅ | - |

## Bills

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Bills | Generate monthly bills | 201 + created count | ✅ | - |
| Bills | Duplicate bill protection | Skipped | ✅ | - |
| Bills | Update bill | 200 | ✅ | - |
| Bills | Record payment | 201 | ✅ | - |
| Bills | Overpayment rejection | 400 | ✅ | - |
| Bills | Cancel bill | 200 | ✅ | - |
| Bills | Resident view own bills | 200 | ✅ | - |
| Bills | Resident view another's bill | 404 | ✅ | - |

## Payments

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Payments | List payments | 200 | ✅ | - |
| Payments | Record payment | 201 | ✅ | - |
| Payments | Payment updates bill status | Status changes | ✅ | - |
| Payments | Partial payment | PARTIALLY_PAID | ✅ | - |
| Payments | Full payment | PAID | ✅ | - |

## Expenses

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Expenses | List expenses | 200 | ✅ | - |
| Expenses | Create expense | 201 | ✅ | - |
| Expenses | Update expense | 200 | ✅ | - |
| Expenses | Delete expense | 200 | ✅ | - |
| Expenses | Filter by category | Filtered | ✅ | - |

## Maintenance Requests

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Requests | Create request | 201 | ✅ | - |
| Requests | List requests | 200 | ✅ | - |
| Requests | Update status | 200 | ✅ | - |
| Requests | Add comment | 201 | ✅ | - |
| Requests | Assign request | 200 | ✅ | - |
| Requests | Internal notes | Hidden from resident | ✅ | - |
| Requests | Activity timeline | Populated | ✅ | - |

## Announcements

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Announcements | Create announcement | 201 | ✅ | - |
| Announcements | List published | Filtered | ✅ | - |
| Announcements | Mark as read | 200 | ✅ | - |
| Announcements | Unread count | Correct | ✅ | - |
| Announcements | Expiry filter | Hidden after expiry | ✅ | - |

## Reports

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Reports | Financial summary | Correct totals | ✅ | Fixed cancelled bill exclusion |
| Reports | Monthly collection | Correct by month | ✅ | Fixed cancelled bill exclusion |
| Reports | Expenses by category | Grouped | ✅ | - |
| Reports | Maintenance collection | Monthly breakdown | ✅ | - |
| Reports | Resident payment report | Per resident | ✅ | - |
| Reports | Request volume | Status counts | ✅ | - |

## Responsive UI

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| UI | 320px width | Usable | ✅ | - |
| UI | 375px width | Usable | ✅ | - |
| UI | 768px tablet | Usable | ✅ | - |
| UI | 1024px tablet | Usable | ✅ | - |
| UI | 1440px desktop | Usable | ✅ | - |
| UI | 1920px desktop | Usable | ✅ | - |
| UI | Mobile sidebar | Works | ✅ | - |
| UI | Mobile tables | Card layout | ✅ | - |
| UI | Loading states | Skeleton/spinner | ✅ | Blank screen fix |
| UI | Empty states | Meaningful | ✅ | - |
| UI | Error states | User-friendly | ✅ | - |

## Security

| Area | Scenario | Expected | Result | Fixed |
| ---- | -------- | -------- | ------ | ----- |
| Security | Password hashing | bcrypt 12 rounds | ✅ | - |
| Security | JWT expiration | Configurable | ✅ | - |
| Security | Logout clears token | localStorage cleared | ✅ | Fixed |
| Security | 401 auto-logout | Redirect to login | ✅ | Fixed |
| Security | Mass assignment blocked | Whitelisted fields | ✅ | Fixed |
| Security | Default password removed | Required field | ✅ | Fixed |
| Security | CORS configured | CLIENT_URL only | ✅ | - |
| Security | Helmet enabled | Security headers | ✅ | - |
| Security | Rate limiting | Auth endpoints | ✅ | - |
