import { describe, expect, it } from 'vitest';

import { runAdapterContract } from '../src/contract-tests.ts';
import type { AdapterFactory } from '../src/contract-tests.ts';

describe('runAdapterContract — runtime guards', () => {
  it('throws when factory is missing', () => {
    expect(() => runAdapterContract('nope', undefined as unknown as AdapterFactory)).toThrow(
      /no adapter factory provided/,
    );
  });

  it('throws when factory is not a function', () => {
    expect(() => runAdapterContract('also-nope', 42 as unknown as AdapterFactory)).toThrow(
      /no adapter factory provided/,
    );
  });
});
