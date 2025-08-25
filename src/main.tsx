import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// GitHub Pages SPA support - simple hash-based routing
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  // Convert path to hash for GitHub Pages compatibility
  const newHash = '#' + window.location.pathname + window.location.search;
  window.location.replace(window.location.origin + '/' + newHash);
}

console.log('main.tsx loaded');
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
