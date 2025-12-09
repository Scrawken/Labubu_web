# My Photo Gallery

Simple, minimal single-page photo gallery using plain HTML, CSS, and JavaScript.

Files in this folder:

- `index.html` — main page and markup
- `styles.css` — styles for layout, gallery, and lightbox
- `script.js` — gallery data array and lightbox behavior

Add your images

1. Create a folder named `images` next to these files (e.g. `c:/Projects/Labubu_web/images`).
2. Copy your image files into `images/` (e.g. `photo1.jpg`, `photo2.jpg`).

Update the gallery

- Open `script.js` and edit the `galleryImages` array near the top. Example entry:

```js
{ src: 'images/photo1.jpg', title: 'Sunset Beach', caption: 'A calm evening at the shore.' }
```

- Use relative paths. If you prefer keeping images in the same folder as `index.html`, use `src: 'photo1.jpg'`.

Run locally

- Easiest (recommended): run a simple HTTP server from the project folder.

With Python 3:

```bash
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Or open `index.html` directly in your browser (double-click). Some browsers restrict local file loading; the server is recommended.

Notes

- To add/remove photos, edit the array in `script.js` and refresh the page.
- The modal supports keyboard navigation: `Esc` closes, arrow keys move between photos.

If you want extra features (lazy loading, swipe support, thumbnails strip), tell me which one and I can add it.

---

Uploading from the page (user-posted images)

- This gallery includes an optional client-side uploader that lets site visitors add images directly from their browser. Uploaded images are stored in the visitor's browser using IndexedDB (binary Blobs) and are not uploaded to any server.
- The uploader can be enabled/disabled from the site UI using the Admin modal (password-protected). Click the `Admin` button in the header to open the admin modal. The default admin password is defined in `script.js` as `DEFAULT_ADMIN_PASSWORD` — change it before deploying.

Admin toggle (enable/disable uploads)

- Open the Admin modal and enter the password. After successful auth you'll see a checkbox `Allow user uploads`. Toggle that to enable/disable the uploader for site visitors. The setting is saved in the site IndexedDB.

User uploads and compression

- When users upload images via the uploader (file input or drag/drop), images are resized and compressed on the client before being saved to IndexedDB. This helps reduce storage size and keeps the gallery responsive.
- Uploaded images appear immediately in the gallery and persist in the browser until cleared with the `Clear Uploaded Images` button.

Security / storage notes:

- Images are stored as binary Blobs in IndexedDB; this is more suitable than localStorage for larger files. Still, IndexedDB is local to the browser and machine — for shared galleries or production use you should implement a server-side upload and storage solution.

---

Server-backed admin & validation

- This project now includes a minimal Node/Express server that serves the static files and exposes an endpoint for admin password validation.
- To run the server locally:

```bash
npm install
npm start
# then open http://localhost:3000 in your browser
```

- The server checks the admin password at `POST /api/admin/validate`.
- For convenience the server's default admin password is `Labuttplug`. To change it, set the `ADMIN_PASSWORD` environment variable before starting the server, for example:

```bash
ADMIN_PASSWORD=your-secret npm start
```

- The client will contact the server to validate admin logins. If the server is unreachable, the client falls back to the local password defined in `script.js` (not secure).

---

# Labubu_web
