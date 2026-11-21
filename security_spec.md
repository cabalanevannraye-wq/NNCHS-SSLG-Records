# Security Specification — SSLG Digital Records & Transmittal System

## 1. Data Invariants

1. **Zero Unauthenticated Access**: Every collection (`admins`, `invites`, `user_directory`, `user_private`, `contributor_stats`, `settings`, `documents`) denies all reads and writes unless `request.auth != null && request.auth.token.email_verified == true`.
2. **No Self-Assigned Roles**: A user cannot create `user_directory/{uid}` or `user_private/{uid}` with `role: 'admin'` or `role: 'officer'` (or any unauthorized account) unless they are the bootstrapped Admin (`cabalan.evann.raye@gmail.com`), an existing Admin, or hold an active matching document in `invites/{inviteId}` whose `email == request.auth.token.email` and `role == incoming().role`.
3. **PII Isolation**: User email addresses exist ONLY in `user_private/{uid}` (readable strictly by `uid == request.auth.uid` or `isAdmin()`) and `invites/{inviteId}` (readable strictly by the invitee matching `email == request.auth.token.email` or `isAdmin()`). `user_directory/{uid}` and `contributor_stats/{uid}` contain zero PII.
4. **Document Isolation for Clubs**: School Club accounts (`role == 'organization'`) can only `get`, `list`, `create`, and stage-advance (`Mark Printed` / `Upload Hardcopy Scan`) their own documents (`submittedByUserId == request.auth.uid`). They can never list or read another club's documents, e-sign documents, or edit `controlNumber`.
5. **Terminal Stage 5 Lock**: Once a document reaches `currentStage == 5` (Completed & Archived), non-admin updates are permanently blocked.
6. **Temporal Integrity & Strict Schema Keys**: All `create` and `update` operations enforce `createdAt == request.time`, `updatedAt == request.time`, `isValidId()`, exact required/allowed key sets (`hasAll` / `hasOnly`), `affectedKeys().hasOnly(...)` per action, and bounded string/list sizes.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Email Token (`email_verified: false`)** — Attempt to read or write `documents` with matching admin email but `email_verified: false`. Expected: `PERMISSION_DENIED`.
2. **Self-Assigned Admin Privilege Escalation** — Non-admin user creates `/user_directory/{uid}` or `/user_private/{uid}` with `role: 'admin'` without an Admin invite. Expected: `PERMISSION_DENIED`.
3. **Ghost / Shadow Field Injection** — User creates `/documents/{docId}` with valid fields plus `"isApprovedBypass": true`. Expected: `PERMISSION_DENIED` (`hasOnly` rejection).
4. **ID Poisoning (Oversized Path Variable)** — Attempt to create `/documents/{150-char-id}` or `/documents/bad$id`. Expected: `PERMISSION_DENIED` (`isValidId` rejection).
5. **Cross-Tenant PII Read** — Club user attempts `get` or `list` on `/user_private/{otherUid}`. Expected: `PERMISSION_DENIED`.
6. **Cross-Club Document Scraping (`list`)** — Club user runs `list` on `/documents` without `submittedByUserId == request.auth.uid`. Expected: `PERMISSION_DENIED`.
7. **Unauthorized E-Signature by Club** — Club user attempts `update` on `/documents/{docId}` changing `currentStage: 1 -> 3`, `controlNumber`, or `signatures`. Expected: `PERMISSION_DENIED`.
8. **Client-Spoofed Timestamp** — User submits `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. Expected: `PERMISSION_DENIED`.
9. **Immutable Owner Tampering** — User updates `/documents/{docId}` attempting to rewrite `submittedByUserId` or `docType`. Expected: `PERMISSION_DENIED`.
10. **Terminal Stage 5 Overwrite** — Non-admin officer attempts to update `title` or revert `currentStage` on a Stage 5 archived document. Expected: `PERMISSION_DENIED`.
11. **Unbounded Array / Resource Exhaustion** — Attempt to write `transmittalHistory` with > 25 items or `title` > 240 chars or `avatarDataUrl` > 300KB. Expected: `PERMISSION_DENIED`.
12. **Settings Prefix Tampering by Non-Admin** — Officer or Club attempts to overwrite `generalPrefix` or `organizationHeader` on `/settings/global`. Expected: `PERMISSION_DENIED`.
