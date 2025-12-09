// Simple Express server to validate admin password and serve static files
// Usage: `node server.js` (install dependencies first: `npm install`)

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const multer = require("multer");
const app = express();

// Change this password server-side; do NOT commit a secret in real projects.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Labuttplug";

const DATA_DIR = path.resolve(__dirname, "uploads");
const META_FILE = path.resolve(__dirname, "images.json");
const SETTINGS_FILE = path.resolve(__dirname, "settings.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(bodyParser.json({ limit: "20mb" }));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, DATA_DIR);
  },
  filename: function (req, file, cb) {
    // preserve original extension
    const name =
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 9) +
      path.extname(file.originalname);
    cb(null, name);
  },
});
const upload = multer({ storage });

// Helper to load/save metadata
function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf8") || "[]");
  } catch (e) {
    return [];
  }
}
function saveMeta(meta) {
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8") || "{}");
  } catch (e) {
    return {};
  }
}
function saveSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

// Ensure settings file exists with default allow_uploads true
const initialSettings = loadSettings();
if (initialSettings.allow_uploads === undefined) {
  initialSettings.allow_uploads = true;
  saveSettings(initialSettings);
}

// Validate admin password endpoint (POST)
app.post("/api/admin/validate", (req, res) => {
  const pw = req.body && req.body.password ? String(req.body.password) : "";
  if (pw === ADMIN_PASSWORD) return res.json({ success: true });
  return res.json({ success: false });
});

// Upload endpoint (can be used by visitors). Uses multipart form-data (files[]). Returns metadata items.
app.post("/api/upload", upload.array("files"), (req, res) => {
  const settings = loadSettings();
  if (!settings.allow_uploads) {
    return res.status(403).json({ error: "Uploads disabled" });
  }
  const meta = loadMeta();
  const added = [];
  for (const file of req.files) {
    const item = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      title: file.originalname,
      caption: "",
      timestamp: Date.now(),
    };
    meta.push(item);
    added.push(item);
  }
  saveMeta(meta);
  return res.json({ success: true, items: added });
});

// Helper to delete all images (admin)
function clearAllImages(pw, res) {
  if (pw !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized" });
  const meta = loadMeta();
  for (const item of meta) {
    try {
      fs.unlinkSync(path.join(DATA_DIR, item.filename));
    } catch (e) {
      /* ignore missing */
    }
  }
  saveMeta([]);
  return res.json({ success: true, removed: meta.length });
}

// Delete all images (admin) to clear gallery
app.delete("/api/images", (req, res) => {
  const pw = req.get("x-admin-password") || "";
  return clearAllImages(pw, res);
});
// Alias endpoint to avoid caching/proxy weirdness
app.delete("/api/images/clear", (req, res) => {
  const pw = req.get("x-admin-password") || "";
  return clearAllImages(pw, res);
});

// List uploaded images (public)
app.get("/api/images", (req, res) => {
  const meta = loadMeta();
  return res.json(meta.reverse());
});

// Delete image (admin only via header 'x-admin-password')
app.delete("/api/images/:id", (req, res) => {
  const pw = req.get("x-admin-password") || "";
  if (pw !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  let meta = loadMeta();
  const idx = meta.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const [removed] = meta.splice(idx, 1);
  try {
    fs.unlinkSync(path.join(DATA_DIR, removed.filename));
  } catch (e) {}
  saveMeta(meta);
  return res.json({ success: true });
});

// Edit image metadata (admin)
app.put("/api/images/:id", (req, res) => {
  const pw = req.get("x-admin-password") || "";
  if (pw !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  let meta = loadMeta();
  const idx = meta.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const item = meta[idx];
  const { title, caption } = req.body || {};
  if (typeof title === "string") item.title = title;
  if (typeof caption === "string") item.caption = caption;
  meta[idx] = item;
  saveMeta(meta);
  return res.json({ success: true, item });
});

// Settings endpoints
app.get("/api/settings", (req, res) => {
  const s = loadSettings();
  res.json(s);
});
app.post("/api/settings", (req, res) => {
  const pw = req.get("x-admin-password") || "";
  if (pw !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized" });
  const s = loadSettings();
  if (req.body.allow_uploads !== undefined)
    s.allow_uploads = !!req.body.allow_uploads;
  saveSettings(s);
  res.json({ success: true, settings: s });
});

// Serve uploaded files and static files
app.use("/uploads", express.static(DATA_DIR));
app.use(express.static(path.resolve(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
