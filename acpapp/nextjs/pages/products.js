import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
});

const emptyForm = { name: "", description: "", price: "", stock: "" };

export default function Products() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setEmail(localStorage.getItem("email") || "");
    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (authenticated) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    router.replace("/login");
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price) || 0,
          stock: parseInt(form.stock, 10) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create product");
      }

      const newProduct = await response.json();
      setProducts((prev) => [...prev, newProduct]);
      setForm(emptyForm);
      setMessage("Product added successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleBuy(id) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/products/${id}/buy`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to buy product");
      }

      const updated = await response.json();
      setProducts((prev) =>
        prev.map((product) => (product.id === id ? updated : product))
      );
      setMessage(`Purchased "${updated.name}"`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((product) => product.id !== id));
      setMessage("Product deleted successfully");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="container py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              ACP Simple Store
            </h1>
            <p className="mt-2 text-muted-foreground">
              Logged in as <span className="font-medium">{email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Dashboard</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        <Card className="mb-10">
          <CardHeader>
            <CardTitle>Add Product</CardTitle>
            <CardDescription>Create a new item in the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="sm:col-span-2 lg:col-span-4"
              >
                {creating ? "Adding..." : "Add Product"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-muted-foreground">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  <p className="text-xl font-semibold">
                    {thb.format(product.price)}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      product.stock > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.stock > 0
                      ? `In stock: ${product.stock}`
                      : "Out of stock"}
                  </span>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={product.stock <= 0}
                    onClick={() => handleBuy(product.id)}
                  >
                    Buy
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}