import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Handle GitHub Pages 404 redirect
// 404.html redirects "/some/path" -> "?some/path" (no key), so we need to recover it.
const searchParams = new URLSearchParams(window.location.search);
const firstKey = searchParams.keys().next().value as string | undefined;
if (firstKey && !firstKey.includes('=')) {
  const path = firstKey.startsWith('/') ? firstKey : `/${firstKey}`;
  window.history.replaceState(null, '', path);
}

createRoot(document.getElementById("root")!).render(<App />);
