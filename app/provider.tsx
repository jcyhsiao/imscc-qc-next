// app/provider.tsx
'use client';

import {useRouter} from 'next/navigation';
import {defaultTheme, Provider} from '@adobe/react-spectrum';

declare module '@adobe/react-spectrum' {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>['push']>[1]
    >;
  }
}

export function ClientProviders({ children } : { children: React.ReactNode }) {
  let router = useRouter();

  return (
    <Provider colorScheme="light" theme={defaultTheme} router={{ navigate: router.push }}>
      {children}
    </Provider>
  );
}