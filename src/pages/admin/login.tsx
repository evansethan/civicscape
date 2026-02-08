import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { useLocation } from "wouter";

const AdminLogin = () => {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string>("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const result = await auth.login({ username, password });
      if (result.success) {
        setLocation("/admin/dashboard");
      } else {
        setLoginError(result.message);
      }
    } catch (error) {
      setLoginError(
        "Unable to connect. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <Card className="h-50 w-50 bg-white rounded-2xl shadow-xl login_registration_container">
        <CardHeader className="text-2xl font-bold pb-0 mb-2">
          <div className="text-center">
            <img
              src="/images/civicscape_logo.png"
              alt="CivicScape Logo"
              className="mx-auto h-16 w-auto"
            />
            <h1 className="text-2xl font-bold text-slate-600 mt-4 mb-0">
              User Management Dashboard
            </h1>
          </div>
          <p className="text-sm font-normal">
            Not registered?{" "}
            <a href="/admin/register" className="text-blue-500 underline">
              Register now
            </a>
          </p>
          <div className="border-b border-gray-300" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                {loginError}
              </div>
            )}
            <div className="flex justify-between items-center">
              <Button
                className="bg-orange-500 text-white rounded-full normal-case font-bold hover:bg-orange-600"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}{" "}
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
              <a href="/admin/forgot-password">
                <p className="text-sm underline underline-offset-4">
                  Forgot password?
                </p>
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
