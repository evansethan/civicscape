import { useState, useEffect, useCallback, useMemo } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/protected-route";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { auth } from "@/lib/auth";

// Pages
import Login from "@/pages/login";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import Modules from "@/pages/modules";
import ModuleDetail from "@/pages/module-detail";
import AssignmentDetail from "@/pages/assignment-detail";
import AssignmentSubmission from "@/pages/assignment-submission";
import Grading from "@/pages/grading";
import Students from "@/pages/students";
import StudentDetail from "@/pages/student-detail";
import Grades from "@/pages/grades";
import Mapping from "@/pages/mapping";
import NotFound from "@/pages/not-found";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="edugis-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const [user, setUser] = useState(auth.getUser());
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = useCallback(async () => {
    const token = auth.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/modules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        auth.logout();
        setUser(null);
      } else {
        setUser(auth.getUser());
      }
    } catch {
      setUser(auth.getUser());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const dashboardContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    return user?.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />;
  }, [isLoading, user?.role]);

  return dashboardContent;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {auth.isAuthenticated() ? (
          <Redirect to="/dashboard" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/modules">
        <ProtectedRoute>
          <Layout>
            <Modules />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/modules/:moduleId">
        <ProtectedRoute>
          <Layout>
            <ModuleDetail />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/assignments/:assignmentId">
        <ProtectedRoute>
          <Layout>
            <AssignmentDetail />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/assignments/:assignmentId/grading">
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <Grades />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/assignments/:id/submit">
        <ProtectedRoute requiredRole="student">
          <Layout>
            <AssignmentSubmission />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/grading/:submissionId">
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <Grading />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/students">
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <Students />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/students/:studentId">
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <StudentDetail />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/grades">
        <ProtectedRoute>
          <Layout>
            <Grades />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/mapping">
        <ProtectedRoute>
          <Layout>
            <Mapping />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
