# Tugas 1 Web Development: Admin Page Pengelolaan Produk

Halaman admin `/admin` pada proyek `fakestore-demo` untuk menampilkan dan mengelola produk melalui REST API.

**Nama:** Meiliani Zahra

## Tech Stack
- Front-End: Next.js (React)
- Back-End: Express + JWT (data disimpan di memori, kembali ke awal saat server restart)

## Cara Menjalankan

1. Back-End (port 4000)
   ```bash
   cd server
   npm install
   npm start
   ```
2. Front-End (port 3000), di terminal lain
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Buka http://localhost:3000, login dengan akun demo:
   - Username: `mor_2314`
   - Password: `83r5^_`
4. Buka http://localhost:3000/admin

## Fitur

**Wajib**
- Halaman `/admin` berisi formulir tambah produk dan daftar produk, responsif di laptop dan ponsel
- Form: title, price, description, category, image
- Validasi front-end dan back-end: title wajib diisi (tidak boleh hanya spasi), price harus angka lebih dari 0
- `GET /api/products` untuk daftar produk, `POST /api/products` dengan header `Authorization: Bearer <token>`
- Pengguna yang belum login diarahkan ke halaman login
- Status loading, tombol submit nonaktif saat proses, pesan berhasil atau gagal
- Setelah sukses, form dikosongkan dan daftar diperbarui tanpa reload

**Bonus**
- Edit produk
- Hapus produk dengan konfirmasi
- Pencarian produk berdasarkan nama atau kategori

## Pengujian API (Postman)

Collection ada di folder `postman/`. Cara memakai: import file JSON ke Postman, jalankan request **Login**, salin token dari respons, lalu tempel di tab Authorization pada collection.

| Skenario | Status |
|---|---|
| Produk valid + token valid | 201 |
| Title kosong / hanya spasi | 400 |
| Price nol atau negatif | 400 |
| Tanpa token | 401 |