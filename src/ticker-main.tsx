import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TickerPopout from './pages/TickerPopout';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TickerPopout />
  </StrictMode>
);
