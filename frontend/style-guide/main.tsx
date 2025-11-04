import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyleGuide } from '../src/components/StyleGuide';
import '../../mother-theme/src/styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyleGuide />
  </React.StrictMode>,
);

