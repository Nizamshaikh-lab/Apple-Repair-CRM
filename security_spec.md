# security_spec.md

## 1. Data Invariants
- **Repairs**:
  - `trackingId` must be unique and immutable after creation.
  - `createdAt` is immutable and must be server set.
  - `status` can only transition through allowed states.
- **Inventory**:
  - `quantity` cannot be negative.
  - `updatedAt` must be server set.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Attempt to create a repair job without signing in.
2. **Identity Spoofing**: Attempt to create a repair job where `customerName` is missing but `customerPhone` is valid.
3. **Immutability Breach**: Attempt to update the `createdAt` timestamp.
4. **ID Poisoning**: Use a 1MB string as a document ID.
5. **State Shortcut**: Update a repair status from `pickdrop` to `delivered` skipping `repair` and `completed`.
6. **Negative Inventory**: Set inventory `quantity` to -10.
7. **Phantom Fields**: Add `isVerified: true` to a repair job to bypass payments.
8. **Owner Hijack**: Change the `trackingId` of an existing job.
9. **Blanket Read**: Authenticated user trying to read ALL repairs without a specific query (if we had private repairs, but here it's staff-only).
10. **Type Mismatch**: Sending a string for `quotationAmount`.
11. **Resource Exhaustion**: Sending a 5MB string in the `description` field.
12. **Timestamp Fraud**: Providing a client-side date for `updatedAt` instead of server timestamp.

## 3. Test Plan
We will verify that these payloads result in `PERMISSION_DENIED` using the security rules.
