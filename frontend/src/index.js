// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext'; // <-- 引入 AuthProvider

// import './styles/global.css'; // 引入全局样式 (如果需要)

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* <-- 在这里包裹 App */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);