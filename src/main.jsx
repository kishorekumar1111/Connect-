import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Create a manifest.json file dynamically
const manifest = {
  "short_name": "EduMesh",
  "name": "EduMesh Learning Platform",
  "icons": [
    { "src": "https://placehold.co/192x192/1d4ed8/ffffff?text=EM", "type": "image/png", "sizes": "192x192" },
    { "src": "https://placehold.co/512x512/1d4ed8/ffffff?text=EduMesh", "type": "image/png", "sizes": "512x512" }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#111827",
  "background_color": "#030712"
};

try {
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(manifestBlob);
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  document.head.appendChild(link);
} catch (error) {
  console.error("Error creating manifest:", error);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);