# Product Gaps Analysis

## P0 — Essential (Blocking Production Use)

1. **Payment Gateway Integration**
   - Current: Manual payment recording (cash/UPI reference)
   - Needed: Razorpay/Stripe for online payments
   - Impact: Residents cannot pay online; admin must manually reconcile

2. **Email/SMS Notifications**
   - Current: No automated notifications
   - Needed: Bill generation, payment confirmation, overdue alerts, announcements
   - Impact: Residents may miss due dates; manual follow-up required

3. **Receipt/Invoice Generation**
   - Current: No PDF receipts
   - Needed: Payment receipts, bill invoices
   - Impact: No proof of payment for residents

## P1 — Important (Expected in Society Management)

4. **Visitor Management**
   - Current: None
   - Needed: Pre-approval, entry logging, security notification
   - Impact: Security gap for societies

5. **Staff Management**
   - Current: Only MAINTENANCE_STAFF role exists
   - Needed: Dedicated staff module, attendance, assignments
   - Impact: Cannot manage security, housekeeping staff

6. **Document Management**
   - Current: External URL references only
   - Needed: Actual file upload to S3/Cloudinary
   - Impact: Documents not self-hosted

7. **Real-time Updates**
   - Current: Polling via TanStack Query
   - Needed: WebSocket for live status updates
   - Impact: Delayed status visibility

## P2 — Useful Later

8. **Parking Management**
   - Current: `parkingSpaces` field on flat
   - Needed: Vehicle registration, allocation, visitor parking
   - Impact: Basic parking tracking only

9. **Utility Management**
   - Current: None
   - Needed: Meter readings, sub-meter billing
   - Impact: Cannot bill for electricity/water separately

10. **Recurring Expenses**
    - Current: One-time expenses only
    - Needed: Monthly recurring expense templates
    - Impact: Manual entry for same expenses every month

11. **Complaint Escalation**
    - Current: Manual status updates
    - Needed: Auto-escalation after SLA, reminders
    - Impact: Requests may stall without manual follow-up

## P3 — Future/Optional

12. **Voting/Polls**
    - Current: None
    - Needed: AGM voting, opinion polls
    - Impact: Cannot conduct digital voting

13. **Mobile App**
    - Current: Web only
    - Needed: React Native / Flutter app
    - Impact: Lower mobile engagement

14. **Multi-language**
    - Current: English only
    - Needed: Regional language support
    - Impact: Limited accessibility for non-English speakers

15. **Advanced Analytics**
    - Current: Basic charts
    - Needed: Predictive analytics, trend analysis
    - Impact: Limited insights for committees

## Out of Scope (Intentionally Not Implemented)

- **Full accounting** — Society-specific, not general-purpose
- **Bank integration** — Requires regulatory compliance
- **Biometric access** — Hardware-dependent
- **CCTV integration** — Hardware-dependent
