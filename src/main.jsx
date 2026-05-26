import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-react-table/styles.css';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, DirectionProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import './index.css';
import './i18n/i18n.js';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { useTranslation } from 'react-i18next';

const erpTheme = createTheme({
  primaryColor: 'violet',
  colors: {
    violet: [
      '#f3f0ff',
      '#e5dbff',
      '#d0bfff',
      '#b197fc',
      '#9775fa',
      '#845ef7',
      '#7950f2',
      '#7048e8',
      '#6741d9',
      '#5f3dc4',
    ],
  },
  fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", ui-monospace, monospace',
  defaultRadius: 'md',
  cursorType: 'pointer',
});

function AppProvider() {
  const { i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [dir, i18n.language]);

  return (
    <DirectionProvider key={dir} initialDirection={dir} detectDirection={false}>
      <MantineProvider theme={erpTheme} defaultColorScheme="light">
        <Notifications position="top-right" zIndex={1000} />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MantineProvider>
    </DirectionProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
);
