"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("mor_2314");
  const [password, setPassword] = useState("83r5^_");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) router.replace("/products");
  }, [router]);

  async function handleSubmit(event) {
    // TODO 1: Cegah halaman melakukan reload
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // TODO 2: Panggil fungsi login dengan username dan password
      const data = await login (username, password);

      // TODO 3: Simpan token hasil login ke localStorage
      localStorage.setItem("token", data.token);

      localStorage.setItem("username", data.user.username);
      router.push("/products");
    } catch (err) {
      setError(err.message);
    } finally {
      // TODO 4: Matikan status loading
      setLoading(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Login</h1>
        <p className="muted">Pakai akun demo fakestoreapi.</p>
        {/* TODO 5: Tampilkan pesan error jika proses login gagal */}
      {error && <div className="error">{error}</div>}

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
