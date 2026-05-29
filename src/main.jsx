import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, DirectionProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import './i18n';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

const savedLang = localStorage.getItem('erp_lang') || 'ar';
const initialDir = savedLang === 'ar' ? 'rtl' : 'ltr';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider initialDirection={initialDir}>
      <MantineProvider withGlobalStyles={false} withNormalizeCSS={false}>
        <Notifications position="top-right" zIndex={9999} />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MantineProvider>
    </DirectionProvider>
  </StrictMode>,
);
