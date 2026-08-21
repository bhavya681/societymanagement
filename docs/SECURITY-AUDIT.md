# Security Audit

## Authentication
- **JWT with bcrypt**: Passwords hashed with 12 rounds. ✅
- **Token expiration**: Configurable via `JWT_EXPIRES_IN`. ✅
- **httpOnly cookies**: Backend sets cookies, frontend uses Bearer tokens. ⚠️ Inconsistent.
- **Session persistence**: `refreshUser` on mount. ✅

## Authorization
- **Role-based middleware**: `requireAdmin`, `isAdminLike`. ✅
- **Society isolation**: All queries scoped by `societyId`. ✅
- **Resident scope**: `assertResidentOwn` prevents cross-resident access. ✅
- **Protected routes**: Frontend `ProtectedRoute` + backend middleware. ✅

## Input Validation
- **Zod schemas**: All endpoints validated. ✅
- **SQL/NoSQL injection**: Mongoose parameterized queries. ✅
- **XSS**: Frontend renders text content, no raw HTML injection. ✅

## Data Exposure
- **passwordHash**: Excluded from JSON via `toJSON` transform. ✅
- **Sensitive fields**: `__v`, `passwordHash` stripped. ✅
- **Error messages**: Generic in production, detailed in dev. ✅

## Fixed Issues
1. **Logout token persistence**: Frontend now clears localStorage on logout. ✅
2. **401 auto-logout**: API client clears token on 401/403. ✅
3. **Mass assignment**: `updateAnnouncement` whitelists fields. ✅
4. **Default passwords**: `createResident` requires explicit password. ✅

## Recommendations
1. Migrate frontend to httpOnly cookies exclusively
2. Add CSRF tokens
3. Add account lockout after 5 failed login attempts
4. Rotate `JWT_SECRET` periodically
5. Enable MongoDB encryption at rest
6. Add rate limiting on all endpoints, not just auth
