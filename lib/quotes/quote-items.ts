import { services as catalogServices } from '@/lib/utils/catalog';

export type QuoteItemInput = {
  serviceSlug: string;
  quantity?: number;
};

export type ResolvedQuoteItem = {
  serviceSlug: string;
  stripePriceId: string;
  description: string;
  quantity: number;
  unitAmountEur: number;
  taxBehavior: 'exclusive' | 'inclusive' | 'unspecified';
  sortOrder: number;
};

export type QuoteServiceOption = {
  serviceSlug: string;
  name: string;
  category: string;
  unitAmountEur: number;
  minQuantity: number;
  maxQuantity: number;
};

const QUANTITY_RULES: Record<string, { min: number; max: number }> = {
  'holded-migracion-laboral': { min: 5, max: 200 },
  'holded-modulo-formacion': { min: 1, max: 1 },
};

const REAL_STRIPE_PRICE_ID = /^price_[A-Za-z0-9]+$/;

function quantityRuleFor(slug: string): { min: number; max: number } {
  return QUANTITY_RULES[slug] ?? { min: 1, max: 1 };
}

function parseCatalogUnitAmount(price?: string): number | null {
  if (!price) return null;
  const match = price.match(/[\d.,]+/);
  if (!match) return null;

  const cleaned = match[0]
    .replace(/\.(\d{3})/g, '$1')
    .replace(',', '.');
  const amount = Number.parseFloat(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function isQuoteCheckoutService(service: (typeof catalogServices)[number]): boolean {
  return Boolean(
    service.stripePriceId &&
    REAL_STRIPE_PRICE_ID.test(service.stripePriceId) &&
    !service.slug.startsWith('plan-') &&
    parseCatalogUnitAmount(service.price)
  );
}

export function listQuoteServices(): QuoteServiceOption[] {
  return catalogServices
    .filter(isQuoteCheckoutService)
    .map((service) => {
      const unitAmountEur = parseCatalogUnitAmount(service.price);
      if (!unitAmountEur) throw new Error(`Precio inválido en catálogo para ${service.slug}`);
      const rule = quantityRuleFor(service.slug);
      return {
        serviceSlug: service.slug,
        name: service.name,
        category: service.categoria,
        unitAmountEur,
        minQuantity: rule.min,
        maxQuantity: rule.max,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export function resolveQuoteItems(inputs: QuoteItemInput[]): ResolvedQuoteItem[] {
  if (!inputs.length) throw new Error('Añade al menos un servicio al presupuesto.');
  if (inputs.length > 20) throw new Error('Demasiadas líneas en el presupuesto.');

  const seen = new Set<string>();

  return inputs.map((input, index) => {
    if (seen.has(input.serviceSlug)) {
      throw new Error(`El servicio ${input.serviceSlug} está repetido. Usa una sola línea con la cantidad correcta.`);
    }
    seen.add(input.serviceSlug);

    const service = catalogServices.find((candidate) => candidate.slug === input.serviceSlug);
    if (!service?.stripePriceId || !isQuoteCheckoutService(service)) {
      throw new Error(`Servicio no disponible para contratación: ${input.serviceSlug}`);
    }

    const unitAmountEur = parseCatalogUnitAmount(service.price);
    if (!unitAmountEur) {
      throw new Error(`El servicio ${service.name} no tiene un precio unitario válido.`);
    }

    const quantity = input.quantity ?? 1;
    if (!Number.isInteger(quantity)) throw new Error('La cantidad debe ser un número entero.');

    const rule = quantityRuleFor(service.slug);
    if (quantity < rule.min || quantity > rule.max) {
      if (rule.min === rule.max) {
        throw new Error(`${service.name} solo admite cantidad ${rule.min}.`);
      }
      throw new Error(`${service.name} admite entre ${rule.min} y ${rule.max} unidades.`);
    }

    return {
      serviceSlug: service.slug,
      stripePriceId: service.stripePriceId,
      description: service.name,
      quantity,
      unitAmountEur,
      taxBehavior: 'exclusive',
      sortOrder: index,
    };
  });
}

export function quoteItemsSubtotal(items: ResolvedQuoteItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.unitAmountEur * item.quantity, 0) * 100) / 100;
}
