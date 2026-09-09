import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('legacy Holded checkout removal', () => {
  it('does not expose the unscoped direct Holded payment endpoint or its dead buttons', () => {
    expect(existsSync(resolve(process.cwd(), 'app/api/holded/checkout/route.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'components/holded/HoldedBuyButton.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'app/(public)/servicios/formacion/FormacionBuyButton.tsx'))).toBe(false);
  });

  it('keeps the legacy training URL redirected into the canonical Holded surface', () => {
    const legacyPage = readFileSync(
      resolve(process.cwd(), 'app/(public)/servicios/formacion/page.tsx'),
      'utf8',
    );
    expect(legacyPage).toContain("permanentRedirect('/holded#formacion')");
  });
});
