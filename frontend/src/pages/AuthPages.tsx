import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/api/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm font-bold tracking-[0.2em] text-emerald-300">SOCIETY MAINTENANCE HUB</p>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">Run society finances, requests and notices in one place.</h1>
          <p className="mt-4 max-w-md text-slate-400">
            Billing, collections, expenses, maintenance tickets and announcements — backed by a real MongoDB database.
          </p>
        </div>
        <p className="text-xs text-slate-500">Demo: admin@example.com / password · resident@example.com / password</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your society account</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                setError("");
                try {
                  const user = await login(values.email, values.password);
                  navigate(isAdminRole(user.role) ? "/admin/dashboard" : "/resident/dashboard");
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Unable to sign in");
                }
              })}
            >
              <div>
                <Label>Email</Label>
                <Input className="mt-1" type="email" {...form.register("email")} />
              </div>
              <div>
                <Label>Password</Label>
                <Input className="mt-1" type="password" {...form.register("password")} />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-slate-500">
              New resident?{" "}
              <Link className="font-semibold text-primary" to="/register">
                Register
              </Link>
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
              <Button variant="outline" type="button" onClick={() => { form.setValue("email", "admin@example.com"); form.setValue("password", "password"); }}>
                Admin demo
              </Button>
              <Button variant="outline" type="button" onClick={() => { form.setValue("email", "resident@example.com"); form.setValue("password", "password"); }}>
                Resident demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8),
  flatNumber: z.string().min(1),
  buildingName: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", phone: "", password: "", flatNumber: "", buildingName: "A Wing" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold">Resident registration</h2>
          <p className="mt-1 text-sm text-slate-500">Join your society with your flat details</p>
          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              setError("");
              try {
                await register(values);
                navigate("/resident/dashboard");
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Registration failed");
              }
            })}
          >
            <div className="sm:col-span-2">
              <Label>Full name</Label>
              <Input className="mt-1" {...form.register("name")} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" {...form.register("email")} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" {...form.register("phone")} />
            </div>
            <div>
              <Label>Password</Label>
              <Input className="mt-1" type="password" {...form.register("password")} />
            </div>
            <div>
              <Label>Building / wing</Label>
              <Input className="mt-1" {...form.register("buildingName")} />
            </div>
            <div>
              <Label>Flat number</Label>
              <Input className="mt-1" placeholder="A-101" {...form.register("flatNumber")} />
            </div>
            <div>
              <Label>Emergency contact</Label>
              <Input className="mt-1" {...form.register("emergencyContactName")} />
            </div>
            <div>
              <Label>Emergency phone</Label>
              <Input className="mt-1" {...form.register("emergencyContactPhone")} />
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
            <Button className="sm:col-span-2" disabled={form.formState.isSubmitting}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-500">
            Already registered?{" "}
            <Link className="font-semibold text-primary" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
