import { services as catalogServices } from '@/lib/utils/catalog';
import { hasSpecificViabilityCheck } from '@/lib/data/viability-checks';
import { getReadinessCheck, hasReadinessCheck } from '@/lib/data/service-readiness-checks';

export type ServiceFlowType =
  | 'viability'
  | 'readiness'
  | 'direct_checkout'
  | 'quote'
  | 'subscription_readiness';

export interface ServiceRegistryEntry {
  slug          : string;
  name          : string;
  categoria     : string;
  price         : string | undefined;
  stripePriceId : string | undefined;
  hasViability  : boolean;
  hasCheckout   : boolean;
  flowType      : ServiceFlowType;
  hasReadiness  : boolean;
  readinessSlug : string;
  requiresHoldedLicense: boolean;
  requiresHoldedApi    : boolean;
  isSubscription       : boolean;
  requiresHoldedConnectionBeforeCheckout: boolean;
  requiresProfileCompleted: boolean;
  requiresBillingReady: boolean;
}

const HOLDED_SLUGS = new Set([
  'holded-pack-starter',
  'holded-migracion-sin-inventario',
  'holded-migracion-con-inventario',
  'holded-migracion-laboral',
  'holded-modulo-laboral',
  'holded-modulo-formacion',
  'holded-integraciones-api',
]);

const HOLDED_API_SLUGS = new Set(['holded-integraciones-api']);
const MONTHLY_PLAN_SLUGS = new Set([
  'plan-supervision',
  'plan-avanzado',
  'plan-colaborativo',
]);

const QUOTE_PLAN_SLUGS = new Set([
  'plan-personalizado',
  'plan-presupuesto-personalizado',
]);

const MONTHLY_PLAN_PRICE_IDS: Record<string, string | undefined> = {
  'plan-supervision': process.env.STRIPE_PLAN_MONTHLY_49,
  'plan-avanzado': process.env.STRIPE_PLAN_MONTHLY_99,
  'plan-colaborativo': process.env.STRIPE_PLAN_MONTHLY_199,
};

function resolveFlowType(slug: string, categoria: string): ServiceFlowType {
  if (QUOTE_PLAN_SLUGS.has(slug)) return 'quote';
  if (MONTHLY_PLAN_SLUGS.has(slug)) return 'subscription_readiness';
  if (HOLDED_SLUGS.has(slug) || categoria === 'holded') return 'readiness';
  if (hasSpecificViabilityCheck(slug)) return 'viability';
  if (hasReadinessCheck(slug)) return 'readiness';
  return 'direct_checkout';
}

function buildRegistry(): Map<string, ServiceRegistryEntry> {
  const map = new Map<string, ServiceRegistryEntry>();
  for (const svc of catalogServices) {
    const flowType = resolveFlowType(svc.slug, svc.categoria);
    const isMonthlyPlan = MONTHLY_PLAN_SLUGS.has(svc.slug);
    map.set(svc.slug, {
      slug                : svc.slug,
      name                : svc.name,
      categoria           : svc.categoria,
      price               : svc.price,
      stripePriceId       : svc.stripePriceId,
      hasViability        : hasSpecificViabilityCheck(svc.slug),
      hasCheckout         : Boolean(svc.stripePriceId),
      flowType,
      hasReadiness        : hasReadinessCheck(svc.slug),
      readinessSlug       : svc.slug,
      requiresHoldedLicense: HOLDED_SLUGS.has(svc.slug) || isMonthlyPlan,
      requiresHoldedApi   : HOLDED_API_SLUGS.has(svc.slug) || isMonthlyPlan,
      isSubscription      : isMonthlyPlan,
      requiresHoldedConnectionBeforeCheckout: isMonthlyPlan,
      requiresProfileCompleted: isMonthlyPlan || Boolean(svc.stripePriceId),
      requiresBillingReady: isMonthlyPlan || Boolean(svc.stripePriceId),
    });
  }
  for (const slug of MONTHLY_PLAN_SLUGS) {
    if (map.has(slug)) continue;
    const readiness = getReadinessCheck(slug);
    if (!readiness) continue;
    map.set(slug, {
      slug,
      name: readiness.title,
      categoria: 'empresas-autonomos',
      price: undefined,
      stripePriceId: MONTHLY_PLAN_PRICE_IDS[slug],
      hasViability: false,
      hasCheckout: Boolean(MONTHLY_PLAN_PRICE_IDS[slug]),
      flowType: 'subscription_readiness',
      hasReadiness: true,
      readinessSlug: slug,
      requiresHoldedLicense: true,
      requiresHoldedApi: true,
      isSubscription: true,
      requiresHoldedConnectionBeforeCheckout: true,
      requiresProfileCompleted: true,
      requiresBillingReady: true,
    });
  }
  for (const slug of QUOTE_PLAN_SLUGS) {
    if (map.has(slug)) continue;
    map.set(slug, {
      slug,
      name: 'Plan Personalizado',
      categoria: 'empresas-autonomos',
      price: 'Consultar',
      stripePriceId: undefined,
      hasViability: false,
      hasCheckout: false,
      flowType: 'quote',
      hasReadiness: hasReadinessCheck(slug),
      readinessSlug: slug,
      requiresHoldedLicense: true,
      requiresHoldedApi: true,
      isSubscription: false,
      requiresHoldedConnectionBeforeCheckout: false,
      requiresProfileCompleted: false,
      requiresBillingReady: false,
    });
  }
  return map;
}

const REGISTRY = buildRegistry();

export function getService(slug: string): ServiceRegistryEntry | null {
  return REGISTRY.get(slug) ?? null;
}

export function getCheckoutableServices(): ServiceRegistryEntry[] {
  return Array.from(REGISTRY.values()).filter((s) => s.hasCheckout);
}

export function getServicesByCategory(categoria: string): ServiceRegistryEntry[] {
  return Array.from(REGISTRY.values()).filter((s) => s.categoria === categoria);
}
