# Sparkboard Security Documentation

## Authentication & Authorization

### Authentication Provider
Sparkboard uses **Clerk** for authentication. All users must authenticate via Clerk to access protected features.

### User Types & Access Levels

#### 1. Free Users
- **Plan**: `free`
- **Limits**:
  - 1 active workshop maximum
  - 5 participants per workshop
- **Features**: Basic workshop creation and management

#### 2. Pro Users
- **Plan**: `pro`
- **Plan Source**: `stripe`
- **Limits**:
  - Unlimited workshops
  - Unlimited participants
- **Features**: Full access to all features

#### 3. Curago Enterprise Users
- **Plan**: `curago`
- **Plan Source**: `curago_domain`
- **Detection**: Automatic via email domain (`@curago.se`)
- **Limits**:
  - Unlimited workshops
  - Unlimited participants
- **Features**: Full enterprise access (equivalent to Pro)

### Email Domain Detection

Users with `@curago.se` email addresses automatically receive enterprise access:

1. **During signup** (Clerk webhook): Profile created with `plan: 'curago'`
2. **During login** (check-subscription): Plan verified and updated if needed
3. **Profile creation** (useProfile): Automatic detection on first profile creation

## Row Level Security (RLS)

### Security Model
All database tables use Row Level Security with **tenant isolation**:

- Each workshop is owned by exactly one facilitator (Clerk user)
- Users can only access their own workshops and related data
- Participants can create notes but only in workshops they've joined
- All policies use `auth.uid()` for verification

### RLS Policies by Table

#### Workshops
```sql
-- Users can only view/manage their own workshops
SELECT: auth.uid()::text = facilitator_id
INSERT: auth.uid()::text = facilitator_id
UPDATE: auth.uid()::text = facilitator_id
DELETE: auth.uid()::text = facilitator_id
```

#### Boards, Questions, AI Analyses
- Only accessible to workshop owner
- Verified through workshop ownership chain

#### Notes
- Workshop owners can view all notes
- Anyone can create notes (for participants)
- Users can only update their own notes
- Workshop owners can delete notes

#### Participants
- Workshop owners can view and manage
- Anyone can join (for participant access)

#### Profiles
- Users can only view/update their own profile
- Prevents unauthorized subscription changes

### Participant Limit Enforcement

A database trigger enforces participant limits:

```sql
-- Free plan: Maximum 5 participants
-- Pro/Curago: Unlimited participants
```

The trigger runs BEFORE INSERT on participants table and raises an error if the limit is exceeded.

## Security Features

### ✅ Implemented
- ✅ Clerk authentication for all protected routes
- ✅ Row Level Security on all tables
- ✅ Tenant isolation (facilitators can't access each other's data)
- ✅ Automatic @curago.se enterprise access
- ✅ Participant limit enforcement via database trigger
- ✅ Subscription-based feature gating
- ✅ Secure Stripe integration via Edge Functions

### 🔒 Best Practices
- All database queries automatically filtered by RLS
- Service role key only used in Edge Functions (server-side)
- Clerk JWT tokens used for authentication
- No sensitive data in localStorage
- HTTPS/TLS encryption for all connections

## Subscription Management

### Stripe Integration
- Checkout sessions created via `/create-checkout` Edge Function
- Subscription status synced via `/check-subscription` Edge Function
- Webhook updates handled by `/clerk-webhook` Edge Function

### Plan Hierarchy
```
free < pro = curago
```

Where:
- `free`: Limited features
- `pro`: Full features (paid via Stripe)
- `curago`: Full features (automatic for @curago.se)

## Migration Notes

### Version: 20251230000000
This migration implements secure RLS policies:

1. Drops all insecure `USING (true)` policies
2. Removes deprecated facilitator PIN authentication system
3. Implements proper tenant isolation
4. Adds participant limit trigger
5. All policies use Clerk `auth.uid()` for verification

### Removed Features
- ❌ PIN-based facilitator authentication
- ❌ localStorage session management
- ❌ Facilitators table
- ❌ Facilitator sessions table

These were replaced with Clerk authentication for better security.

## Testing Security

### Verify @curago.se Access
1. Create user with `@curago.se` email
2. Check profile: `plan` should be `'curago'`
3. Check `plan_source` should be `'curago_domain'`
4. Verify unlimited workshop creation

### Verify Tenant Isolation
1. Create workshop as User A
2. Try to access as User B
3. Should fail (RLS blocks access)

### Verify Participant Limits
1. Create workshop as Free user
2. Add 5 participants (should succeed)
3. Try to add 6th participant (should fail with error)
4. Upgrade to Pro/Curago
5. Should allow unlimited participants

## Support

For security concerns or questions, contact: par.levander@curago.se
