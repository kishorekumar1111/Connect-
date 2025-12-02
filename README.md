# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Local Development and Cloud Sync

This project uses Firebase Firestore for peer-to-peer room signaling and Supabase for cloud storage and notes sync. By default, Supabase is configured with placeholders and a mock client to allow local development without credentials. To enable full cloud sync features (notes, file storage), set the following environment variables in a `.env` or `.env.local` file at the project root:

```
VITE_SUPABASE_URL=https://your-supabase-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Then restart the dev server:

```powershell
cd "c:\Users\admin\pwa app\digital-learning-app"
npm install
npm run dev
```

Note: The app also requires valid Firebase configuration for Firestore and WebRTC signaling. The Firebase config is currently defined inline in `src/App.jsx`. Replace with your project's Firebase config if needed.

If anything fails, open the browser DevTools console—errors and stack traces will help identify missing configuration or network errors.
