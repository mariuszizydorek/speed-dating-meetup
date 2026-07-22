import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { SetupPage } from './pages/SetupPage';
import { SchedulePage } from './pages/SchedulePage';
import { PrintPage } from './pages/PrintPage';
import { RunPage } from './pages/RunPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/setup" replace />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="print" element={<PrintPage />} />
          <Route path="run" element={<RunPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
