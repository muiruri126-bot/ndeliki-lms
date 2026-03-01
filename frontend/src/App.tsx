import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import BorrowerListPage from './pages/borrowers/BorrowerListPage';
import BorrowerFormPage from './pages/borrowers/BorrowerFormPage';
import BorrowerDetailPage from './pages/borrowers/BorrowerDetailPage';
import LoanListPage from './pages/loans/LoanListPage';
import LoanFormPage from './pages/loans/LoanFormPage';
import LoanDetailPage from './pages/loans/LoanDetailPage';
import PaymentListPage from './pages/payments/PaymentListPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import UserListPage from './pages/users/UserListPage';
import AuditLogPage from './pages/audit/AuditLogPage';

const STAFF_ROLES = ['SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'];
const ADMIN_ONLY = ['SYSTEM_ADMIN'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* Borrowers */}
        <Route path="borrowers">
          <Route
            index
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <BorrowerListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="new"
            element={
              <ProtectedRoute roles={['SYSTEM_ADMIN', 'LOAN_OFFICER']}>
                <BorrowerFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path=":id"
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <BorrowerDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Loans */}
        <Route path="loans">
          <Route
            index
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <LoanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="new"
            element={
              <ProtectedRoute roles={['SYSTEM_ADMIN', 'LOAN_OFFICER']}>
                <LoanFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path=":id"
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <LoanDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Payments */}
        <Route path="payments">
          <Route
            index
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <PaymentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="new"
            element={
              <ProtectedRoute roles={['SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT']}>
                <PaymentFormPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Reports */}
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={STAFF_ROLES}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Users - Admin only */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={ADMIN_ONLY}>
              <UserListPage />
            </ProtectedRoute>
          }
        />

        {/* Audit Log - Admin only */}
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={ADMIN_ONLY}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
