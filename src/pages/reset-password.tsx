import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [resetUsername, setResetUsername] = useState('');

  // Extract token from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setIsValidating(false);
      setValidationError('No reset token provided. Please use the link from your email.');
    }
  }, []);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${tokenValue}`);
      const data = await response.json();

      if (data.valid) {
        setIsValid(true);
        setUserInfo(data.user);
      } else {
        setValidationError(data.message || 'Invalid or expired reset link.');
      }
    } catch (err) {
      setValidationError('Unable to validate reset link. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password length
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSubmitted(true);
        setResetUsername(data.username || '');
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValid && !isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <img src="/images/civicscape_logo.png" alt="CivicScape Logo" className="mx-auto h-16 w-auto" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="card_title text-center">Invalid Reset Link</CardTitle>
              <CardDescription className="card_description text-center">
                {validationError}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/forgot-password">
                  <Button className="w-full edugis-btn-primary">
                    Request New Reset Link
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <img src="/images/civicscape_logo.png" alt="CivicScape Logo" className="mx-auto h-16 w-auto" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="card_title text-center">Password Reset Successfully!</CardTitle>
              <CardDescription className="card_description text-center">
                {resetUsername && (
                  <span>The password for <strong>{resetUsername}</strong> has been updated.</span>
                )}
                {!resetUsername && 'Your password has been updated.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full edugis-btn-primary">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img src="/images/civicscape_logo.png" alt="CivicScape Logo" className="mx-auto h-16 w-auto" />
          <h1 className="text-3xl font-bold text-slate-600 mt-4">Reset Password</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="card_title">Set New Password</CardTitle>
            <CardDescription className="card_description">
              {userInfo && (
                <span>
                  Resetting password for: <strong>{userInfo.firstName} {userInfo.lastName}</strong>
                  {userInfo.role === 'student' && ' (Student)'}
                  {userInfo.role === 'teacher' && ' (Teacher)'}
                </span>
              )}
              {!userInfo && 'Enter your new password below.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full edugis-btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-sm text-purple-600 hover:text-purple-800 hover:underline">
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

