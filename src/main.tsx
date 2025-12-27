import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Main.tsx loaded - starting app initialization');

// Handle GitHub Pages 404 redirect
// 404.html redirects "/some/path" -> "?some/path" (no key), so we need to recover it.
const searchParams = new URLSearchParams(window.location.search);
const firstKey = searchParams.keys().next().value as string | undefined;
if (firstKey && !firstKey.includes('=')) {
  const path = firstKey.startsWith('/') ? firstKey : `/${firstKey}`;
  console.log('GitHub Pages redirect detected, restoring path:', path);
  window.history.replaceState(null, '', path);
}

console.log('Current pathname:', window.location.pathname);

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('Root element not found!');
  } else {
    console.log('Root element found, rendering app');
    createRoot(rootElement).render(<App />);
    console.log('App rendered successfully');
  }
} catch (error) {
  console.error('Error rendering app:', error);
}
