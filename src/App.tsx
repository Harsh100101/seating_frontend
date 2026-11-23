import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { motion } from 'framer-motion';
import { ENABLE_EMPLOYEE_RECONCILIATION } from './config/featureFlags';
import { normalizeAdminRole } from './utils/adminRole';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const HierarchyPage = lazy(() => import('./pages/HierarchyPage').then((module) => ({ default: module.HierarchyPage })));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })));
const FloorPlanPage = lazy(() => import('./pages/FloorPlanPage').then((module) => ({ default: module.FloorPlanPage })));
const TransferRequestsPage = lazy(() => import('./pages/TransferRequestsPage').then((module) => ({ default: module.TransferRequestsPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage').then((module) => ({ default: module.DataQualityPage })));
const PendingCorrectionsPage = lazy(() => import('./pages/PendingCorrectionsPage').then((module) => ({ default: module.PendingCorrectionsPage })));
const EmployeeReconciliationPage = lazy(() => import('./pages/EmployeeReconciliationPage').then((module) => ({ default: module.EmployeeReconciliationPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const AdminManagementPage = lazy(() => import('./pages/AdminManagementPage').then((module) => ({ default: module.AdminManagementPage })));
const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage').then((module) => ({ default: module.FacilitiesPage })));

const RouteLoading: React.FC = () => (
  <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3" role="status">
    <div className="ios-spinner" aria-hidden="true" />
    <span className="text-sm font-medium text-slate-500">Opening workspace…</span>
  </div>
);

const ProtectedLayout: React.FC = () => {
  const { adminUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="app-loading min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="ios-spinner" aria-label="Loading" />
          <span className="text-sm text-slate-600 font-medium">Preparing your workspace…</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <Navbar />
      <main className="app-main flex-1">
        <Suspense fallback={<RouteLoading />}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
    </div>
  );
};

const DefaultRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};

export const FeatureRoute: React.FC<{
  enabled: boolean;
  fallbackPath?: string;
  children: React.ReactNode;
}> = ({ enabled, fallbackPath = '/dashboard', children }) => {
  if (!enabled) return <Navigate to={fallbackPath} replace />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{
  allowedRoles: string[];
  fallbackPath?: string;
  children: React.ReactNode;
}> = ({ allowedRoles, fallbackPath = '/dashboard', children }) => {
  const { adminUser, isLoading } = useAuth();
  if (isLoading) return null;
  const role = normalizeAdminRole(adminUser?.role);
  if (!allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <Router>
        <div className="min-h-screen text-slate-800">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<DefaultRedirect />} />
              <Route
                path="/dashboard"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/login">
                    <DashboardPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/hierarchy"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <HierarchyPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/floor-plan"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <FloorPlanPage />
                  </RoleRoute>
                }
              />
              <Route path="/transfer-requests" element={<TransferRequestsPage />} />
              <Route
                path="/employees"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/login">
                    <EmployeesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN']} fallbackPath="/dashboard">
                    <AuditLogsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/data-quality"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <DataQualityPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/data-quality/pending-corrections"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <PendingCorrectionsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/data-quality/reconciliation"
                element={
                  <FeatureRoute enabled={ENABLE_EMPLOYEE_RECONCILIATION} fallbackPath="/dashboard">
                    <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                      <EmployeeReconciliationPage />
                    </RoleRoute>
                  </FeatureRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <ReportsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/facilities"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN', 'SUPER_ADMIN', 'UNIT_ADMIN']} fallbackPath="/dashboard">
                    <FacilitiesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin-management"
                element={
                  <RoleRoute allowedRoles={['TECH_ADMIN']} fallbackPath="/dashboard">
                    <AdminManagementPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin-management/initial-import"
                element={<Navigate to="/dashboard" replace />}
              />
            </Route>

            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </div>
      </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
