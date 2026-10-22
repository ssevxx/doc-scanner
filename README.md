# 📄 DocScan — Pemindai Dokumen Web

Web app pemindai dokumen ala CamScanner. 100% berjalan di browser (client-side),
tanpa server & tanpa upload ke mana pun.

## Fitur

- 📷 Ambil foto langsung dari kamera HP / 🖼️ upload gambar (bisa banyak)
- ✂️ Crop bebas atau dengan rasio (1:1, 4:3, 3:4, 16:9)
- 🎨 Filter: Asli, Enhance, Abu-abu, B&W
- 🔧 Rotate 90°
- 📑 Multi-halaman, hapus & urutan otomatis
- 📥 Export semua halaman jadi satu file PDF (via jsPDF CDN)

## Cara pakai

Buka `index.html` di browser (atau deploy ke GitHub Pages / hosting statis apa pun),
lalu:

1. Ketuk 📷 untuk foto dokumen atau 🖼️ untuk upload.
2. Ketuk halaman untuk mengedit (crop → filter → rotate).
3. Ketuk **Export PDF** di header untuk mengunduh hasilnya.

> Catatan: akses kamera butuh HTTPS (atau `localhost`).

## Struktur

```
index.html   — struktur halaman
styles.css   — tampilan (mobile-first, dark theme)
app.js       — logika scanner: kamera, crop, filter, export PDF
```
