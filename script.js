/*
  script.js
  - Defines the gallery data array and dynamically builds the gallery DOM.
  - Implements lightbox (modal) behavior with next/previous/close and keyboard support.

  How to use:
  - Put your image files in an `images/` folder next to these files, or use relative paths.
  - Add or remove entries from the `galleryImages` array below. Each item needs `src` and `title`; `caption` is optional.
*/

// Gallery data: edit this array to add/remove photos.
const galleryImages = [
  {
    src: "images/photo1.jpg",
    title: "Sunset Beach",
    caption: "A calm evening at the shore.",
  },
  {
    src: "images/photo2.jpg",
    title: "Mountain Peak",
    caption: "Snowy summit under blue sky.",
  },
  {
    src: "images/photo3.jpg",
    title: "City Night",
    caption: "Lights and reflections on wet streets.",
  },
  {
    src: "images/photo4.jpg",
    title: "Forest Path",
    caption: "Misty morning walk.",
  },
];

/*
  Developer / admin defaults
  - DEFAULT_ALLOW_USER_UPLOADS: default behavior if no saved setting exists.
  - DEFAULT_ADMIN_PASSWORD: change this string in the source before deploying.
*/
const DEFAULT_ALLOW_USER_UPLOADS = true;
const DEFAULT_ADMIN_PASSWORD = "admin123"; // change before deploying

// In-memory arrays
let userImages = []; // will hold { id, blob, title, caption, timestamp, objectUrl }
let allImages = []; // combined static + user images

// IndexedDB config
const DB_NAME = "gallery-db";
const DB_VERSION = 1;
const STORE_IMAGES = "user-images";
const STORE_SETTINGS = "settings";

let dbPromise = null; // will hold the opened DB

// If you want images in the same folder as these files, use 'photo1.jpg' etc. Otherwise use subfolders like 'images/...'.

// --- DOM references ---
const galleryEl = document.getElementById("gallery");
const lightbox = document.getElementById("lightbox");
const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxText = document.getElementById("lightboxText");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

// uploader elements
const uploaderSection = document.getElementById("uploader");
const uploadDrop = document.getElementById("uploadDrop");
const fileInput = document.getElementById("fileInput");
const clearUploadsBtn = document.getElementById("clearUploads");

let currentIndex = 0;
let serverImages = []; // images stored on server

// Notification helper
function showNotification(message, timeout = 3000) {
  let el = document.querySelector(".notification");
  if (!el) {
    el = document.createElement("div");
    el.className = "notification";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showNotification._timer);
  showNotification._timer = setTimeout(() => {
    el.classList.remove("show");
  }, timeout);
}

// Lightbox controls
function openLightbox(index) {
  currentIndex = index;
  updateLightbox();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  // focus the close button for accessibility
  setTimeout(() => lightboxClose.focus(), 50);
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
}

