const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export async function getProducts() {
  const res = await fetch(`${API_URL}/api/products`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load products");
  return data;
}

// ===== BARU =====

// Ambil token hasil login dari localStorage
export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("token");

// Tambah produk (perlu token)
export async function createProduct(payload, token) {
  const res = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.errors) ? data.errors.join(", ") : "";
    const err = new Error(detail || data.message || "Failed to create product");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Hapus produk (perlu token)
export async function deleteProduct(id, token) {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Failed to delete product");
    err.status = res.status;
    throw err;
  }
  return data;
}
// Edit produk (perlu token)
export async function updateProduct(id, payload, token) {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.errors) ? data.errors.join(", ") : "";
    const err = new Error(detail || data.message || "Failed to update product");
    err.status = res.status;
    throw err;
  }
  return data;
}