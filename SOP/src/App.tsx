import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserDashboard } from './pages/UserDashboard';
import { MySops } from './pages/MySops';
import { UserProfile } from './pages/UserProfile';
import { SOPDetail } from './pages/SOPDetail';
import { SOPQuestionnaires } from './pages/SOPQuestionnaires';
import { SOPShadowing } from './pages/SOPShadowing';
import { QuestionnaireForm } from './pages/QuestionnaireForm';
import { ShadowingForm } from './pages/ShadowingForm';
import { AdminSettings } from './pages/AdminSettings';
import { AdminUsers } from './pages/AdminUsers';
import { Approvals } from './pages/Approvals';
import { ApprovalDetail } from './pages/ApprovalDetail';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function DashboardRouter() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Dashboard /> : <UserDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

      {/* User-specific routes */}
      <Route path="/my-sops" element={<ProtectedRoute><MySops /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

      <Route path="/sop/:id" element={<ProtectedRoute><SOPDetail /></ProtectedRoute>} />
      <Route path="/sop/:id/questionnaires" element={<ProtectedRoute><SOPQuestionnaires /></ProtectedRoute>} />
      <Route path="/sop/:id/shadowing" element={<ProtectedRoute><SOPShadowing /></ProtectedRoute>} />
      <Route path="/sop/:sopId/questionnaire/new" element={<ProtectedRoute><QuestionnaireForm /></ProtectedRoute>} />
      <Route path="/sop/:sopId/shadowing/new" element={<ProtectedRoute><ShadowingForm /></ProtectedRoute>} />

      <Route path="/questionnaire/:id" element={<ProtectedRoute><QuestionnaireForm /></ProtectedRoute>} />
      <Route path="/shadowing/:id" element={<ProtectedRoute><ShadowingForm /></ProtectedRoute>} />

      <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />

      <Route path="/approvals" element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
      <Route path="/approvals/:id" element={<ProtectedRoute adminOnly><ApprovalDetail /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
