import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Examples } from '../src/examples';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Examples />
  </StrictMode>
);

