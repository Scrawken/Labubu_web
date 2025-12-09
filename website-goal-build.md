# Labubu Web Gallery – Goals & Build Summary

## Project Overview

**Labubu Web Gallery** is a single-page, locally-hosted photo gallery application built with plain HTML, CSS, and JavaScript. It allows users to browse a curated photo collection, upload their own images, and provides an admin interface for managing content and controlling upload permissions.

---

## Primary Goals

### 1. **Create a Simple, Clean Photo Gallery**

- Build a responsive, single-page website suitable for local deployment.
- Display images in a modern, minimal grid layout.
- Support desktop, tablet, and mobile viewports.

### 2. **Implement an Interactive Lightbox/Modal**

- Open images in a modal overlay with:
  - Image title and caption display
  - Previous/Next navigation buttons
  - Close button and keyboard support (ESC to close, arrows to navigate)
  - Click outside modal to close
  - Overlay background to distinguish modal from page content

### 3. **Enable User Uploads**

- Allow site visitors to post/upload images directly from the page.
- Provide an intuitive uploader UI with:
  - Drag-and-drop file area
  - File input button
  - Clear/reset button
  - Visual feedback during upload

### 4. **Implement Developer/Admin Controls**

- Add a developer toggle to enable/disable user uploads site-wide.
- Create an admin area with password protection for:
  - Toggling upload permissions on/off
  - Editing image titles and captions
  - Deleting user-submitted images
  - Viewing and managing all uploaded content

### 5. **Optimize Performance & Storage**

- Implement lazy-loading for gallery images to reduce initial page load.
- Compress images client-side before upload/storage to limit file sizes.
- Support both local (IndexedDB) and server-based storage for uploaded images.

### 6. **Ensure Secure Admin Access**

- Validate admin password server-side.
- Protect admin endpoints with password-based authentication.
- Provide a dedicated admin page (not popup-based, for reliability).

---

## Technical Stack

| Layer                 | Technology                                  | Purpose                                                     |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| **Frontend**          | HTML5, CSS3, Vanilla JavaScript             | Responsive UI, lightbox, uploader, client-side logic        |
| **Client Storage**    | IndexedDB                                   | Fallback storage for user uploads (when server unavailable) |
| **Server**            | Node.js + Express.js                        | Static file serving, API endpoints, upload handling         |
| **Upload Middleware** | Multer v2.0.2                               | Multipart form-data file handling                           |
| **File Storage**      | Filesystem (`uploads/` directory)           | Server-side uploaded image storage                          |
| **Metadata**          | JSON files (`images.json`, `settings.json`) | Image metadata and site settings persistence                |

---

## Build Timeline & Key Steps

### Phase 1: Static Gallery Foundation

**Goal:** Create the core gallery with responsive layout and lightbox.

1. **Created `index.html`**

   - Semantic HTML structure with header (site title, nav) and main gallery grid.
   - Lightbox modal markup with title, caption, image, prev/next buttons, close button.
   - Commented sections for where to place local image files.

2. **Created `styles.css`**

   - Responsive CSS Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile).
   - Modal/lightbox styling with overlay, animations, and focus states.
   - Modern minimal design with neutral color palette.
   - Shimmer placeholder animation for lazy-loaded images.

3. **Created `script.js` – Part 1: Gallery Logic**
   - `galleryImages` array: Static gallery data with image URLs, titles, captions.
   - `renderGallery()`: Dynamically builds gallery DOM from data array.
   - `openLightbox()`, `closeLightbox()`, `updateLightbox()`: Modal state management.
   - `nextImage()`, `prevImage()`: Navigation logic.
   - Keyboard event listeners: ESC to close, arrow keys to navigate, Enter to open.
   - Overlay click handler: Close modal when clicking outside image.

### Phase 2: User Upload Capability

**Goal:** Allow visitors to upload images client-side with fallback storage.

4. **Extended `index.html`**

   - Added uploader section: drop zone, file input, clear button.
   - Added uploader UI with drag-and-drop visual feedback.
   - Styled uploader to match gallery aesthetic.

5. **Extended `script.js` – Part 2: IndexedDB & Compression**

   - `openDB()`, `dbAddUserImage()`, `dbGetAllUserImages()`, `dbClearUserImages()`: IndexedDB helpers.
   - Replaced `localStorage` with IndexedDB for binary Blob storage (supports larger images).
   - `resizeImage(file, maxWidth, maxHeight, quality)`: Client-side image compression.
     - Uses canvas + `createImageBitmap()` to resize.
     - Outputs compressed JPEG (default: 1600×1200, quality ~0.78).
   - `loadUserImagesFromDB()`: Create object URLs from stored Blobs for rendering.
   - Uploader wiring: drag-and-drop + file input handlers.

