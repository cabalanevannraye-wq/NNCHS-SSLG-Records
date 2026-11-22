import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { applyThemeToDocument, getInitialTheme } from './components/ThemeToggle.tsx';
import './index.css';

applyThemeToDocument(getInitialTheme());

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
