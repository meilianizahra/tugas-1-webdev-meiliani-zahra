const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 4000;
const FAKESTORE = "https://fakestoreapi.com";
// Kunci rahasia untuk menandatangani token. Untuk belajar saja, jangan dipakai di produksi.
const JWT_SECRET = process.env.JWT_SECRET || "rahasia-belajar-jangan-dipakai-di-produksi";

app.use(cors());
app.use(express.json()); // supaya req.body bisa membaca JSON

// =====================================================================
// 1. DATA (disimpan di memori, akan KEMBALI KE AWAL setiap server restart)
// =====================================================================
let products = [];
let nextProductId = 1;
let users = [];
let nextUserId = 1;

// Data cadangan kalau fakestoreapi.com tidak bisa diakses
const FALLBACK_PRODUCTS = [
  { title: "Kaos Polos", price: 59.9, description: "Kaos katun nyaman", category: "men's clothing", image: "" },
  { title: "Tas Ransel", price: 109.95, description: "Tas untuk laptop 15 inci", category: "men's clothing", image: "" },
  { title: "Headphone", price: 89.5, description: "Headphone nirkabel", category: "electronics", image: "" },
];

// Ambil data awal produk dari fakestoreapi satu kali saat server menyala
async function seedProducts() {
  let list = FALLBACK_PRODUCTS;
  try {
    const res = await fetch(`${FAKESTORE}/products`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (res.ok && Array.isArray(data) && data.length > 0) list = data;
  } catch {
    console.log("fakestoreapi tidak bisa diakses, memakai data cadangan");
  }
  products = list.map((p, i) => ({
    id: p.id ?? i + 1,
    title: p.title,
    price: p.price,
    description: p.description,
    category: p.category,
    image: p.image,
  }));
  nextProductId = Math.max(...products.map((p) => p.id)) + 1;
}

// Akun demo dari Modul 1 tetap ada, jadi tampilan web tetap bisa login
function seedUsers() {
  users = [
    {
      id: 1,
      username: "mor_2314",
      email: "morrison@gmail.com",
      passwordHash: bcrypt.hashSync("83r5^_", 10), // password TIDAK disimpan apa adanya
    },
  ];
  nextUserId = 2;
}

// =====================================================================
// 2. FUNGSI BANTU
// =====================================================================
const isBlank = (v) => typeof v !== "string" || v.trim() === "";

// Hapus passwordHash sebelum dikirim ke client
const publicUser = ({ passwordHash, ...rest }) => rest;

const usernameTaken = (username, exceptId) =>
  users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== exceptId);

// partial = true dipakai oleh PATCH (hanya field yang dikirim yang dicek)
function validateProduct(body, partial) {
  const errors = [];
  const { title, price, description, category, image } = body || {};
  if (!partial || title !== undefined) {
    if (isBlank(title)) errors.push("title is required (string)");
  }
  if (!partial || price !== undefined) {
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
  errors.push("price is required (number > 0)");
}
  }
  for (const [name, value] of Object.entries({ description, category, image })) {
    if (value !== undefined && typeof value !== "string") errors.push(`${name} must be a string`);
  }
  return errors;
}

function validateUser(body, partial) {
  const errors = [];
  const { username, email, password } = body || {};
  if (!partial || username !== undefined) {
    if (isBlank(username) || username.trim().length < 3) errors.push("username is required (min 3 characters)");
  }
  if (!partial || email !== undefined) {
    if (isBlank(email) || !email.includes("@")) errors.push("email is required (must contain @)");
  }
  if (!partial || password !== undefined) {
    if (typeof password !== "string" || password.length < 6) errors.push("password is required (min 6 characters)");
  }
  return errors;
}

// Middleware: cek header "Authorization: Bearer <token>"
function auth(req, res, next) {
  const [type, token] = (req.headers.authorization || "").split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token is missing. Login first, then send header Authorization: Bearer <token>" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!users.some((u) => u.id === payload.id)) throw new Error("user no longer exists");
    req.user = payload; // { id, username }
    next();
  } catch {
    res.status(401).json({ message: "Token is invalid or expired" });
  }
}

// Cari akun dari :id, pastikan itu akun milik yang sedang login
function findOwnUser(req, res) {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  if (user.id !== req.user.id) {
    res.status(403).json({ message: "You can only change your own account" });
    return null;
  }
  return user;
}

