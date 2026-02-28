'use strict';

/*
  storage.js
  - Submissions persisted to localStorage
  - Optional: persist same JSON to a user-chosen folder using File System Access API
  - Folder handle cached via IndexedDB
*/

var STORAGEKEY = 'admitguard-submissions';
var THEMEKEY = 'admitguard-theme';

// Legacy (kept to avoid breaking older builds; Prompt-06 does not use these for rules)
var RULESKEY = 'admitguard-rules';

var DATAFILENAME = 'admitguard-data.json';

var dirHandle = null;

/* -------- IndexedDB handle store -------- */

function openIDB(cb) {
  try {
    if (!('indexedDB' in window)) return cb(new Error('IndexedDB not supported'), null);

    var req = indexedDB.open('admitguard-idb', 1);

    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
    };

    req.onsuccess = function (e) { cb(null, e.target.result); };
    req.onerror = function () { cb(new Error('IDB open failed'), null); };
  } catch (e) {
    cb(e, null);
  }
}

function saveDirHandle(handle) {
  dirHandle = handle;
  openIDB(function (err, db) {
    if (err || !db) return;
    try {
      var tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'dirHandle');
    } catch (e) {
      // Some browsers block persisting handles; ignore.
    }
  });
}

function loadDirHandle(cb) {
  if (dirHandle) return cb(dirHandle);

  openIDB(function (err, db) {
    if (err || !db) return cb(null);
    try {
      var tx = db.transaction('handles', 'readonly');
      var req = tx.objectStore('handles').get('dirHandle');
      req.onsuccess = function (e) {
        var h = e.target.result || null;
        if (h) dirHandle = h;
        cb(h);
      };
      req.onerror = function () { cb(null); };
    } catch (e) {
      cb(null);
    }
  });
}

function clearDirHandle() {
  dirHandle = null;
  openIDB(function (err, db) {
    if (err || !db) return;
    try {
      var tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').delete('dirHandle');
    } catch (e) { /* ignore */ }
  });
}

/* -------- FS Access helpers -------- */

function hasFSAA() {
  return (typeof window !== 'undefined' && 'showDirectoryPicker' in window);
}

function getDirName() {
  return dirHandle ? dirHandle.name : null;
}

async function ensurePermission(handle) {
  try {
    if (!handle) return false;
    if (typeof handle.queryPermission !== 'function' || typeof handle.requestPermission !== 'function') return false;
    var perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    var req = await handle.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  } catch (e) {
    return false;
  }
}

async function pickStorageFolder() {
  if (!hasFSAA()) return { ok: false, message: 'Your browser does not support folder selection.' };
  try {
    var handle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    saveDirHandle(handle);
    return { ok: true, name: handle.name };
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: false, message: 'Folder selection cancelled.' };
    return { ok: false, message: 'Could not access folder: ' + (e && e.message ? e.message : String(e)) };
  }
}

async function clearStorageFolder() {
  clearDirHandle();
  return { ok: true };
}

async function readFileFromDir(handle, name) {
  try {
    var fh = await handle.getFileHandle(name, { create: false });
    var file = await fh.getFile();
    var text = await file.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function writeFileToDir(handle, name, data) {
  var fh = await handle.getFileHandle(name, { create: true });
  var wr = await fh.createWritable();
  await wr.write(JSON.stringify(data, null, 2));
  await wr.close();
}

async function persistToDir(subs) {
  return new Promise(function (resolve) {
    loadDirHandle(async function (handle) {
      if (!handle) return resolve(false);
      var ok = await ensurePermission(handle);
      if (!ok) return resolve(false);
      try {
        await writeFileToDir(handle, DATAFILENAME, subs);
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });
  });
}

async function syncFromDir() {
  return new Promise(function (resolve) {
    loadDirHandle(async function (handle) {
      if (!handle) return resolve(false);
      var ok = await ensurePermission(handle);
      if (!ok) return resolve(false);
      try {
        var data = await readFileFromDir(handle, DATAFILENAME);
        if (Array.isArray(data)) {
          syncSave(data);
          return resolve(true);
        }
        resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  });
}

/* -------- localStorage submissions -------- */

function getSubmissions() {
  try {
    var raw = localStorage.getItem(STORAGEKEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function syncSave(subs) {
  try {
    localStorage.setItem(STORAGEKEY, JSON.stringify(subs));
  } catch (e) { /* ignore */ }
}

async function saveSubmission(record) {
  record.id = 'AG-' + Date.now();
  var subs = getSubmissions();
  subs.push(record);
  syncSave(subs);
  await persistToDir(subs);
  return record;
}

async function updateSubmission(id, updates) {
  var subs = getSubmissions();
  var idx = subs.findIndex(function (s) { return s && s.id === id; });
  if (idx === -1) return null;

  subs[idx] = Object.assign({}, subs[idx], updates, { updatedAt: new Date().toISOString() });
  syncSave(subs);
  await persistToDir(subs);
  return subs[idx];
}

async function deleteSubmission(id) {
  var subs = getSubmissions().filter(function (s) { return s && s.id !== id; });
  syncSave(subs);
  await persistToDir(subs);
  return true;
}

function clearSubmissions() {
  try { localStorage.removeItem(STORAGEKEY); } catch (e) { /* ignore */ }
}

/* -------- Theme -------- */

function getTheme() {
  try { return localStorage.getItem(THEMEKEY) || 'light'; } catch (e) { return 'light'; }
}

function saveTheme(t) {
  try { localStorage.setItem(THEMEKEY, t); } catch (e) { /* ignore */ }
}

/* -------- Legacy rules helpers (not used in Prompt-06) -------- */

function getSavedRules() {
  try {
    var raw = localStorage.getItem(RULESKEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveRules(rules) {
  try { localStorage.setItem(RULESKEY, JSON.stringify(rules)); } catch (e) { /* ignore */ }
}

function resetRules() {
  try { localStorage.removeItem(RULESKEY); } catch (e) { /* ignore */ }
}

/* -------- Export -------- */

function exportJSON() {
  var subs = getSubmissions();
  var blob = new Blob([JSON.stringify(subs, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'admitguard-export-' + dateStamp() + '.json');
}

function exportCSV() {
  var subs = getSubmissions();
  if (!subs.length) return;

  var softFields = ['dateOfBirth', 'graduationYear', 'percentageOrCgpa', 'screeningTestScore'];

  var baseHeaders = [
    'id', 'fullName', 'email', 'phone', 'dateOfBirth', 'highestQualification', 'graduationYear',
    'percentageOrCgpa', 'screeningTestScore', 'interviewStatus', 'aadhaarNumber', 'offerLetterSent',
    'exceptionCount', 'flaggedForManager', 'createdAt', 'updatedAt'
  ];

  var excHeaders = softFields.map(function (f) { return [f + ' exception', f + ' rationale']; }).flat();
  var allHeaders = baseHeaders.concat(excHeaders);

  function q(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v).replace(/"/g, '""');
  }
  function qs(v) { return '"' + q(v) + '"'; }

  var rows = subs.map(function (s) {
    var base = baseHeaders.map(function (h) { return qs(s[h]); });

    var excs = softFields.map(function (f) {
      var ex = s.exceptions && s.exceptions[f];
      return [qs(!!ex ? 'Yes' : 'No'), qs(ex && ex.rationale ? ex.rationale : '')];
    }).flat();

    return base.concat(excs).join(',');
  });

  var csv = allHeaders.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  triggerDownload(blob, 'admitguard-export-' + dateStamp() + '.csv');
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
}