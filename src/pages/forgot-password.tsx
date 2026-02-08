import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSubmitted(true);
        // Store debug info if available (development only)
        if (data.debug) {
          setDebugInfo(data.debug);
        }
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img src="/images/civicscape_logo.png" alt="CivicScape Logo" className="mx-auto h-16 w-auto" />
          <h1 className="text-3xl font-bold text-slate-600 mt-4">Password Reset</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="card_title">
              {isSubmitted ? 'Check Your Email' : 'Forgot Password'}
            </CardTitle>
            <CardDescription className="card_description">
              {isSubmitted 
                ? 'If an account exists with that username, a reset link has been sent.'
                : 'Enter your username and we\'ll send a reset link to the associated email.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center text-green-600 mb-4">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <div className="text-center text-slate-600">
                  <p className="mb-2">
                    <strong>For Teachers:</strong> Check your email inbox for the reset link.
                  </p>
                  <p>
                    <strong>For Students:</strong> Your teacher will receive the reset link and can help you reset your password.
                  </p>
                </div>

                {/* Debug info - only shown in development */}
                {debugInfo && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs font-semibold text-yellow-800 mb-2">🔧 Development Debug Info:</p>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <p><strong>Email sent to:</strong> {debugInfo.email}</p>
                      <p><strong>Expires:</strong> {new Date(debugInfo.expiresAt).toLocaleString()}</p>
                      <p><strong>Is student reset:</strong> {debugInfo.isStudentReset ? 'Yes' : 'No'}</p>
                      <p className="break-all"><strong>Reset Link:</strong> <a href={debugInfo.resetLink} className="text-blue-600 underline">{debugInfo.resetLink}</a></p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    'Sending...'
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-sm text-purple-600 hover:text-purple-800 hover:underline">
                    <ArrowLeft className="h-3 w-3 inline mr-1" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