// =====================================================================
// 3. ENDPOINT UMUM
// =====================================================================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// =====================================================================
// 4. AKUN (USERS) + LOGIN
// =====================================================================

// CREATE akun (daftar) - terbuka, tidak perlu login
app.post("/api/users", (req, res) => {
  const errors = validateUser(req.body, false);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });

  const { username, email, password } = req.body;
  if (usernameTaken(username, null)) return res.status(409).json({ message: "Username already used" });

  const user = {
    id: nextUserId++,
    username: username.trim(),
    email: email.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
  };
  users.push(user);
  res.status(201).json(publicUser(user));
});

// LOGIN - mengembalikan token
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: publicUser(user) });
});

// READ semua akun (perlu login)
app.get("/api/users", auth, (req, res) => {
  res.json(users.map(publicUser));
});

// READ satu akun (perlu login)
app.get("/api/users/:id", auth, (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(publicUser(user));
});

// UPDATE akun, ganti semua data (PUT) - hanya akun sendiri
app.put("/api/users/:id", auth, (req, res) => {
  const user = findOwnUser(req, res);
  if (!user) return;

  const errors = validateUser(req.body, false);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });

  const { username, email, password } = req.body;
  if (usernameTaken(username, user.id)) return res.status(409).json({ message: "Username already used" });

  user.username = username.trim();
  user.email = email.trim();
  user.passwordHash = bcrypt.hashSync(password, 10);
  res.json(publicUser(user));
});

// UPDATE akun, ubah sebagian data (PATCH) - hanya akun sendiri
app.patch("/api/users/:id", auth, (req, res) => {
  const user = findOwnUser(req, res);
  if (!user) return;

  const { username, email, password } = req.body || {};
  if (username === undefined && email === undefined && password === undefined) {
    return res.status(400).json({ message: "Send at least one of: username, email, password" });
  }
  const errors = validateUser(req.body, true);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });
  if (username !== undefined && usernameTaken(username, user.id)) {
    return res.status(409).json({ message: "Username already used" });
  }

  if (username !== undefined) user.username = username.trim();
  if (email !== undefined) user.email = email.trim();
  if (password !== undefined) user.passwordHash = bcrypt.hashSync(password, 10);
  res.json(publicUser(user));
});

// DELETE akun - hanya akun sendiri
app.delete("/api/users/:id", auth, (req, res) => {
  const user = findOwnUser(req, res);
  if (!user) return;

  users = users.filter((u) => u.id !== user.id);
  res.json({ message: "User deleted", user: publicUser(user) });
});

// =====================================================================
// 5. PRODUK
// =====================================================================

// READ semua produk (terbuka)
app.get("/api/products", (req, res) => {
  res.json(products);
});

// READ satu produk (terbuka)
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// CREATE produk (perlu login)
app.post("/api/products", auth, (req, res) => {
  const errors = validateProduct(req.body, false);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });

  const { title, price, description = "", category = "", image = "" } = req.body;
  const product = { id: nextProductId++, title: title.trim(), price, description, category, image };
  products.push(product);
  res.status(201).json(product);
});

// UPDATE produk, ganti semua data (PUT) - field yang tidak dikirim kembali ke nilai kosong
app.put("/api/products/:id", auth, (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Product not found" });

  const errors = validateProduct(req.body, false);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });

  const { title, price, description = "", category = "", image = "" } = req.body;
  products[index] = { id: products[index].id, title: title.trim(), price, description, category, image };
  res.json(products[index]);
});

// UPDATE produk, ubah sebagian data (PATCH) - hanya field yang dikirim yang berubah
app.patch("/api/products/:id", auth, (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });

  const errors = validateProduct(req.body, true);
  if (errors.length > 0) return res.status(400).json({ message: "Validation failed", errors });

  const changes = {};
  for (const key of ["title", "price", "description", "category", "image"]) {
    if (req.body[key] !== undefined) changes[key] = req.body[key];
  }
  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ message: "Send at least one of: title, price, description, category, image" });
  }
  if (changes.title) changes.title = changes.title.trim();

  Object.assign(product, changes);
  res.json(product);
});

// DELETE produk (perlu login)
app.delete("/api/products/:id", auth, (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Product not found" });

  const [removed] = products.splice(index, 1);
  res.json({ message: "Product deleted", product: removed });
});

// =====================================================================
// 6. PENANGANAN ERROR
// =====================================================================
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// =====================================================================
// 7. JALANKAN SERVER
// =====================================================================
seedUsers();
seedProducts().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
});