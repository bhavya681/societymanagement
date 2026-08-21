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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <p className="text-sm font-semibold">Society Maintenance Hub</p>
        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-snug xl:text-4xl">
            Billing, requests and notices for housing societies.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            A single workspace for collections, expenses, maintenance tickets and resident communication.
          </p>
        </div>
        <p className="text-xs text-slate-500">Use the demo accounts on the sign-in form to explore admin, accountant and resident roles.</p>
      </div>
      <div className="flex items-center justify-center bg-[#f4f6f8] p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="text-sm font-semibold text-slate-900">Society Maintenance Hub</p>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
          </div>
          <Card>
            <CardContent className="p-5 sm:p-7">
              <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your society account details</p>
              <form
                className="mt-5 space-y-3.5"
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
                  <Input className="mt-1" type="email" autoComplete="email" {...form.register("email")} />
                  {form.formState.errors.email ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.email.message)}</p> : null}
                </div>
                <div>
                  <Label>Password</Label>
                  <Input className="mt-1" type="password" autoComplete="current-password" {...form.register("password")} />
                  {form.formState.errors.password ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.password.message)}</p> : null}
                </div>
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                <Button className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <p className="mt-4 text-sm text-slate-500">
                New here?{" "}
                <Link className="font-medium text-teal-800 hover:underline" to="/register-society">
                  Create a society
                </Link>
                {" · "}
                <Link className="font-medium text-teal-800 hover:underline" to="/register">
                  Join as resident
                </Link>
              </p>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    form.setValue("email", "admin@example.com");
                    form.setValue("password", "password");
                  }}
                >
                  Admin
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    form.setValue("email", "treasurer@example.com");
                    form.setValue("password", "password");
                  }}
                >
                  Treasurer
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    form.setValue("email", "resident@example.com");
                    form.setValue("password", "password");
                  }}
                >
                  Resident
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8),
  societyCode: z.string().min(4, "Enter the society invite code"),
  flatNumber: z.string().min(1),
  buildingName: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", societyCode: "", flatNumber: "", buildingName: "" },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4 sm:p-8">
      <Card className="w-full max-w-xl">
        <CardContent className="p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">Join a society</h2>
          <p className="mt-1 text-sm text-slate-500">Use the invite code from your society admin, then enter your flat.</p>
          <form
            className="mt-5 grid gap-3.5 sm:grid-cols-2"
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
              <Label>Society invite code</Label>
              <Input className="mt-1 uppercase" placeholder="e.g. SUNRISE1" {...form.register("societyCode")} />
              {form.formState.errors.societyCode ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.societyCode.message)}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <Label>Full name</Label>
              <Input className="mt-1" {...form.register("name")} />
              {form.formState.errors.name ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.name.message)}</p> : null}
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" {...form.register("email")} />
              {form.formState.errors.email ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.email.message)}</p> : null}
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" {...form.register("phone")} />
              {form.formState.errors.phone ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.phone.message)}</p> : null}
            </div>
            <div>
              <Label>Password</Label>
              <Input className="mt-1" type="password" {...form.register("password")} />
              {form.formState.errors.password ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.password.message)}</p> : null}
            </div>
            <div>
              <Label>Building / wing</Label>
              <Input className="mt-1" placeholder="A Wing" {...form.register("buildingName")} />
            </div>
            <div>
              <Label>Flat number</Label>
              <Input className="mt-1" placeholder="A-101" {...form.register("flatNumber")} />
              {form.formState.errors.flatNumber ? <p className="mt-1 text-sm text-red-700">{String(form.formState.errors.flatNumber.message)}</p> : null}
            </div>
            {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
            <Button className="sm:col-span-2" disabled={form.formState.isSubmitting}>
              Join society
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-500">
            Starting a new society?{" "}
            <Link className="font-medium text-teal-800 hover:underline" to="/register-society">
              Create one
            </Link>
            {" · "}
            <Link className="font-medium text-teal-800 hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const createSocietySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8),
  societyName: z.string().min(2),
  address: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4),
  buildingName: z.string().optional(),
});

export function CreateSocietyPage() {
  const { registerSociety } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(createSocietySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      societyName: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      buildingName: "",
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4 sm:p-8">
      <Card className="w-full max-w-xl">
        <CardContent className="p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">Create your society</h2>
          <p className="mt-1 text-sm text-slate-500">
            You become the admin. Then add treasurers and residents, or share the invite code from Settings.
          </p>
          <form
            className="mt-5 grid gap-3.5 sm:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              setError("");
              try {
                await registerSociety(values);
                navigate("/admin/dashboard");
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create society");
              }
            })}
          >
            <div className="sm:col-span-2">
              <Label>Society name</Label>
              <Input className="mt-1" placeholder="Green Park Residency" {...form.register("societyName")} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input className="mt-1" {...form.register("address")} />
            </div>
            <div>
              <Label>City</Label>
              <Input className="mt-1" {...form.register("city")} />
            </div>
            <div>
              <Label>State</Label>
              <Input className="mt-1" {...form.register("state")} />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input className="mt-1" {...form.register("pincode")} />
            </div>
            <div>
              <Label>Building / wing (optional)</Label>
              <Input className="mt-1" placeholder="A Wing" {...form.register("buildingName")} />
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3 text-sm font-medium text-slate-700">Your admin account</div>
            <div className="sm:col-span-2">
              <Label>Your name</Label>
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
            <div className="sm:col-span-2">
              <Label>Password</Label>
              <Input className="mt-1" type="password" {...form.register("password")} />
            </div>
            {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
            <Button className="sm:col-span-2" disabled={form.formState.isSubmitting}>
              Create society
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{" "}
            <Link className="font-medium text-teal-800 hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
