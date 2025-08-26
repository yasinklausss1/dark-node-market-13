import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Handle GitHub Pages 404 redirect
const searchParams = new URLSearchParams(window.location.search);
const redirectPath = searchParams.get('');
if (redirectPath) {
  const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  window.history.replaceState(null, '', path);
}

createRoot(document.getElementById("root")!).render(<App />);
