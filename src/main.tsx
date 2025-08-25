import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Handle GitHub Pages SPA routing - check for stored redirect
const storedPath = sessionStorage.getItem('github-pages-spa-redirect');
if (storedPath) {
  sessionStorage.removeItem('github-pages-spa-redirect');
  window.history.replaceState(null, null, storedPath);
}

console.log('main.tsx loaded');
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
