import { createBrowserRouter, Navigate } from 'react-router';
import { ERoutes } from '@constants/routes';
import LoginPage from '../../modules/Auth/_pages/LoginPage';
import RegisterPage from '../../modules/Auth/_pages/RegisterPage';
import DashboardPage from '../../modules/Dashboard/_pages/DashboardPage';
import RouteErrorBoundary from '../../shared/components/RouteErrorBoundary';
import ProtectedRoute from './ProtectedRoute';

/**
 * Shared error screen for every route. React Router will render this
 * element whenever a loader/action/render throws underneath that route.
 * We attach it to every top-level route (and the protected layout) so
 * no render failure can ever produce a blank page.
 */
const errorElement = <RouteErrorBoundary />;

export const router = createBrowserRouter([
  {
    path: ERoutes.ROOT,
    element: <Navigate to={ERoutes.DASHBOARD} replace />,
    errorElement,
  },
  {
    path: ERoutes.LOGIN,
    element: <LoginPage />,
    errorElement,
  },
  {
    path: ERoutes.REGISTER,
    element: <RegisterPage />,
    errorElement,
  },
  {
    element: <ProtectedRoute />,
    errorElement,
    children: [
      {
        path: ERoutes.DASHBOARD,
        element: <DashboardPage />,
        errorElement,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ERoutes.DASHBOARD} replace />,
    errorElement,
  },
]);