6. **Created `README.md`**
   - Instructions for running locally.
   - Documentation of uploader feature.
   - Notes on enabling/disabling uploads via developer toggle.

### Phase 3: Admin Control & Server Integration

**Goal:** Add server-backed admin management and persistent storage for uploaded images.

7. **Created `server.js` – Express Server**

   - Static file serving: `index.html`, `styles.css`, `script.js`, `admin.html`, uploads directory.
   - Endpoints implemented:
     - `POST /api/admin/validate`: Validate admin password (plaintext, should be hardened).
     - `POST /api/upload`: Accept multipart file uploads, store to `uploads/`, persist metadata to `images.json`.
     - `GET /api/images`: Return list of uploaded image metadata.
     - `DELETE /api/images/:id`: Delete image file and metadata (admin-only, via header auth).
     - `PUT /api/images/:id`: Edit image title/caption (admin-only).
     - `GET /api/settings` / `POST /api/settings`: Get/set site-wide settings like `allow_uploads` flag.
   - Default admin password: `Labuttplug` (override via `ADMIN_PASSWORD` env var).
   - Admin actions require `X-Admin-Password` header for authentication.

8. **Created `package.json`**

   - Dependencies: `express@^4.18.2`, `body-parser@^1.20.2`, `multer@^1.4.4` (initially).
   - `npm start` script: runs `node server.js`.

9. **Extended `script.js` – Part 3: Server Integration**

   - `fetchServerImages()`: GET `/api/images` on page load to populate server-hosted images.
   - `handleFiles(files)`: Resizes images, attempts server upload via `/api/upload`, falls back to IndexedDB if server unavailable.
   - `validateAdminPassword(password)`: POST to `/api/admin/validate` with fallback to local validation.
   - Admin flow: Initial popup approach → replaced with navigation to `/admin.html`.
   - `openAdmin()`: Navigate to `/admin.html` for dedicated admin page.
   - Renders combined gallery: static images + server images + user images (IndexedDB).

10. **Created `admin.html`**

    - Dedicated admin page (not a popup) for login and management.
    - Features:
      - Login form: password input + submit button.
      - Settings section: toggle `allow_uploads` checkbox.
      - Image management: list, edit titles/captions, delete images.
    - Wired to server endpoints: validates password, fetches images, sends admin requests with auth header.

11. **Extended `styles.css`**

    - Admin modal styles (in-page modal for fallback, though primary flow now uses `admin.html`).
    - Notification toast styles for upload/delete feedback.
    - Admin button hover, focus, and active state styling for clear interactivity.

12. **Updated `index.html`**
    - Added Admin button to header navigation.
    - Admin button styled and linked (click navigates to `/admin.html`).

### Phase 4: Dependency & Security Hardening

**Goal:** Address npm audit vulnerabilities and upgrade to maintained versions.

13. **Fixed npm Dependencies**
    - Initial issue: `multer@^1.4.5` version didn't exist (ETARGET error).
    - Downgraded to `multer@^1.4.4` for initial install.
    - Ran `npm audit fix --force` to upgrade to multer v2.0.2, resolving CVE-2022-24434 (dicer/busboy vulnerability).
    - Result: 0 vulnerabilities reported (exit code 0 from `npm audit`).
    - Created branch `upgrade/multer-v2` for safe upgrade path.

---

## Current Architecture

### Frontend (Client)

```
index.html ─────┬─→ styles.css (responsive grid, modal, uploader)
                │
                └─→ script.js
                    ├─ galleryImages (static data)
                    ├─ renderGallery() (combine static + server + user images)
                    ├─ Lightbox logic (modal open/close/navigate)
                    ├─ IndexedDB helpers (user upload fallback storage)
                    ├─ Image resizing & compression (canvas)
                    ├─ Server API calls (/api/upload, /api/images, /api/settings)
                    └─ Admin flow (navigate to /admin.html)

admin.html ─────→ Dedicated admin page
                  ├─ Login form (POST /api/admin/validate)
                  ├─ Settings UI (toggle allow_uploads via POST /api/settings)
                  └─ Image management (edit/delete via PUT/DELETE /api/images/:id)
```

### Server (Node.js + Express)

```
server.js
├─ Static file serving (public assets)
├─ Upload handler (multer middleware)
├─ API endpoints
│  ├─ POST /api/admin/validate
│  ├─ POST /api/upload
│  ├─ GET /api/images
│  ├─ DELETE /api/images/:id
│  ├─ PUT /api/images/:id
│  ├─ GET /api/settings
│  └─ POST /api/settings
└─ File/JSON persistence
   ├─ uploads/ (directory)
   ├─ images.json (metadata)
   └─ settings.json (allow_uploads flag, etc.)
```

