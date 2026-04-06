import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { SWRConfig } from 'swr';
import './app.css';
import { store } from './store/store';
import { router } from './app/router';
import { SocketProvider } from './context/SocketProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          shouldRetryOnError: false,
          dedupingInterval: 5_000,
        }}
      >
        <SocketProvider>
          <RouterProvider router={router} />
        </SocketProvider>
      </SWRConfig>
    </Provider>
  </StrictMode>,
);
