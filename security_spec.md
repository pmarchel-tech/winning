# Security Specification for Streak

## 1. Data Invariants
- A Win must have a description (`text`) and be linked to a valid `userId`.
- A Win's `createdAt` must be a server-generated timestamp.
- Users can only read and write their own Wins, Tags, and Profiles.
- Tags must have a `name` starting with '#' (enforced by convention, but let's at least enforce string size).
- Profile data (like streak count) is managed by the user but should be locked to their ID.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Creating a Win with `userId` of another user.
2. **Resource Poisoning**: Win `text` with 1MB of junk data.
3. **Ghost Field**: Adding `isAdmin: true` to a UserProfile.
4. **Orphaned Win**: Creating a Win with a non-existent or malicious collection ID.
5. **Timestamp Fraud**: Providing a fake `createdAt` in the past.
6. **Tag Highjacking**: Updating someone else's Tag count.
7. **PII Leak**: Querying all UserProfiles without a `where` clause for `userId`.
8. **Immortality Breach**: Trying to change the `userId` of an existing Win.
9. **Bulk Deletion**: Trying to delete Wins in bulk without ownership check.
10. **ID Poisoning**: Creating a document with a 2KB long string as ID.
11. **State Shortcutting**: Manually increasing streak count without a new Win. (Hard to block client-side, but we can restrict updates).
12. **Blanket Read**: Authenticated user trying to `list` all `wins`.

## 3. The Test Runner
See `firestore.rules.test.ts` for implementation details (Simulated in rules logic).
