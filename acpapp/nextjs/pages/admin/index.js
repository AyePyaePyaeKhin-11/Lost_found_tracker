import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialUsers = [
  { id: 1, name: "Alice Johnson", email: "alice@kmitl.ac.th", role: "Admin", status: "Active", tier: "Pro" },
  { id: 2, name: "Bob Smith", email: "bob@kmitl.ac.th", role: "Member", status: "Active", tier: "Free" },
  { id: 3, name: "Charlie Davis", email: "charlie@kmitl.ac.th", role: "Member", status: "Inactive", tier: "Free" },
  { id: 4, name: "Diana Prince", email: "diana@kmitl.ac.th", role: "Member", status: "Active", tier: "Pro" },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState(initialUsers);

  const handleToggleRole = (id) => {
    setUsers(users.map(user => 
      user.id === id ? { ...user, role: user.role === "Admin" ? "Member" : "Admin" } : user
    ));
  };

  const handleDeleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-primary">Admin Panel</span>
          <div className="flex items-center gap-4">
            <Link href="/products"><Button variant="ghost">Workspace</Button></Link>
            <Link href="/"><Button variant="outline">Exit Dashboard</Button></Link>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Management</h1>
          <p className="text-muted-foreground mt-1">Monitor business KPIs and manage system accounts.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{users.length}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">+12% from last month</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pro Subscribers</CardDescription>
              <CardTitle className="text-3xl">{users.filter(u => u.tier === "Pro").length}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-emerald-600 font-medium">50% conversion rate</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Revenue</CardDescription>
              <CardTitle className="text-3xl">$19.98</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">Based on $9.99/mo Pro tier</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Items Recovered</CardDescription>
              <CardTitle className="text-3xl">142</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-blue-600 font-medium">89% resolution rate</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View user accounts, change privileges, or remove access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{user.tier}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          user.status === 'Active' ? 'text-emerald-600' : 'text-gray-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleToggleRole(user.id)}>Toggle Role</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}