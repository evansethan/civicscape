import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 errors by clearing invalid tokens
  if (res.status === 401) {
    // Don't clear tokens or redirect during login attempts
    if (!url.includes('/api/auth/login')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Redirect to login only if not already on login page
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  }
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - increased from 1 second for better performance
      retry: 1, // Single retry for better UX
    },
    mutations: {
      retry: false,
    },
  },
});

// Enhanced error handling for authentication
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.error) {
    const error = event.query.state.error as any;
    if (error?.message?.includes('401')) {
      // Clear all queries to prevent stale data
      queryClient.clear();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Redirect to login only if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
  }
});
