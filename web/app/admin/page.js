"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getToken,
} from "../../lib/api";
import styles from "./admin.module.css";

const EMPTY = { title: "", price: "", description: "", category: "", image: "" };

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = "Nama produk wajib diisi.";
  const price = Number(f.price);
  if (f.price === "" || Number.isNaN(price)) e.price = "Harga harus berupa angka.";
  else if (price <= 0) e.price = "Harga harus lebih dari 0.";
  return e;
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);   // BARU: id produk yang diedit
  const [query, setQuery] = useState("");             // BARU: kata kunci pencarian
  const [notice, setNotice] = useState(null);

  // Proteksi halaman: belum login -> arahkan ke halaman login
  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  const loadProducts = async () => {
    setListLoading(true);
    setListError("");
    try {
      setProducts(await getProducts());
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (ready) loadProducts();
  }, [ready]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  // BARU: isi form dengan data produk yang akan diedit
  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      title: p.title || "",
      price: String(p.price ?? ""),
      description: p.description || "",
      category: p.category || "",
      image: p.image || "",
    });
    setErrors({});
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // BARU: batalkan mode edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);

    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const token = getToken();
    if (!token) {
      setNotice({ type: "error", text: "Sesi habis. Silakan login kembali." });
      router.replace("/");
      return;
    }

    const payload = {
      title: form.title.trim(),
      price: Number(form.price),
      description: form.description.trim(),
      category: form.category.trim(),
      image: form.image.trim(),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateProduct(editingId, payload, token);
        setNotice({ type: "success", text: "Produk berhasil diperbarui." });
        setEditingId(null);
      } else {
        await createProduct(payload, token);
        setNotice({ type: "success", text: "Produk berhasil ditambahkan." });
      }
      setForm(EMPTY);
      await loadProducts();
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("token");
        router.replace("/");
        return;
      }
      setNotice({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus produk "${p.title}"?`)) return;

    setNotice(null);
    setDeletingId(p.id);
    try {
      await deleteProduct(p.id, getToken());
      if (editingId === p.id) handleCancelEdit();   // produk yang sedang diedit ikut dihapus
      setNotice({ type: "success", text: "Produk berhasil dihapus." });
      await loadProducts();
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("token");
        router.replace("/");
        return;
      }
      setNotice({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // BARU: filter produk berdasarkan nama atau kategori
  const keyword = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (p.title || "").toLowerCase().includes(keyword) ||
      (p.category || "").toLowerCase().includes(keyword)
  );

  if (!ready) return <p className={styles.center}>Memeriksa sesi login...</p>;

  return (
    <main className={styles.container}>
      <h1>Admin: Pengelolaan Produk</h1>

      <div className={styles.layout}>
        <section className={styles.card}>
          <h2>{editingId ? "Edit Produk" : "Tambah Produk"}</h2>

          {notice && (
            <div
              role="alert"
              className={notice.type === "success" ? styles.success : styles.error}
            >
              {notice.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="title">Nama Produk *</label>
            <input id="title" name="title" value={form.title}
              onChange={handleChange} disabled={submitting} />
            {errors.title && <small className={styles.fieldError}>{errors.title}</small>}

            <label htmlFor="price">Harga *</label>
            <input id="price" name="price" type="number" step="any"
              value={form.price} onChange={handleChange} disabled={submitting} />
            {errors.price && <small className={styles.fieldError}>{errors.price}</small>}

            <label htmlFor="category">Kategori</label>
            <input id="category" name="category" value={form.category}
              onChange={handleChange} disabled={submitting} />

            <label htmlFor="image">URL Gambar</label>
            <input id="image" name="image" type="url" placeholder="https://..."
              value={form.image} onChange={handleChange} disabled={submitting} />

            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" rows={4}
              value={form.description} onChange={handleChange} disabled={submitting} />

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Menyimpan..."
                : editingId
                ? "Simpan Perubahan"
                : "Tambah Produk"}
            </button>

            {editingId && (
              <button type="button" className={styles.cancelBtn}
                onClick={handleCancelEdit} disabled={submitting}>
                Batal
              </button>
            )}
          </form>
        </section>

        <section className={styles.card}>
          <h2>
            Daftar Produk ({filtered.length}
            {keyword ? ` dari ${products.length}` : ""})
          </h2>

          <input
            className={styles.search}
            type="search"
            placeholder="Cari nama atau kategori..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {listLoading && <p>Memuat produk...</p>}
          {listError && <p className={styles.fieldError}>{listError}</p>}
          {!listLoading && !listError && products.length === 0 && <p>Belum ada produk.</p>}
          {!listLoading && products.length > 0 && filtered.length === 0 && (
            <p>Tidak ada produk yang cocok dengan "{query}".</p>
          )}

          <ul className={styles.list}>
            {filtered.map((p) => (
              <li key={p.id} className={styles.item}>
                {p.image && (
                  <img
                    src={p.image}
                    alt={p.title}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div>
                  <strong>{p.title}</strong>
                  <div>${p.price}</div>
                  <small>{p.category}</small>
                </div>

                <div className={styles.actions}>
                  <button type="button" className={styles.editBtn}
                    onClick={() => handleEdit(p)}
                    disabled={deletingId === p.id}>
                    Edit
                  </button>
                  <button type="button" className={styles.deleteBtn}
                    onClick={() => handleDelete(p)}
                    disabled={deletingId === p.id}>
                    {deletingId === p.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}