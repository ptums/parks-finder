import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import { App } from './App';
import { initAnalytics } from './analytics';
import { createTheme, prefersReducedMotion } from './theme';
import './styles.css';

const reducedMotion = prefersReducedMotion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* wave is antd's click ripple; it is an animation, so it goes off with motion */}
    <ConfigProvider theme={createTheme(reducedMotion)} wave={{ disabled: reducedMotion }}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);

void initAnalytics();
