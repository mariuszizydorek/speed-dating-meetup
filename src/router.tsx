import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from './components/AppLayout';
import { SchedulePage } from './pages/SchedulePage';
import { RunPage } from './pages/RunPage';

const SetupPage = lazy(() => import('./pages/SetupPage').then((m) => ({ default: m.SetupPage })));
const PrintPage = lazy(() => import('./pages/PrintPage').then((m) => ({ default: m.PrintPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/setup" replace />} />
          <Route path="setup" element={<Suspense fallback={<PageLoader />}><SetupPage /></Suspense>} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="print" element={<Suspense fallback={<PageLoader />}><PrintPage /></Suspense>} />
          <Route path="run" element={<RunPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function PageLoader() {
  return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
}
