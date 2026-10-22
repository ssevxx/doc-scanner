/* DocScan — pemindai dokumen ala CamScanner (100% client-side) */

const $ = (id) => document.getElementById(id);
const state = { pages: [], current: -1, crop: null, ratio: 'free' };
let uid = 0;

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

/* ---------- Gambar ---------- */
function loadImage(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

function addPage(dataUrl) {
  loadImage(dataUrl).then((img) => {
    state.pages.push({ id: ++uid, img, filter: 'original' });
    renderHome();
    openEditor(state.pages.length - 1);
  }).catch(() => toast('Gagal membaca gambar'));
}

/* ---------- Home ---------- */
function renderHome() {
  const grid = $('pagesGrid');
  grid.innerHTML = '';
  $('emptyState').style.display = state.pages.length ? 'none' : 'block';
  $('btnExportTop').classList.toggle('hidden', state.pages.length === 0);

  state.pages.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'page-card';
    const img = document.createElement('img');
    img.src = renderFiltered(p);
    img.alt = 'Halaman ' + (i + 1);
    const num = document.createElement('div');
    num.className = 'page-num';
    num.textContent = i + 1;
    card.append(img, num);
    card.onclick = () => openEditor(i);
    grid.appendChild(card);
  });
}

$('btnUpload').onclick = () => $('fileInput').click();
$('fileInput').onchange = (e) => {
  [...e.target.files].forEach((f) => {
    const r = new FileReader();
    r.onload = () => addPage(r.result);
    r.readAsDataURL(f);
  });
  e.target.value = '';
};

/* ---------- Kamera ---------- */
let stream = null;
$('btnCamera').onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false
    });
    $('cameraVideo').srcObject = stream;
    $('cameraModal').classList.remove('hidden');
  } catch {
    toast('Kamera tidak tersedia, pakai upload saja');
  }
};
$('btnCloseCamera').onclick = closeCamera;
function closeCamera() {
  $('cameraModal').classList.add('hidden');
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
}
$('btnSnap').onclick = () => {
  const v = $('cameraVideo');
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  closeCamera();
  addPage(c.toDataURL('image/jpeg', 0.92));
};

/* ---------- Filter ---------- */
function renderFiltered(page, maxDim = 900) {
  const { img, filter } = page;
  let w = img.width, h = img.height;
  const s = Math.min(1, maxDim / Math.max(w, h));
  w = Math.round(w * s); h = Math.round(h * s);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  if (filter === 'bw') {
    // grayscale + threshold adaptif sederhana
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.filter = 'grayscale(1)';
    tctx.drawImage(img, 0, 0, w, h);
    const d = tctx.getImageData(0, 0, w, h);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i] > 150 ? 255 : 0;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(d, 0, 0);
  } else {
    if (filter === 'gray') ctx.filter = 'grayscale(1) contrast(1.15)';
    else if (filter === 'enhance') ctx.filter = 'contrast(1.28) saturate(1.25) brightness(1.06)';
    ctx.drawImage(img, 0, 0, w, h);
  }
  return c.toDataURL('image/jpeg', 0.9);
}

/* ---------- Editor ---------- */
const canvas = $('editorCanvas');
const cropBox = $('cropBox');

