import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { subscriptionCheckoutIntentKey } from '@/lib/subscriptions/checkout-claim';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const checkout = source('app/api/subscriptions/checkout/route.ts');
const helper = source('lib/subscriptions/checkout-claim.ts');

describe('subscription checkout atomic claim', () => {
  it('scopes the claim intent by the configured plan price', () => {
    expect(subscriptionCheckoutIntentKey('price_fixture_monthly')).toBe(
      'subscription:price_fixture_monthly',
    );
  });

  it('acquires the database claim before creating a Stripe Checkout Session', () => {
    const claimIndex = checkout.indexOf('await claimSubscriptionCheckout');
    const stripeIndex = checkout.indexOf('stripe.checkout.sessions.create');

    expect(claimIndex).toBeGreaterThan(-1);
    expect(stripeIndex).toBeGreaterThan(-1);
    expect(claimIndex).toBeLessThan(stripeIndex);
  });

  it('reuses the exact existing Stripe session while the winning claim remains open', () => {
    expect(checkout).toContain("claim.state === 'open'");
    expect(checkout).toContain('stripe.checkout.sessions.retrieve(claim.stripeSessionId)');
    expect(checkout).toContain("existingSession.status === 'open'");
    expect(checkout).toContain('reused: true');
  });

  it('reconciles completed or expired Stripe sessions before allowing a retry', () => {
    expect(checkout).toContain("existingSession.status === 'expired' || existingSession.status === 'complete'");
    expect(checkout).toContain("existingSession.status === 'complete' ? 'completed' : 'expired'");
    expect(checkout).toContain("code: existingSession.status === 'complete' ? 'checkout_completed' : 'checkout_retry'");
  });

  it('expires or quarantines the claim when checkout persistence fails', () => {
    const persistenceFailure = checkout.indexOf('if (persistError)');
    const expireClaim = checkout.indexOf('await expireSubscriptionCheckoutClaim', persistenceFailure);
    const manualReview = checkout.indexOf('await flagSubscriptionCheckoutClaimReview', persistenceFailure);

    expect(persistenceFailure).toBeGreaterThan(-1);
    expect(expireClaim).toBeGreaterThan(persistenceFailure);
    expect(manualReview).toBeGreaterThan(expireClaim);
    expect(checkout).toContain('checkout_persistence_failed_and_stripe_expire_failed');
  });

  it('fails closed when the claim cannot be finalized after Stripe creation', () => {
    expect(checkout).toContain('await finalizeSubscriptionCheckoutClaim');
    expect(checkout).toContain('claim_finalize_failed_session_may_be_open');
    expect(checkout).toContain("code: 'checkout_manual_review'");
  });

  it('uses only the reviewed server-side RPC lifecycle', () => {
    expect(helper).toContain("admin.rpc('claim_subscription_checkout'");
    expect(helper).toContain("admin.rpc('finalize_subscription_checkout_claim'");
    expect(helper).toContain("admin.rpc('expire_subscription_checkout_claim'");
    expect(helper).toContain("admin.rpc('flag_subscription_checkout_claim_review'");
    expect(helper).not.toContain('.from(\'subscription_checkout_claims\')');
  });
});
