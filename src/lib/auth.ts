import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
}

export const auth = {
  login: async (data: LoginData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', data);
      const result = await response.json();
      
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        return { success: true, ...result };
      } else {
        return { success: false, message: result.message || 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  },

  register: async (data: RegisterData) => {
    const response = await apiRequest('POST', '/api/auth/register', data);
    return await response.json();
  },

  logout: async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (error) {
      // Logout error handled silently
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  },

  isTeacher: (): boolean => {
    const user = auth.getUser();
    return user?.role === 'teacher';
  },

  isStudent: (): boolean => {
    const user = auth.getUser();
    return user?.role === 'student';
  },

  isAdmin: (): boolean => {
    const user = auth.getUser();
    return user?.role === 'admin';
  },
};

// Set up authorization header for all requests
export const setupAuthHeader = () => {
  const token = auth.getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};
