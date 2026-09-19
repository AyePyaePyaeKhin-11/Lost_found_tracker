import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-muted/30 flex flex-col justify-between">
      {/* Navigation Bar */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-primary">
            Lost & Found Tracker
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Track & Recover Lost Campus Items
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The central platform for managing lost belongings, claiming found items, and verifying campus community members instantly.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/products">
            <Button size="lg">Explore Workspace</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>Instant item status updates</CardDescription>
            </CardHeader>
            <CardContent>
              Report and monitor lost or found items directly through your workspace with live status indicators.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campus SSO Integration</CardTitle>
              <CardDescription>Secure university authentication</CardDescription>
            </CardHeader>
            <CardContent>
              Sign in effortlessly using standard credentials or KMITL SSO integration for verified campus claims.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin & Analytics</CardTitle>
              <CardDescription>Comprehensive dashboards</CardDescription>
            </CardHeader>
            <CardContent>
              Access centralized metrics, resolution rates, and user role controls built right into the platform.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © Lost & Found Tracker. Built for ACP Application.
      </footer>
    </main>
  );
}