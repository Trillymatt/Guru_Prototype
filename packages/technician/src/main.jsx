import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@shared/AuthProvider';
import App from './App';
import '@shared/theme.css';
import './styles/app.css';
import './styles/tech-components.css';
import './styles/tech-nav.css';
import './styles/tech-login.css';
import './styles/tech-queue.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