function updateLightbox() {
  const item = allImages[currentIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = item.title || "";
  lightboxTitle.textContent = item.title || "";
  lightboxText.textContent = item.caption || "";
}
function openAdmin() {
  // open a small popup window for password input
  const w = 420,
    h = 260;
  const left = screen.width / 2 - w / 2;
  const top = screen.height / 2 - h / 2;
  const features = `width=${w},height=${h},left=${left},top=${top},resizable=no`;
  try {
    adminPopupWindow = window.open("", "adminPopup", features);
    if (!adminPopupWindow) {
      alert(
        "Popup blocked — allow popups for this site or use the Admin modal."
      );
      return;
    }
    const popupHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Admin Login</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:18px;background:#f7f7f8}label{display:block;margin-bottom:6px}input{width:100%;padding:8px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px}button{padding:8px 12px;border-radius:6px}</style></head><body><h3>Admin Login</h3><label for="pwd">Password</label><input id="pwd" type="password" autofocus /><div style="display:flex;gap:8px;justify-content:flex-end"><button id="submit">Submit</button><button id="cancel">Cancel</button></div><script>const submit=document.getElementById('submit');const cancel=document.getElementById('cancel');submit.addEventListener('click',()=>{const v=document.getElementById('pwd').value;window.opener.postMessage({type:'adminAuth',password:v},window.location.origin);});cancel.addEventListener('click',()=>{window.close();});window.addEventListener('keydown',(e)=>{if(e.key==='Enter') submit.click();});window.addEventListener('message',(e)=>{if(e.origin!==window.location.origin) return; if(e.data && e.data.type==='adminAuthResult'){ if(e.data.success){ window.close(); } else { alert('Invalid password'); } }});</script></body></html>`;
    adminPopupWindow.document.open();
    adminPopupWindow.document.write(popupHtml);
    adminPopupWindow.document.close();
  } catch (err) {
    console.error("Unable to open admin popup", err);
    // fallback to modal
    adminModal.classList.add("open");
    adminModal.setAttribute("aria-hidden", "false");
    setTimeout(() => adminPassword.focus(), 50);
  }
}
function prevImage() {
  currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
  updateLightbox();
}

// Event listeners
lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", prevImage);
lightboxNext.addEventListener("click", nextImage);

lightboxOverlay.addEventListener("click", (e) => {
  // clicking overlay closes
  if (e.target === lightboxOverlay) closeLightbox();
});

// Keyboard: ESC to close, arrows to move
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
});

// Close when clicking outside image area (in content but not on image)
document.getElementById("lightbox").addEventListener("click", (e) => {
  // close only when clicking the overlay itself (handled above) or clicks outside inner content
  const content = e.target.closest(".lightbox-content");
  if (!content) closeLightbox();
});

/* ----------------- IndexedDB + upload handling ----------------- */

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function dbAddUserImage(blob, title = "", caption = "") {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readwrite");
        const store = tx.objectStore(STORE_IMAGES);
        const item = { blob, title, caption, timestamp: Date.now() };
        const req = store.add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function dbGetAllUserImages() {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function dbClearUserImages() {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readwrite");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function dbSaveSetting(key, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, "readwrite");
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.put({ key, value });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function dbGetSetting(key) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, "readonly");
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get(key);
        req.onsuccess = () =>
          resolve(req.result ? req.result.value : undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

// Utility: resize/compress an image File -> Blob
function resizeImage(file, maxWidth = 1600, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // try createImageBitmap for better performance
    if (window.createImageBitmap) {
      createImageBitmap(file)
        .then((bitmap) => {
          let { width, height } = bitmap;
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          const w = Math.round(width * ratio);
          const h = Math.round(height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("toBlob failed"));
            },
            "image/jpeg",
            quality
          );
        })
        .catch((err) => {
          // fallback to FileReader + Image
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              let w = img.width,
                h = img.height;
              const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob(
                (blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error("toBlob failed"));
                },
                "image/jpeg",
                quality
              );
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
    } else {
      // older browsers fallback
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width,
            h = img.height;
          const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("toBlob failed"));
            },
            "image/jpeg",
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// load images from IndexedDB into userImages (create object URLs)
let _objectUrls = [];
async function loadUserImagesFromDB() {
  // revoke old object URLs
  _objectUrls.forEach((url) => URL.revokeObjectURL(url));
  _objectUrls = [];
  userImages = [];
  const rows = await dbGetAllUserImages();
  rows.forEach((r) => {
    const objectUrl = URL.createObjectURL(r.blob);
    _objectUrls.push(objectUrl);
    userImages.push({
      id: r.id,
      src: objectUrl,
      title: r.title || r.id,
      caption: r.caption || "",
      timestamp: r.timestamp,
    });
  });
}

// Fetch images stored on server
async function fetchServerImages() {
  try {
    const r = await fetch("/api/images");
    if (!r.ok) return;
    const items = await r.json();
    serverImages = items.map((i) => ({
      id: i.id,
      src: i.url,
      title: i.title,
      caption: i.caption,
    }));
  } catch (e) {
    serverImages = [];
  }
}

async function handleFiles(files) {
  const filesArr = Array.from(files).filter(
    (f) => f.type && f.type.startsWith("image/")
  );
  if (filesArr.length === 0) return;

  // Try upload to server first
  let serverSuccess = false;
  try {
    const form = new FormData();
    // Resize each file in parallel then append
    const resizedPromises = filesArr.map(async (file) => {
      const blob = await resizeImage(file, 1600, 1200, 0.78);
      // need a File/Blob with filename for form-data
      const f = new File([blob], file.name, { type: "image/jpeg" });
      form.append("files", f);
    });
    await Promise.all(resizedPromises);
    const resp = await fetch("/api/upload", { method: "POST", body: form });
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.success) {
        serverSuccess = true;
      }
    }
  } catch (e) {
    console.warn("Server upload failed, will fallback to local storage", e);
  }

  if (serverSuccess) {
    // Refresh server images
    await fetchServerImages();
    renderGallery();
    showNotification("Uploaded to server", 2000);
    return;
  }

  // Fallback: store in IndexedDB
  for (const file of filesArr) {
    try {
      const blob = await resizeImage(file, 1600, 1200, 0.78);
      await dbAddUserImage(blob, file.name, "");
    } catch (e) {
      console.error("Failed to process file", e);
    }
  }
  await loadUserImagesFromDB();
  renderGallery();
}

