import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'teacher' | 'student';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const user = auth.getUser();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      setLocation('/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      setLocation('/unauthorized');
      return;
    }
  }, [setLocation, user, requiredRole]);

  if (!auth.isAuthenticated()) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
