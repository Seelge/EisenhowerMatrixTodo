import { runAdapterContract } from '@emt/backend-core';

import { InMemoryAdapter } from '../src/adapter.ts';

runAdapterContract('in-memory', () => Promise.resolve(new InMemoryAdapter()));