async function clearUserImages() {
  if (!confirm("Remove all uploaded images from this browser?")) return;
  await dbClearUserImages();
  _objectUrls.forEach((url) => URL.revokeObjectURL(url));
  _objectUrls = [];
  userImages = [];
  renderGallery();
}

// Uploader wiring (drag/drop and file input)
function wireUploader(allowUploads) {
  if (!uploaderSection) return;
  if (!allowUploads) {
    uploaderSection.setAttribute("aria-hidden", "true");
    uploaderSection.style.display = "none";
    return;
  }
  uploaderSection.setAttribute("aria-hidden", "false");
  uploaderSection.style.display = "";

  // attach listeners only once
  if (wireUploader._wired) return;
  wireUploader._wired = true;

  uploadDrop.addEventListener("click", () => fileInput.click());
  uploadDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadDrop.classList.add("dragover");
  });
  uploadDrop.addEventListener("dragleave", () =>
    uploadDrop.classList.remove("dragover")
  );
  uploadDrop.addEventListener("drop", async (e) => {
    e.preventDefault();
    uploadDrop.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files)
      await handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", async (e) => {
    if (e.target.files) await handleFiles(e.target.files);
  });
  clearUploadsBtn.addEventListener("click", clearUserImages);
}

// Admin UI wiring
const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const adminOverlay = document.getElementById("adminOverlay");
const adminClose = document.getElementById("adminClose");
const adminLogin = document.getElementById("adminLogin");
const adminPassword = document.getElementById("adminPassword");
const adminAuthArea = document.getElementById("adminAuthArea");
const toggleUploads = document.getElementById("toggleUploads");
let adminPopupWindow = null;

async function validateAdminPassword(password) {
  // try server-side validation
  try {
    const res = await fetch("/api/admin/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) return true;
    }
  } catch (e) {
    /*server unreachable*/
  }
  // fallback to local password (insecure) if server not reachable
  return password === DEFAULT_ADMIN_PASSWORD;
}

function openAdmin() {
  // navigate to admin page instead of popup
  window.location.href = "/admin.html";
}

function closeAdmin() {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
  adminPassword.value = "";
  adminAuthArea.style.display = "none";
}

adminBtn && adminBtn.addEventListener("click", openAdmin);
adminClose && adminClose.addEventListener("click", closeAdmin);
adminOverlay && adminOverlay.addEventListener("click", closeAdmin);