function openEditor(i) {
  state.current = i;
  state.ratio = 'free';
  $('viewHome').classList.add('hidden');
  $('viewEditor').classList.remove('hidden');
  $('editorTitle').textContent = 'Halaman ' + (i + 1);
  document.querySelectorAll('#filterRow .filter-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.filter === state.pages[i].filter));
  switchTab('crop');
  drawEditor();
}

$('btnBack').onclick = () => {
  $('viewEditor').classList.add('hidden');
  $('viewHome').classList.remove('hidden');
  renderHome();
};

$('btnDeletePage').onclick = () => {
  if (!confirm('Hapus halaman ini?')) return;
  state.pages.splice(state.current, 1);
  $('btnBack').click();
  toast('Halaman dihapus');
};

function drawEditor() {
  const page = state.pages[state.current];
  const dataUrl = renderFiltered(page, 1600);
  loadImage(dataUrl).then((img) => {
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    resetCrop();
  });
}

/* ----- Crop ----- */
function canvasRectInWrap() {
  const wrap = document.querySelector('.canvas-wrap').getBoundingClientRect();
  const r = canvas.getBoundingClientRect();
  return { x: r.left - wrap.left, y: r.top - wrap.top, w: r.width, h: r.height };
}

function resetCrop() {
  const r = canvasRectInWrap();
  state.crop = { x: 0, y: 0, w: 1, h: 1 }; // fraksi dari gambar
  positionCropBox();
  cropBox.classList.remove('hidden');
}

function positionCropBox() {
  const r = canvasRectInWrap();
  const c = state.crop;
  cropBox.style.left = (r.x + c.x * r.w) + 'px';
  cropBox.style.top = (r.y + c.y * r.h) + 'px';
  cropBox.style.width = (c.w * r.w) + 'px';
  cropBox.style.height = (c.h * r.h) + 'px';
}

window.addEventListener('resize', () => {
  if (!$('viewEditor').classList.contains('hidden')) positionCropBox();
});

document.querySelectorAll('[data-ratio]').forEach((b) => {
  b.onclick = () => {
    state.ratio = b.dataset.ratio;
    document.querySelectorAll('[data-ratio]').forEach((x) =>
      x.classList.toggle('primary', x === b));
    resetCrop();
  };
});

let dragH = null;
cropBox.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.handle');
  if (!h) return;
  dragH = h.dataset.h;
  h.setPointerCapture(e.pointerId);
  e.preventDefault();
});
cropBox.addEventListener('pointermove', (e) => {
  if (!dragH) return;
  const r = canvasRectInWrap();
  const fx = (e.clientX - (canvas.getBoundingClientRect().left)) / r.w;
  const fy = (e.clientY - (canvas.getBoundingClientRect().top)) / r.h;
  const c = state.crop;
  const cl = (v) => Math.min(1, Math.max(0, v));

  if (dragH.includes('t')) { const ny = cl(fy); c.h -= (ny - c.y); c.y = ny; }
  if (dragH.includes('b')) { c.h = cl(fy - c.y); }
  if (dragH.includes('l')) { const nx = cl(fx); c.w -= (nx - c.x); c.x = nx; }
  if (dragH.includes('r')) { c.w = cl(fx - c.x); }

  if (c.w < 0.05) c.w = 0.05;
  if (c.h < 0.05) c.h = 0.05;

  // kunci rasio aspek
  if (state.ratio !== 'free') {
    const [rw, rh] = state.ratio.split(':').map(Number);
    const target = (rw / rh) * (canvas.height / canvas.width);
    if (dragH.includes('l') || dragH.includes('r')) c.h = c.w / target;
    else c.w = c.h * target;
  }
  positionCropBox();
});
cropBox.addEventListener('pointerup', () => (dragH = null));
cropBox.addEventListener('pointercancel', () => (dragH = null));

$('btnResetCrop').onclick = resetCrop;

$('btnApplyCrop').onclick = () => {
  const page = state.pages[state.current];
  const c = state.crop;
  const sx = c.x * page.img.width, sy = c.y * page.img.height;
  const sw = c.w * page.img.width, sh = c.h * page.img.height;
  const out = document.createElement('canvas');
  out.width = Math.round(sw); out.height = Math.round(sh);
  out.getContext('2d').drawImage(page.img, sx, sy, sw, sh, 0, 0, out.width, out.height);
  loadImage(out.toDataURL('image/jpeg', 0.92)).then((img) => {
    page.img = img;
    drawEditor();
    toast('Crop diterapkan ✂️');
  });
};

/* ----- Tab ----- */
document.querySelectorAll('.tab').forEach((t) => {
  t.onclick = () => switchTab(t.dataset.tab);
});
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.tab === name));
  $('panelCrop').classList.toggle('hidden', name !== 'crop');
  $('panelFilter').classList.toggle('hidden', name !== 'filter');
  $('panelAdjust').classList.toggle('hidden', name !== 'adjust');
  cropBox.classList.toggle('hidden', name !== 'crop');
  if (name === 'crop') requestAnimationFrame(positionCropBox);
}

/* ----- Filter buttons ----- */
document.querySelectorAll('#filterRow .filter-btn').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#filterRow .filter-btn').forEach((x) =>
      x.classList.remove('active'));
    b.classList.add('active');
    state.pages[state.current].filter = b.dataset.filter;
    drawEditor();
  };
});

/* ----- Rotate ----- */
function rotate(deg) {
  const page = state.pages[state.current];
  const rad = (deg * Math.PI) / 180;
  const w = page.img.width, h = page.img.height;
  const out = document.createElement('canvas');
  out.width = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  out.height = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(page.img, -w / 2, -h / 2);
  loadImage(out.toDataURL('image/jpeg', 0.92)).then((img) => {
    page.img = img;
    drawEditor();
  });
}
$('btnRotateL').onclick = () => rotate(-90);
$('btnRotateR').onclick = () => rotate(90);

/* ---------- Export PDF ---------- */
async function exportPDF() {
  if (!state.pages.length) return toast('Belum ada halaman');
  if (!window.jspdf) return toast('jsPDF belum termuat, cek koneksi internet');
  toast('Membuat PDF…');
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const PW = 210, PH = 297;
    for (let i = 0; i < state.pages.length; i++) {
      const dataUrl = renderFiltered(state.pages[i], 1600);
      const img = await loadImage(dataUrl);
      const ratio = Math.min(PW / img.width, PH / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', (PW - w) / 2, (PH - h) / 2, w, h);
    }
    pdf.save('docscan-' + Date.now() + '.pdf');
    toast('PDF berhasil diunduh 🎉');
  } catch (e) {
    toast('Gagal membuat PDF');
  }
}
$('btnExportTop').onclick = exportPDF;

renderHome();
