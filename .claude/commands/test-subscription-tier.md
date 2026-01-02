---
description: Create a comprehensive test plan for verifying feature behavior across all subscription tiers
---

Create a test plan for verifying feature behavior across Sparkboard's subscription tiers: Free, Pro, and Curago.

## Subscription Tier Details

| Plan | Workshops | Participants/Workshop | AI Features | Detection Method |
|------|-----------|----------------------|-------------|------------------|
| **Free** | 1 active max | 5 max | ❌ Blocked | Default (no Stripe subscription) |
| **Pro** | Unlimited | Unlimited | ✅ Enabled | Stripe subscription active |
| **Curago** | Unlimited | Unlimited | ✅ Enabled | Email ends with @curago.se |

## What to Test

Ask me what feature or functionality we're testing, then create a test plan covering:

1. **Free Plan Behavior**
   - What limits should be enforced?
   - What features should be blocked?
   - What error messages should users see?

2. **Pro Plan Behavior**
   - What restrictions are lifted?
   - What features become available?

3. **Curago Plan Behavior**
   - Same as Pro, plus auto-detection via @curago.se email

## Test Plan Template

### Feature: [Feature Name]

#### Test Case 1: Free Plan - Limit Enforcement

**Setup**:
- User with Free plan (no Stripe subscription)
- User email: test-free@example.com

**Test Steps**:
1. [Action to perform]
2. [Next action]

**Expected Behavior**:
- [ ] Limit enforced at X threshold
- [ ] Clear error message shown: "[Expected error message]"
- [ ] User prompted to upgrade
- [ ] No data corruption or partial operations

**Edge Cases**:
- [ ] What happens at exactly the limit? (e.g., 1st workshop vs 2nd)
- [ ] What happens if user tries to circumvent? (direct API call)
- [ ] What happens during concurrent operations?

---

#### Test Case 2: Pro Plan - Full Access

**Setup**:
- User with Pro plan (active Stripe subscription)
- User email: test-pro@example.com

**Test Steps**:
1. [Action to perform]
2. [Next action]

**Expected Behavior**:
- [ ] No limits enforced
- [ ] Feature fully functional
- [ ] No upgrade prompts shown

**Edge Cases**:
- [ ] What happens if subscription expires mid-session?
- [ ] What happens if user downgrades?

---

#### Test Case 3: Curago Plan - Auto-Detection

**Setup**:
- User with Curago plan (@curago.se email)
- User email: test@curago.se

**Test Steps**:
1. Create new user with @curago.se email via Clerk
2. Verify profile.plan is automatically set to 'curago'
3. [Action to perform]

**Expected Behavior**:
- [ ] Auto-detected as Curago plan (no Stripe needed)
- [ ] Same access as Pro plan
- [ ] No upgrade prompts shown

**Edge Cases**:
- [ ] What if user changes email away from @curago.se?
- [ ] What about subdomains like test@subdomain.curago.se?

---

#### Test Case 4: Cross-Tier Data Access

**Security Test**: Verify tenant isolation across plans

**Setup**:
- User A (Free plan): test-free@example.com
- User B (Pro plan): test-pro@example.com
- User C (Curago plan): test@curago.se

**Test Steps**:
1. User A creates [resource]
2. User B attempts to access User A's [resource]
3. User C attempts to access User A's [resource]

**Expected Behavior**:
- [ ] User B and C CANNOT access User A's data
- [ ] Each user only sees their own data
- [ ] No errors leaked about existence of other users' data

---

## Common Test Scenarios

### Workshop Creation Limits

**Free Plan**:
```typescript
// Test: Create 1st workshop (should succeed)
// Test: Create 2nd workshop (should fail with error)
const { data, error } = await invokeWithAuth('workshop-operations', {
  operation: 'create-workshop',
  name: 'Second Workshop'
});

// Expected: error = "Free plan limited to 1 active workshop. Upgrade to Pro for unlimited workshops."
```

**Pro/Curago Plan**:
```typescript
// Test: Create multiple workshops (should all succeed)
for (let i = 0; i < 5; i++) {
  const { error } = await invokeWithAuth('workshop-operations', {
    operation: 'create-workshop',
    name: `Workshop ${i + 1}`
  });
  // Expected: no errors
}
```

### Participant Limits

**Free Plan**:
```typescript
// Test: Add 5 participants (should succeed)
// Test: Add 6th participant (should fail)
const { data, error } = await invokeWithAuth('join-workshop', {
  workshop_id: workshopId,
  participant_name: 'Participant 6'
});

// Expected: error = "Free plan limited to 5 participants per workshop"
```

**Pro/Curago Plan**:
```typescript
// Test: Add 10+ participants (should all succeed)
```

### AI Features

