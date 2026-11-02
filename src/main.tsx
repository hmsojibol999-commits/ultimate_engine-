import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useSettings, applySettings } from './core/settings';
import { registerServiceWorker } from './core/pwa';
import { listenForInstallPrompt } from './core/install';
import './index.css';

const { update: _update, reset: _reset, ...initial } = useSettings.getState();
void _update; void _reset;
applySettings(initial);

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
registerServiceWorker();
listenForInstallPrompt();