// handle messages from the popup (password submission)
window.addEventListener("message", async (e) => {
  if (e.origin !== window.location.origin) return;
  const data = e.data || {};
  if (data.type === "adminAuth") {
    const pwd = data.password || "";
    const valid = await validateAdminPassword(pwd);
    // respond to popup
    try {
      if (adminPopupWindow && !adminPopupWindow.closed)
        adminPopupWindow.postMessage(
          { type: "adminAuthResult", success: !!valid },
          window.location.origin
        );
    } catch (_) {}
    if (valid) {
      // short timeout for UX before revealing admin controls
      showNotification("Authenticated", 1000);
      setTimeout(async () => {
        adminModal.classList.add("open");
        adminModal.setAttribute("aria-hidden", "false");
        adminAuthArea.style.display = "";
        const saved = await dbGetSetting("allow_uploads");
        const current =
          saved !== undefined ? saved : DEFAULT_ALLOW_USER_UPLOADS;
        toggleUploads.checked = !!current;
        toggleUploads.onchange = async (ev) => {
          await dbSaveSetting("allow_uploads", !!ev.target.checked);
          wireUploader(!!ev.target.checked);
        };
        try {
          if (adminPopupWindow && !adminPopupWindow.closed)
            adminPopupWindow.close();
        } catch (_) {}
      }, 600);
    }
  }
});

// fallback admin login inside modal (keeps previous behavior but uses server)
adminLogin &&
  adminLogin.addEventListener("click", async () => {
    const val = adminPassword.value || "";
    const valid = await validateAdminPassword(val);
    if (valid) {
      adminAuthArea.style.display = "";
      const saved = await dbGetSetting("allow_uploads");
      const current = saved !== undefined ? saved : DEFAULT_ALLOW_USER_UPLOADS;
      toggleUploads.checked = !!current;
      toggleUploads.onchange = async (e) => {
        await dbSaveSetting("allow_uploads", !!e.target.checked);
        wireUploader(!!e.target.checked);
      };
    } else {
      alert("Invalid password");
    }
  });

// Rendering: use loading=lazy and object URLs for user images
function renderGallery() {
  allImages = galleryImages.concat(serverImages, userImages);
  galleryEl.innerHTML = "";
  allImages.forEach((img, idx) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    figure.tabIndex = 0;

    const image = document.createElement("img");
    image.alt = img.title || `Photo ${idx + 1}`;
    image.loading = "lazy";
    image.dataset.index = idx;
    // set src directly (browser native lazy-loading will defer download where supported)
    image.src = img.src;

    const meta = document.createElement("div");
    meta.className = "meta";
    const h = document.createElement("h3");
    h.textContent = img.title || "";
    const p = document.createElement("p");
    p.textContent = img.caption || "";
    meta.appendChild(h);
    if (img.caption) meta.appendChild(p);

    figure.appendChild(image);
    figure.appendChild(meta);
    figure.addEventListener("click", () => openLightbox(idx));
    figure.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openLightbox(idx);
    });
    galleryEl.appendChild(figure);
  });
}

// Initialize everything
async function init() {
  await openDB();
  const savedAllow = await dbGetSetting("allow_uploads");
  let allowUploads =
    savedAllow !== undefined ? savedAllow : DEFAULT_ALLOW_USER_UPLOADS;
  // try to get server setting if available
  try {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const s = await r.json();
      if (s && s.allow_uploads !== undefined) allowUploads = !!s.allow_uploads;
    }
  } catch (e) {
    /* server unavailable, keep local */
  }

  wireUploader(allowUploads);
  await loadUserImagesFromDB();
  await fetchServerImages();
  renderGallery();
}

init().catch((err) => console.error("Init error", err));

// Lightbox event listeners (already defined above) remain functional

// Expose minimal debug API
window._gallery = {
  galleryImages,
  userImages,
  openLightbox,
  dbGetAllUserImages,
};