**Free Plan**:
```typescript
// Test: Attempt to analyze notes (should fail)
const { data, error } = await invokeWithAuth('analyze-notes', {
  workshop_id: workshopId
});

// Expected: error = "AI features require Pro or Curago subscription"
```

**Pro/Curago Plan**:
```typescript
// Test: Analyze notes (should succeed)
const { data, error } = await invokeWithAuth('analyze-notes', {
  workshop_id: workshopId
});

// Expected: data contains AI analysis
```

### Subscription State Transitions

**Test: Free → Pro Upgrade**:
1. User starts with Free plan
2. User completes Stripe checkout
3. Webhook updates profile.plan to 'pro'
4. Verify limits immediately removed

**Test: Pro → Free Downgrade**:
1. User starts with Pro plan (3 active workshops)
2. Stripe subscription canceled
3. Webhook updates profile.plan to 'free'
4. Verify: User can still access 3 workshops (read-only?)
5. Verify: User CANNOT create 4th workshop

**Test: Email Change for Curago**:
1. User has test@curago.se (Curago plan)
2. User changes email to test@example.com
3. Verify: Plan should change to Free or require Pro subscription

## Manual Testing Checklist

For each feature/change, verify:

### Free Plan Testing
- [ ] Create test user with free@example.com
- [ ] Verify profile.plan = 'free'
- [ ] Test workshop creation limit (1 active)
- [ ] Test participant limit (5 per workshop)
- [ ] Test AI features blocked
- [ ] Verify upgrade prompts shown correctly
- [ ] Verify clear error messages

### Pro Plan Testing
- [ ] Create test user with pro@example.com
- [ ] Create Stripe test subscription
- [ ] Verify profile.plan = 'pro' after webhook
- [ ] Test unlimited workshop creation (create 5+)
- [ ] Test unlimited participants (add 10+)
- [ ] Test AI features accessible
- [ ] Verify no upgrade prompts

### Curago Plan Testing
- [ ] Create test user with test@curago.se
- [ ] Verify profile.plan = 'curago' (auto-set)
- [ ] Test same access as Pro plan
- [ ] Verify no Stripe subscription needed
- [ ] Test with subdomain email (@subdomain.curago.se)

### Security Testing
- [ ] Free user cannot access Pro user's workshops
- [ ] Pro user cannot access Curago user's workshops
- [ ] Direct API calls respect plan limits
- [ ] JWT tampering doesn't bypass limits
- [ ] Plan changes immediately enforced

### Edge Cases
- [ ] Exactly at limit (1 workshop for Free)
- [ ] Concurrent operations (2 users creating workshops simultaneously)
- [ ] Mid-session subscription change
- [ ] Invalid plan value in database
- [ ] Missing profile record

## Automated Testing (Future)

Consider writing automated tests:

```typescript
describe('Subscription Tier Limits', () => {
  describe('Free Plan', () => {
    it('should limit to 1 active workshop', async () => {
      const user = await createTestUser({ plan: 'free' });

      // Create 1st workshop - should succeed
      const workshop1 = await createWorkshop(user);
      expect(workshop1).toBeDefined();

      // Create 2nd workshop - should fail
      await expect(createWorkshop(user)).rejects.toThrow(
        'Free plan limited to 1 active workshop'
      );
    });

    it('should block AI features', async () => {
      const user = await createTestUser({ plan: 'free' });
      const workshop = await createWorkshop(user);

      await expect(analyzeNotes(user, workshop.id)).rejects.toThrow(
        'AI features require Pro or Curago subscription'
      );
    });
  });

  describe('Pro Plan', () => {
    it('should allow unlimited workshops', async () => {
      const user = await createTestUser({ plan: 'pro' });

      for (let i = 0; i < 5; i++) {
        const workshop = await createWorkshop(user);
        expect(workshop).toBeDefined();
      }
    });
  });

  describe('Curago Plan', () => {
    it('should auto-detect @curago.se email', async () => {
      const user = await createTestUser({ email: 'test@curago.se' });
      expect(user.profile.plan).toBe('curago');
    });
  });
});
```

## Reference Files

- **Subscription logic**: Edge Functions check profile.plan
- **Plan detection**: `/supabase/functions/clerk-webhook/index.ts`
- **Limit enforcement**: `/supabase/functions/workshop-operations/index.ts`
- **Frontend hooks**: `/src/hooks/useSubscription.ts`, `/src/hooks/useWorkshopLimit.ts`

## Reporting Issues

When reporting subscription-related bugs, include:
1. User plan (free/pro/curago)
2. Expected behavior
3. Actual behavior
4. Steps to reproduce
5. Edge Function logs (if available)
6. Sentry error ID (if error occurred)

Now tell me what feature to test, and I'll create a specific test plan!
