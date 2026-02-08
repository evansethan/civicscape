import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>('');

  // password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(''); // Clear any previous errors

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const result = await auth.login({ username, password });

      if (result.success) {
        setLocation('/dashboard');
      } else {
        setLoginError('Invalid username or password. Please try again.');
      }
    } catch (error) {
      setLoginError(
        'Unable to connect. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as 'teacher' | 'student';
    const email = formData.get('email') as string;
    const trimmedEmail = email?.trim();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const userData: any = {
      username,
      password,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      role,
    };
    if (trimmedEmail) {
      userData.email = trimmedEmail;
    }

    try {
      const registerResult = await auth.register(userData);
      if (registerResult.success) {
        // Automatically log the user in after successful registration
        const loginResult = await auth.login({ username, password });
        if (loginResult.success) {
          setLocation('/dashboard');
        } else {
          toast({
            title: 'Registration successful, but login failed.',
            description: 'Please try logging in manually.',
            variant: 'destructive',
          });
          const loginTab = document.querySelector(
            '[data-tab="login"]'
          ) as HTMLElement;
          if (loginTab) loginTab.click();
        }
      } else {
        toast({
          title: 'Registration failed',
          description: registerResult.message || 'Registration failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center grid grid-cols-6">
      <div className="col-span-2 loginscreen_leftsidebar">
        <div className="logo-container ml-8 mt-8 mb-8">
          <img
            src="/images/trubelco_logo.png"
            alt="Trubel & Co Logo"
            className="h-10 w-auto"
          />
        </div>
        <h1 className="text-5xl font-bold text-slate-800 ml-8">
          Empowering Geospatial Education, one map at a time!
        </h1>
        <img
          src="/images/groupstudents_maph.png"
          alt="Group of Students with Map"
          className="mt-8 ml-8 rounded-lg shadow-lg"
        />
      </div>

      <div className="w-full max-w-md col-span-2 col-start-4">
        <div className="text-center mb-8">
          <img
            src="/images/civicscape_logo.png"
            alt="CivicScape Logo"
            className="mx-auto h-16 w-auto"
          />
          <h1 className="text-3xl font-bold text-slate-600 mt-4">
            Educational GIS Platform
          </h1>
        </div>

        <Tabs defaultValue="login" className="w-full login_registration_container">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-tab="login" className="tab_header">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="tab_header">
              Register
            </TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="card_title">Login</CardTitle>
                <CardDescription className="card_description">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword((prev) => !prev)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500"
                        aria-label={
                          showLoginPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-800 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  {loginError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      {loginError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full edugis-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="card_title">Register</CardTitle>
                <CardDescription className="card_description">
                  Create a new account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional for students)</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com (optional for students)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        name="password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword((prev) => !prev)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500"
                        aria-label={
                          showRegisterPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 form_dropdown">
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full edugis-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}