---

## Key Features Implemented

| Feature                        | Status      | Details                                               |
| ------------------------------ | ----------- | ----------------------------------------------------- |
| Responsive grid layout         | ✅ Complete | CSS Grid with mobile/tablet/desktop breakpoints       |
| Lightbox modal                 | ✅ Complete | Open/close/navigate, ESC/arrows/outside-click support |
| Static gallery data            | ✅ Complete | `galleryImages` array with comments on adding images  |
| User uploads (drag/drop)       | ✅ Complete | File uploader with visual feedback                    |
| Client-side compression        | ✅ Complete | Canvas-based resizing + JPEG compression              |
| IndexedDB fallback storage     | ✅ Complete | For uploads when server unavailable                   |
| Lazy-loading images            | ✅ Complete | `loading="lazy"` attribute + shimmer placeholder      |
| Server upload endpoint         | ✅ Complete | Multipart form handling with multer v2.0.2            |
| Image listing API              | ✅ Complete | GET `/api/images` returns metadata                    |
| Edit/delete images (admin)     | ✅ Complete | PUT/DELETE endpoints with password auth               |
| Admin settings (allow_uploads) | ✅ Complete | GET/POST `/api/settings` with admin-only write        |
| Admin authentication           | ✅ Complete | Password validation via `/api/admin/validate`         |
| Dedicated admin page           | ✅ Complete | `admin.html` for login + management UI                |
| npm audit cleanup              | ✅ Complete | Resolved all high-severity vulnerabilities (v2.0.2)   |

---

## Known Limitations & Future Improvements

### Security (Pre-Production)

- **Admin password**: Currently plaintext validation. For production, implement:
  - Password hashing (bcrypt, argon2)
  - Session-based authentication (express-session) or JWT tokens
  - HTTPS/TLS encryption in transit
- **Rate limiting**: No protection against brute-force password attempts.
- **File validation**: Limited checks on uploaded file types/sizes on server.

### Performance & Scalability

- **No server-side thumbnails**: Images served at full size; consider generating thumbnails to reduce bandwidth.
- **Metadata persistence**: JSON file-based (synchronous writes). For production, migrate to database (PostgreSQL, MongoDB).
- **Concurrency**: No file locking; simple FS writes could corrupt `images.json` under heavy concurrent load.

### User Experience

- **Upload feedback**: No progress bar during upload; consider adding for large files.
- **Image search/filtering**: Gallery only supports viewing all images; no search/tags.
- **Batch operations**: Admin can only delete one image at a time.

### Testing & Deployment

- No automated tests (unit/integration/e2e).
- No CI/CD pipeline.
- No Docker containerization for easy deployment.

---

## How to Run Locally

### Prerequisites

- Node.js v14+ and npm
- (Optional) Git for cloning/version control

### Setup

```bash
cd c:/Projects/Labubu_web
npm install
npm start
```

Server will listen on `http://localhost:3000`.

### Adding Static Images

1. Place image files (e.g., `.jpg`, `.png`) in a local folder (e.g., `./images/`).
2. Edit `script.js`: Add entries to the `galleryImages` array with file paths, titles, and captions.
3. Refresh the browser.

### Enabling/Disabling User Uploads

- **Via admin page**: Click "Admin" button → log in → toggle "Allow Uploads" setting.
- **Via code**: Edit `settings.json` and set `"allow_uploads": true/false`, then restart server.

### Uploading Images (Users)

1. Drag files into the uploader area or click to select files.
2. Images are resized/compressed and uploaded to server (or stored locally in IndexedDB if server unavailable).
3. Uploaded images appear in the gallery below static images.

---

## Repository & Branches

- **Repository**: `https://github.com/Scrawken/Labubu_web.git`
- **Main Branch**: `main` (stable version before multer upgrade)
- **Current Branch**: `upgrade/multer-v2` (includes security patch for npm audit vulnerabilities)

---

## Summary

**Labubu Web Gallery** evolved from a simple static gallery into a full-featured, server-backed image-sharing platform with admin controls. Key milestones include:

1. ✅ Core gallery and lightbox (Phase 1)
2. ✅ User upload and client storage (Phase 2)
3. ✅ Server integration and admin panel (Phase 3)
4. ✅ Dependency hardening and npm audit fix (Phase 4)

The application is ready for local deployment and use. For production deployment, focus on hardening authentication, adding a database backend, and implementing monitoring/logging.
