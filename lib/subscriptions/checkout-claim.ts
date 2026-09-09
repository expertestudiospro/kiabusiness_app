import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

type ClaimState = 'claimed' | 'open' | 'completed' | 'expired' | 'manual_review' | 'retry' | string;

export type SubscriptionCheckoutClaim = {
  acquired: boolean;
  claimId: string | null;
  state: ClaimState;
  stripeSessionId: string | null;
};

function parseClaimPayload(value: unknown): SubscriptionCheckoutClaim {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid subscription checkout claim payload');
  }

  const payload = value as Record<string, unknown>;
  return {
    acquired: payload.acquired === true,
    claimId: typeof payload.claim_id === 'string' ? payload.claim_id : null,
    state: typeof payload.state === 'string' ? payload.state : 'unknown',
    stripeSessionId: typeof payload.stripe_session_id === 'string' ? payload.stripe_session_id : null,
  };
}

export function subscriptionCheckoutIntentKey(priceId: string) {
  return `subscription:${priceId}`;
}

export function newSubscriptionCheckoutOwnerToken() {
  return randomUUID();
}

export async function claimSubscriptionCheckout(
  admin: SupabaseClient,
  input: { userId: string; companyId: string; priceId: string; ownerToken: string },
): Promise<SubscriptionCheckoutClaim> {
  const { data, error } = await admin.rpc('claim_subscription_checkout', {
    p_user_id: input.userId,
    p_company_id: input.companyId,
    p_intent_key: subscriptionCheckoutIntentKey(input.priceId),
    p_owner_token: input.ownerToken,
    p_lease_seconds: 120,
  });

  if (error) throw new Error(`subscription checkout claim failed: ${error.message}`);
  return parseClaimPayload(data);
}

export async function finalizeSubscriptionCheckoutClaim(
  admin: SupabaseClient,
  input: { claimId: string; ownerToken: string; stripeSessionId: string },
) {
  const { error } = await admin.rpc('finalize_subscription_checkout_claim', {
    p_claim_id: input.claimId,
    p_owner_token: input.ownerToken,
    p_stripe_session_id: input.stripeSessionId,
  });
  if (error) throw new Error(`subscription checkout claim finalize failed: ${error.message}`);
}

export async function expireSubscriptionCheckoutClaim(
  admin: SupabaseClient,
  input: { claimId: string; ownerToken: string; error?: string },
) {
  const { error } = await admin.rpc('expire_subscription_checkout_claim', {
    p_claim_id: input.claimId,
    p_owner_token: input.ownerToken,
    p_error: input.error ?? null,
  });
  if (error) throw new Error(`subscription checkout claim expire failed: ${error.message}`);
}

export async function flagSubscriptionCheckoutClaimReview(
  admin: SupabaseClient,
  input: { claimId: string; ownerToken: string; error: string },
) {
  const { error } = await admin.rpc('flag_subscription_checkout_claim_review', {
    p_claim_id: input.claimId,
    p_owner_token: input.ownerToken,
    p_error: input.error,
  });
  if (error) throw new Error(`subscription checkout claim review flag failed: ${error.message}`);
}
