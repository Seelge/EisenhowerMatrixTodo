/**
 * Placeholder Router shell. Step 4.2 replaces the body of this component
 * with a Zustand-backed projection of the URL into `ViewState`. For 4.1
 * it's a structural pass-through so the provider chain in `App` is in
 * place and tests can mount the tree.
 */
import type { ReactNode } from 'react';

export interface RouterProps {
  children?: ReactNode;
}

export function Router({ children }: RouterProps): ReactNode {
  return <>{children}</>;
}
