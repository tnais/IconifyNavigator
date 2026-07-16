import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/**
 * Application entry point for the React implementation of Iconify Navigator.
 * StrictMode activates extra development-time checks and warnings.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
