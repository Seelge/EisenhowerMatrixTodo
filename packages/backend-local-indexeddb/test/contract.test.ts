import 'fake-indexeddb/auto';
import { runAdapterContract } from '@emt/backend-core';

import { createLocalIndexedDbAdapter } from '../src/adapter.ts';

let counter = 0;

runAdapterContract(
  'local-indexeddb',
  async () => {
    // Unique database name per case so beforeEach starts from empty
    // state without depending on an explicit drop API.
    const databaseName = `local-test-${Date.now()}-${++counter}`;
    return createLocalIndexedDbAdapter({ databaseName });
  },
  { skip: ['changesSince'] },
);
