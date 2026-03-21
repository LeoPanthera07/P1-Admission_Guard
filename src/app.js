'use strict';

/*
  AdmitGuard SPA
  - Rules loaded from ./.configrules.json (single source of truth)
  - Submissions stored in localStorage (and optionally a local folder JSON via FS Access API)
  - Validator is config-driven (see validator.js)
*/

var CONFIG = null;
var FORMSTATE = null;
var EXCEPTIONS = null;
var FIELDRESULTS = null;
var SUBS = [];
var DETAIL_ACTIVE_ID = null;

document.addEventListener('DOMContentLoaded', async function () {
  applyTheme(getTheme());

  try {
    CONFIG = await loadConfigFromFile();
  } catch (e) {
    CONFIG = { schemaVersion: '0', programStartDate: '', softRuleKeywords: [], systemRules: {}, fields: {} };
    showToast('Could not load config/rules.json. Please create .configrules.json and run via a local server.', 'warning');
  }

  if (!CONFIG.systemRules) CONFIG.systemRules = {};
  if (!Array.isArray(CONFIG.softRuleKeywords)) CONFIG.softRuleKeywords = [];
  if (!CONFIG.fields) CONFIG.fields = {};

  var synced = false;
  try { synced = await syncFromDir(); } catch (e) { synced = false; }

  SUBS = getSubmissions();
  renderForm(null);

  initNavigation();
  initThemeToggle();
  initAuditFilters();
  initStoragePanel();

  renderConfigRules();
  updateStorageBadge();

  if (synced) showToast('Synced data from local folder.', 'success');
});

var RULES_URL_CANDIDATES = [
  '../config/rules.json',   // when app is served from /src/
  './config/rules.json',    // if app is served from /
  './rules.json'            // if rules is placed next to index.html
];

async function loadConfigFromFile() {
  var lastErr = null;

  for (var i = 0; i < RULES_URL_CANDIDATES.length; i++) {
    var url = RULES_URL_CANDIDATES[i];
    try {
      var res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      json.__rulesUrl = url; // optional: helps debugging
      return json;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('Could not load rules.json');
}

/* ---------------- Navigation ---------------- */

function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-nav');
      showView(id);
    });
  });
}

function showView(id) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.remove('nav-active'); });

  var view = document.getElementById('view-' + id);
  if (view) view.classList.add('active');

  var navBtn = document.querySelector('[data-nav="' + id + '"]');
  if (navBtn) navBtn.classList.add('nav-active');

  if (id === 'audit') renderAuditLog();
  if (id === 'dashboard') renderDashboard();
  if (id === 'config') renderConfigRules();
}

/* ---------------- Theme + Toast ---------------- */

function initThemeToggle() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
  });
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = (t === 'dark') ? 'Light' : 'Dark';
}

function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast toast--' + (type || 'info') + ' toast--show';
  clearTimeout(el.timer);
  el.timer = setTimeout(function () {
    el.classList.remove('toast--show');
  }, 3200);
}

/* ---------------- Storage badge + panel ---------------- */

function updateStorageBadge() {
  var badge = document.getElementById('storage-badge');
  if (!badge) return;

  var name = getDirName();
  if (name) {
    badge.textContent = name;
    badge.title = 'Saving to local folder "' + name + '"';
    badge.className = 'storage-badge storage-badge--active';
  } else {
    badge.textContent = 'Browser Storage';
    badge.title = 'Data stored in browser localStorage';
    badge.className = 'storage-badge storage-badge--default';
  }
}

function initStoragePanel() {
  wireOnce('btn-pick-folder', async function () {
    var result = await pickStorageFolder();
    if (result && result.ok) {
      updateStorageBadge();
      showToast('Saving to folder ' + result.name, 'success');
    } else {
      showToast((result && result.message) ? result.message : 'Could not pick folder.', 'warning');
    }
    renderStorageStatus();
  });

  wireOnce('btn-clear-folder', async function () {
    await clearStorageFolder();
    updateStorageBadge();
    showToast('Switched back to browser storage.', 'info');
    renderStorageStatus();
  });

  renderStorageStatus();
}

function renderStorageStatus() {
  var el = document.getElementById('storage-status-msg');
  if (!el) return;

  var name = getDirName();
  if (name) {
    el.innerHTML = '<span class="storage-ok">Saving to local folder <strong>' + escHtml(name) + '</strong></span>';
    return;
  }

  if (hasFSAA()) {
    el.innerHTML = '<span class="storage-warn">Using browser storage. Pick a folder to persist data locally.</span>';
  } else {
    el.innerHTML = '<span class="storage-warn">File System API not supported in this browser. Using browser storage.</span>';
  }
}

/* ---------------- Config helpers ---------------- */

function getBlockedInterviewValue() {
  var f = CONFIG && CONFIG.fields && CONFIG.fields.interviewStatus;
  var v = f && f.validations ? f.validations : null;
  if (!v) return null;
  if (v.blockIfValue !== undefined && v.blockIfValue !== null) return String(v.blockIfValue);
  if (Array.isArray(v.blockedValues) && v.blockedValues.length) return String(v.blockedValues[0]);
  return null;
}

function getBlockedInterviewMessage() {
  var f = CONFIG && CONFIG.fields && CONFIG.fields.interviewStatus;
  var m = f && f.messages ? f.messages : null;
  if (!m) return 'This interview status is blocked.';
  return m.blockIfValue || m.blockedValues || 'This interview status is blocked.';
}

function getMaxSoftExceptions() {
  return (CONFIG && CONFIG.systemRules && typeof CONFIG.systemRules.maxSoftExceptions === 'number')
    ? CONFIG.systemRules.maxSoftExceptions
    : 0;
}

function getRationaleMinLength() {
  return (CONFIG && CONFIG.systemRules && typeof CONFIG.systemRules.rationaleMinLength === 'number')
    ? CONFIG.systemRules.rationaleMinLength
    : 0;
}

function getRationaleKeywords() {
  return Array.isArray(CONFIG && CONFIG.softRuleKeywords) ? CONFIG.softRuleKeywords : [];
}

/* ---------------- Configure Rules UI (session-only edits) ---------------- */

function renderConfigRules() {
  renderStorageStatus();

  var container = document.getElementById('config-rules-body');
  if (!container || !CONFIG) return;

  container.innerHTML = '';

  // System settings
  var sysCard = el('div', 'config-card');
  sysCard.innerHTML = '<div class="config-cardtitle">System Settings</div>';
  var sysGrid = el('div', 'config-sys-grid');

  sysGrid.appendChild(configRow('Program Start Date', 'programStartDate', 'date', CONFIG.programStartDate || '', function (v) {
    CONFIG.programStartDate = v;
    if (FORMSTATE && FORMSTATE.editingId) renderForm(findById(FORMSTATE.editingId));
  }));

  sysGrid.appendChild(configRow('Max Exceptions Before Flagging', 'maxSoftExceptions', 'number',
    (CONFIG.systemRules && typeof CONFIG.systemRules.maxSoftExceptions === 'number') ? CONFIG.systemRules.maxSoftExceptions : '',
    function (v) {
      if (!CONFIG.systemRules) CONFIG.systemRules = {};
      CONFIG.systemRules.maxSoftExceptions = v ? parseInt(v, 10) : null;
      syncExceptionCounter();
      syncSubmitButton();
    }
  ));

  sysGrid.appendChild(configRow('Rationale Min Length', 'rationaleMinLength', 'number',
    (CONFIG.systemRules && typeof CONFIG.systemRules.rationaleMinLength === 'number') ? CONFIG.systemRules.rationaleMinLength : '',
    function (v) {
      if (!CONFIG.systemRules) CONFIG.systemRules = {};
      CONFIG.systemRules.rationaleMinLength = v ? parseInt(v, 10) : null;
      renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
    }
  ));

  sysGrid.appendChild(configRow('Exception Keywords (comma-separated)', 'softRuleKeywords', 'text',
    Array.isArray(CONFIG.softRuleKeywords) ? CONFIG.softRuleKeywords.join(', ') : '',
    function (v) {
      CONFIG.softRuleKeywords = String(v || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean);
      renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
    }
  ));

  sysCard.appendChild(sysGrid);
  container.appendChild(sysCard);

  // Field cards
  var sorted = Object.keys(CONFIG.fields || {})
    .map(function (k) { return { name: k, cfg: CONFIG.fields[k] }; })
    .sort(function (a, b) { return (a.cfg.order || 99) - (b.cfg.order || 99); });

  sorted.forEach(function (item) {
    var fn = item.name;
    var cfg = item.cfg || {};
    var v = cfg.validations || {};
    var card = el('div', 'config-card');

    var hdr = el('div', 'config-cardheader');
    var ttl = el('div', 'config-cardtitle');
    ttl.textContent = cfg.label || fn;

    var bdg = el('span', 'rule-badge rule-badge--' + (cfg.ruleType || 'strict'));
    bdg.textContent = ((cfg.ruleType || 'strict').charAt(0).toUpperCase() + (cfg.ruleType || 'strict').slice(1));
    hdr.appendChild(ttl);
    hdr.appendChild(bdg);
    card.appendChild(hdr);

    var grid = el('div', 'config-fields-grid');

    if (fn === 'dateOfBirth') {
      grid.appendChild(configRow('Min Age (years)', fn + '-ageMin', 'number', v.ageMin, function (val) {
        CONFIG.fields[fn].validations.ageMin = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
      grid.appendChild(configRow('Max Age (years)', fn + '-ageMax', 'number', v.ageMax, function (val) {
        CONFIG.fields[fn].validations.ageMax = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (fn === 'graduationYear') {
      grid.appendChild(configRow('Min Year', fn + '-min', 'number', v.min, function (val) {
        CONFIG.fields[fn].validations.min = val ? parseInt(val, 10) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
      grid.appendChild(configRow('Max Year', fn + '-max', 'number', v.max, function (val) {
        CONFIG.fields[fn].validations.max = val ? parseInt(val, 10) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (fn === 'percentageOrCgpa') {
      grid.appendChild(configRow('Min Percentage', fn + '-percentageMin', 'number', v.percentageMin, function (val) {
        CONFIG.fields[fn].validations.percentageMin = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
      grid.appendChild(configRow('Min CGPA (10)', fn + '-cgpaMin', 'number', v.cgpaMin, function (val) {
        CONFIG.fields[fn].validations.cgpaMin = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
      grid.appendChild(configRow('Max CGPA (10)', fn + '-cgpaMax', 'number', v.cgpaMax, function (val) {
        CONFIG.fields[fn].validations.cgpaMax = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (fn === 'screeningTestScore') {
      grid.appendChild(configRow('Pass Mark Threshold', fn + '-passMark', 'number', v.passMark, function (val) {
        CONFIG.fields[fn].validations.passMark = val ? parseFloat(val) : null;
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (cfg && cfg.validations && Array.isArray(cfg.validations.enum)) {
      grid.appendChild(configRow('Allowed Values (comma-separated)', fn + '-enum', 'text', cfg.validations.enum.join(', '), function (val) {
        CONFIG.fields[fn].validations.enum = String(val || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (cfg.ruleType === 'soft') {
      grid.appendChild(configRow('Soft Warning Message', fn + '-softWarning', 'text', cfg.softWarning || '', function (val) {
        CONFIG.fields[fn].softWarning = String(val || '');
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      }));
    }

    if (!grid.children.length) {
      var note = el('p', 'config-no-params');
      note.textContent = 'No configurable parameters for this field.';
      grid.appendChild(note);
    }

    card.appendChild(grid);
    container.appendChild(card);
  });

  var actions = document.getElementById('config-actions');
  if (actions) {
    wireOnce('btn-save-rules', function () {
      showToast('Rules applied for this session. Export rules.json to persist changes.', 'info');
      renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
    });

    wireOnce('btn-reset-rules', async function () {
      if (!confirm('Reload rules from config/rules.json? Session edits will be lost.')) return;
      try {
        CONFIG = await loadConfigFromFile();
        if (!CONFIG.systemRules) CONFIG.systemRules = {};
        if (!Array.isArray(CONFIG.softRuleKeywords)) CONFIG.softRuleKeywords = [];
        if (!CONFIG.fields) CONFIG.fields = {};
        showToast('Rules reloaded from config file.', 'success');
        renderConfigRules();
        renderForm(FORMSTATE && FORMSTATE.editingId ? findById(FORMSTATE.editingId) : null);
      } catch (e) {
        showToast('Could not reload .configrules.json', 'warning');
      }
    });

    wireOnce('btn-export-rules', function () {
      var blob = new Blob([JSON.stringify(CONFIG, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'rules.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
      showToast('Rules exported as JSON.', 'success');
    });
  }
}

function configRow(label, id, type, defaultVal, onChange) {
  var row = el('div', 'config-row');
  var lbl = document.createElement('label');
  lbl.setAttribute('for', 'cfg-' + id);
  lbl.textContent = label;

  var inp = el('input', 'cfg-input');
  inp.type = (type === 'date') ? 'date' : (type === 'number') ? 'number' : 'text';
  inp.id = 'cfg-' + id;
  inp.value = (defaultVal !== undefined && defaultVal !== null) ? String(defaultVal) : '';

  inp.addEventListener('change', function () { onChange(inp.value); });
  inp.addEventListener('blur', function () { onChange(inp.value); });

  row.appendChild(lbl);
  row.appendChild(inp);
  return row;
}

/* ---------------- Candidate form rendering ---------------- */

function renderForm(prefill) {
  var container = document.getElementById('candidate-form-fields');
  if (!container || !CONFIG) return;
  container.innerHTML = '';

  FORMSTATE = { percentageMode: 'percentage' };
  EXCEPTIONS = {};
  FIELDRESULTS = {};

  Object.keys(CONFIG.fields).forEach(function (f) {
    FORMSTATE[f] = prefill ? prefill[f] : '';
    EXCEPTIONS[f] = { used: false, rationale: '', rationaleValid: false };
  });

  if (prefill && prefill.id) {
    FORMSTATE.editingId = prefill.id;
    FORMSTATE.percentageMode = prefill.percentageMode || 'percentage';
    if (prefill.exceptions) {
      Object.keys(prefill.exceptions).forEach(function (fn) {
        if (!EXCEPTIONS[fn]) return;
        EXCEPTIONS[fn].used = true;
        EXCEPTIONS[fn].rationale = (prefill.exceptions[fn] && prefill.exceptions[fn].rationale) ? prefill.exceptions[fn].rationale : '';
        EXCEPTIONS[fn].rationaleValid = validateRationale(EXCEPTIONS[fn].rationale, CONFIG).isValid;
      });
    }
  } else {
    FORMSTATE.editingId = null;
  }

  var sorted = Object.keys(CONFIG.fields)
    .map(function (k) { return { name: k, cfg: CONFIG.fields[k] }; })
    .sort(function (a, b) { return (a.cfg.order || 99) - (b.cfg.order || 99); });

  sorted.forEach(function (item) {
    container.appendChild(buildFieldGroup(item.name, item.cfg));
  });

  var editBanner = document.getElementById('editing-banner');
  if (editBanner) {
    if (prefill && prefill.id) {
      editBanner.innerHTML = 'Editing record <strong>' + escHtml(prefill.id) + '</strong> ' + escHtml(prefill.fullName || '');
      editBanner.style.display = 'block';
    } else {
      editBanner.innerHTML = '';
      editBanner.style.display = 'none';
    }
  }

  wireSubmitBtn();

  var rb = document.getElementById('reset-btn');
  if (rb) {
    var fresh = rb.cloneNode(true);
    rb.parentNode.replaceChild(fresh, rb);
    fresh.addEventListener('click', resetForm);
  }

  if (prefill) {
    requestAnimationFrame(function () { runInitialValidationPass(prefill); });
  } else {
    syncExceptionCounter();
    syncSubmitButton();
  }
}

function buildFieldGroup(fieldName, cfg) {
  var group = el('div', 'field-group');
  group.id = 'group-' + fieldName;

  var label = document.createElement('label');
  label.setAttribute('for', fieldName);

  var lspan = el('span', '');
  lspan.textContent = cfg.label || fieldName;
  label.appendChild(lspan);

  if (cfg.validations && cfg.validations.required) {
    var req = el('span', 'required-mark');
    req.textContent = '*';
    label.appendChild(req);
  }

  var badge = el('span', 'rule-badge rule-badge--' + (cfg.ruleType || 'strict'));
  badge.textContent = ((cfg.ruleType || 'strict').charAt(0).toUpperCase() + (cfg.ruleType || 'strict').slice(1));
  label.appendChild(badge);

  group.appendChild(label);

  if (cfg.type === 'percentageCgpa') group.appendChild(buildPercentageCgpaWidget(fieldName));
  else group.appendChild(buildInput(fieldName, cfg));

  var errSpan = el('span', 'field-error');
  errSpan.id = 'error-' + fieldName;
  errSpan.setAttribute('aria-live', 'polite');
  group.appendChild(errSpan);

  if (cfg.ruleType === 'soft' && cfg.exceptionAllowed) group.appendChild(buildSoftArea(fieldName, cfg));
  return group;
}

function buildInput(fieldName, cfg) {
  var elInput;

  if (cfg.type === 'select') {
    elInput = document.createElement('select');
    var ph = document.createElement('option');
    ph.value = '';
    ph.disabled = true;
    ph.selected = true;
    ph.textContent = 'Select ' + (cfg.label || fieldName);
    elInput.appendChild(ph);

    var opts = (cfg.validations && Array.isArray(cfg.validations.enum)) ? cfg.validations.enum : [];
    opts.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      elInput.appendChild(o);
    });
  } else if (cfg.type === 'date') {
    elInput = document.createElement('input');
    elInput.type = 'date';
  } else if (cfg.type === 'number') {
    elInput = document.createElement('input');
    elInput.type = 'number';
    elInput.step = '1';
    elInput.placeholder = '0';
  } else {
    elInput = document.createElement('input');
    elInput.type = 'text';
    elInput.placeholder = cfg.label || fieldName;
  }

  elInput.id = fieldName;
  elInput.name = fieldName;
  elInput.className = 'form-input';
  if (FORMSTATE[fieldName]) elInput.value = FORMSTATE[fieldName];

  attachListeners(elInput, fieldName);
  return elInput;
}

function buildPercentageCgpaWidget(fieldName) {
  var wrapper = el('div', 'percent-cgpa-wrapper');

  var modeRow = el('div', 'mode-toggle');

  var pBtn = document.createElement('button');
  pBtn.type = 'button';
  pBtn.textContent = 'Percentage';
  pBtn.className = 'mode-btn active';

  var cBtn = document.createElement('button');
  cBtn.type = 'button';
  cBtn.textContent = 'CGPA (10)';
  cBtn.className = 'mode-btn';

  var input = document.createElement('input');
  input.type = 'number';
  input.step = '0.01';
  input.id = fieldName;
  input.name = fieldName;
  input.className = 'form-input';

  if (FORMSTATE.percentageMode === 'cgpa') {
    cBtn.classList.add('active');
    pBtn.classList.remove('active');
    input.placeholder = 'e.g. 7.5';
  } else {
    input.placeholder = 'e.g. 72.5';
  }

  if (FORMSTATE[fieldName]) input.value = FORMSTATE[fieldName];

  pBtn.addEventListener('click', function () {
    FORMSTATE.percentageMode = 'percentage';
    pBtn.classList.add('active');
    cBtn.classList.remove('active');
    input.placeholder = 'e.g. 72.5';
    runValidation(fieldName, input.value);
  });

  cBtn.addEventListener('click', function () {
    FORMSTATE.percentageMode = 'cgpa';
    cBtn.classList.add('active');
    pBtn.classList.remove('active');
    input.placeholder = 'e.g. 7.5';
    runValidation(fieldName, input.value);
  });

  attachListeners(input, fieldName);

  modeRow.appendChild(pBtn);
  modeRow.appendChild(cBtn);
  wrapper.appendChild(modeRow);
  wrapper.appendChild(input);
  return wrapper;
}

/* ---------------- Soft exception area + rationale validation ---------------- */

function buildSoftArea(fieldName, cfg) {
  var area = el('div', 'soft-exception-area');
  area.id = 'soft-area-' + fieldName;
  area.style.display = 'none';

  var warnMsg = el('div', 'soft-warning-msg');
  warnMsg.id = 'soft-msg-' + fieldName;
  warnMsg.textContent = cfg.softWarning || 'This field does not meet the standard criteria.';
  area.appendChild(warnMsg);

  var toggleRow = el('div', 'exception-toggle-row');
  var chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.id = 'exc-chk-' + fieldName;

  var chkLabel = document.createElement('label');
  chkLabel.setAttribute('for', chk.id);
  chkLabel.textContent = 'Allow exception for this field';

  toggleRow.appendChild(chk);
  toggleRow.appendChild(chkLabel);
  area.appendChild(toggleRow);

  var rationaleDiv = el('div', 'rationale-area');
  rationaleDiv.id = 'rationale-area-' + fieldName;
  rationaleDiv.style.display = 'none';

  var rationaleLabel = document.createElement('label');
  rationaleLabel.className = 'rationale-label';
  rationaleLabel.setAttribute('for', 'rationale-' + fieldName);
  rationaleLabel.textContent = 'Exception rationale';

  var ta = document.createElement('textarea');
  ta.id = 'rationale-' + fieldName;
  ta.rows = 3;

  var minLen = getRationaleMinLength();
  var kw = getRationaleKeywords();
  ta.placeholder = 'Min ' + minLen + ' chars.' + (kw.length ? ' Include one of: ' + kw.join(', ') : '');

  var charCount = el('span', 'char-count');
  charCount.id = 'char-count-' + fieldName;
  charCount.textContent = '0 / ' + minLen + ' characters';

  var rationaleErr = el('span', 'rationale-error');
  rationaleErr.id = 'rationale-err-' + fieldName;

  rationaleDiv.appendChild(rationaleLabel);
  rationaleDiv.appendChild(ta);
  rationaleDiv.appendChild(charCount);
  rationaleDiv.appendChild(rationaleErr);

  area.appendChild(rationaleDiv);

  chk.addEventListener('change', function () {
    EXCEPTIONS[fieldName].used = chk.checked;

    if (chk.checked) {
      rationaleDiv.style.display = 'flex';
      rationaleDiv.style.flexDirection = 'column';
      rationaleDiv.style.gap = '5px';

      var initVal = ta.value || '';
      EXCEPTIONS[fieldName].rationale = initVal;

      var vr = validateRationale(initVal, CONFIG);
      EXCEPTIONS[fieldName].rationaleValid = vr.isValid;

      charCount.textContent = (initVal.trim().length + ' / ' + minLen + ' characters');
      ta.className = initVal.trim().length ? (vr.isValid ? 'rationale-valid' : 'rationale-invalid') : '';
      renderRationaleErrors(rationaleErr, vr);
    } else {
      rationaleDiv.style.display = 'none';
      EXCEPTIONS[fieldName].rationale = '';
      EXCEPTIONS[fieldName].rationaleValid = false;
      ta.value = '';
      ta.className = '';
      charCount.textContent = '0 / ' + minLen + ' characters';
      rationaleErr.innerHTML = '';
    }

    syncExceptionCounter();
    syncSubmitButton();
  });

  ta.addEventListener('input', function () {
    var val = ta.value || '';
    EXCEPTIONS[fieldName].rationale = val;

    var vr = validateRationale(val, CONFIG);
    EXCEPTIONS[fieldName].rationaleValid = vr.isValid;

    charCount.textContent = (val.trim().length + ' / ' + getRationaleMinLength() + ' characters');
    ta.className = vr.isValid ? 'rationale-valid' : 'rationale-invalid';
    renderRationaleErrors(rationaleErr, vr);

    syncSubmitButton();
  });

  ta.addEventListener('blur', function () {
    var vr = validateRationale(ta.value || '', CONFIG);
    EXCEPTIONS[fieldName].rationaleValid = vr.isValid;
    renderRationaleErrors(rationaleErr, vr);
    syncSubmitButton();
  });

  return area;
}

function validateRationale(text, config) {
  var t = (text !== undefined && text !== null) ? String(text) : '';
  var trimmed = t.trim();

  var minLength = (config && config.systemRules && typeof config.systemRules.rationaleMinLength === 'number')
    ? config.systemRules.rationaleMinLength
    : 0;

  var keywords = (config && Array.isArray(config.softRuleKeywords)) ? config.softRuleKeywords : [];

  var errors = [];

  if (trimmed.length < minLength) {
    errors.push('Rationale must be at least ' + minLength + ' characters. Currently ' + trimmed.length + ' characters.');
  }

  if (keywords.length) {
    var lower = trimmed.toLowerCase();
    var hasKeyword = keywords.some(function (kw) {
      return lower.indexOf(String(kw).toLowerCase()) !== -1;
    });
    if (!hasKeyword) errors.push('Rationale must include one of: ' + keywords.join(', ') + '.');
  }

  return { isValid: errors.length === 0, errors: errors };
}

function renderRationaleErrors(elm, result) {
  if (!elm) return;
  if (!result || !Array.isArray(result.errors)) {
    elm.textContent = '';
    return;
  }
  if (result.errors.length === 0) {
    elm.textContent = 'Rationale accepted.';
    elm.style.color = 'var(--success)';
    return;
  }
  elm.style.color = 'var(--error)';
  elm.innerHTML = '<ul>' + result.errors.map(function (e) { return '<li>' + escHtml(e) + '</li>'; }).join('') + '</ul>';
}

/* ---------------- Validation wiring ---------------- */

function attachListeners(elInput, fieldName) {
  function handle() {
    FORMSTATE[fieldName] = elInput.value;
    runValidation(fieldName, elInput.value);

    if (fieldName === 'interviewStatus') renderRejectedBanner(elInput.value);

    // Keep cross-field checks responsive (offerLetterSent depends on interviewStatus in your rules)
    runValidation('offerLetterSent', FORMSTATE.offerLetterSent);
  }

  elInput.addEventListener('input', handle);
  elInput.addEventListener('change', handle);
  elInput.addEventListener('blur', handle);
}

function runValidation(fieldName, value) {
  SUBS = getSubmissions();

  var result = window.validateField(fieldName, value, FORMSTATE, CONFIG, SUBS);
  FIELDRESULTS[fieldName] = result;

  paintFieldError(fieldName, result);

  var softArea = document.getElementById('soft-area-' + fieldName);
  var softMsg = document.getElementById('soft-msg-' + fieldName);

  if (softArea) {
    if (result.isSoftViolation) {
      if (softMsg && result.messages && result.messages.length) softMsg.textContent = result.messages[0];
      softArea.style.display = 'flex';
      softArea.style.flexDirection = 'column';
      softArea.style.gap = '8px';
    } else {
      softArea.style.display = 'none';
    }
  }

  // If field becomes valid again, clear exception UI only if user isn't actively using it
  if (EXCEPTIONS[fieldName] && !EXCEPTIONS[fieldName].used) {
    EXCEPTIONS[fieldName].rationale = '';
    EXCEPTIONS[fieldName].rationaleValid = false;

    var chk = document.getElementById('exc-chk-' + fieldName);
    var ra = document.getElementById('rationale-area-' + fieldName);
    var ta = document.getElementById('rationale-' + fieldName);
    var cc = document.getElementById('char-count-' + fieldName);
    var re = document.getElementById('rationale-err-' + fieldName);

    if (chk) chk.checked = false;
    if (ra) ra.style.display = 'none';
    if (ta) { ta.value = ''; ta.className = ''; }
    if (cc) cc.textContent = '0 / ' + getRationaleMinLength() + ' characters';
    if (re) re.innerHTML = '';
  }

  syncExceptionCounter();
  syncSubmitButton();
  return result;
}

function paintFieldError(fieldName, result) {
  var span = document.getElementById('error-' + fieldName);
  var input = document.getElementById(fieldName);
  if (!span) return;

  if (input) input.classList.remove('input-valid', 'input-error', 'input-warning');

  if (!result.isValid && result.messages && result.messages.length) {
    span.textContent = result.messages[0];
    span.className = result.isStrictViolation ? 'field-error field-error--strict' : 'field-error field-error--soft';
    if (input) input.classList.add(result.isStrictViolation ? 'input-error' : 'input-warning');
  } else {
    span.textContent = '';
    span.className = 'field-error';
    if (input && String(FORMSTATE[fieldName] || '').trim()) input.classList.add('input-valid');
  }
}

function renderRejectedBanner(val) {
  var b = document.getElementById('rejected-banner');
  if (!b) return;

  var blocked = getBlockedInterviewValue();
  if (blocked && String(val) === blocked) {
    b.innerHTML = '<strong>' + escHtml(getBlockedInterviewMessage()) + '</strong> Submission is blocked.';
    b.style.display = 'block';
  } else {
    b.innerHTML = '';
    b.style.display = 'none';
  }
}

/* ---------------- Exceptions counter + submit gating ---------------- */

function exceptionEligibleTotal() {
  return Object.keys(CONFIG.fields).filter(function (fn) {
    var cfg = CONFIG.fields[fn];
    return cfg && cfg.ruleType === 'soft' && cfg.exceptionAllowed;
  }).length;
}

function syncExceptionCounter() {
  var count = Object.keys(EXCEPTIONS).filter(function (fn) { return EXCEPTIONS[fn] && EXCEPTIONS[fn].used; }).length;
  var totalEligible = exceptionEligibleTotal();
  var max = getMaxSoftExceptions();

  var counter = document.getElementById('exception-counter');
  var valEl = document.getElementById('exception-count-val');
  var maxLabel = document.querySelector('.exception-max-label');

  if (counter) counter.style.display = count > 0 ? 'flex' : 'none';
  if (valEl) valEl.textContent = count + ' / ' + totalEligible;
  if (maxLabel) maxLabel.textContent = max + ' max before flagging';

  var flagBan = document.getElementById('flagged-banner');
  if (flagBan) {
    if (max > 0 && count > max) {
      flagBan.style.display = 'block';
      flagBan.innerHTML = '<strong>This candidate has more than ' + escHtml(String(max)) + ' exceptions.</strong> Entry will be flagged for manager review. You may still submit.';
    } else {
      flagBan.style.display = 'none';
      flagBan.innerHTML = '';
    }
  }
}

function syncSubmitButton() {
  var btn = document.getElementById('submit-btn');
  if (!btn) return;

  SUBS = getSubmissions();
  var res = window.validateForm(FORMSTATE, CONFIG, SUBS);

  var blocked = getBlockedInterviewValue();
  var isBlocked = blocked && String(FORMSTATE.pathTaken) === blocked;

  if (!res.isFormValid || isBlocked) {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    return;
  }

  var softBlocked = res.softViolations.some(function (sv) {
    var ex = EXCEPTIONS[sv.field];
    return !ex || ex.used !== true || ex.rationaleValid !== true;
  });

  btn.disabled = softBlocked;
  btn.setAttribute('aria-disabled', softBlocked ? 'true' : 'false');
}

/* ---------------- Submit ---------------- */

function wireSubmitBtn() {
  var old = document.getElementById('submit-btn');
  if (!old) return;

  var fresh = old.cloneNode(true);
  old.parentNode.replaceChild(fresh, old);

  fresh.disabled = true;
  fresh.addEventListener('click', handleSubmit);
}

async function handleSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  SUBS = getSubmissions();
  var res = window.validateForm(FORMSTATE, CONFIG, SUBS);

  Object.keys(res.fieldResults).forEach(function (fn) {
    FIELDRESULTS[fn] = res.fieldResults[fn];
    paintFieldError(fn, res.fieldResults[fn]);
  });

  var banner = document.getElementById('form-error-banner');

  var blocked = getBlockedInterviewValue();
  var isBlocked = blocked && String(FORMSTATE.pathTaken) === blocked;

  if (!res.isFormValid || isBlocked) {
    if (banner) {
      if (isBlocked) {
        banner.innerHTML = '<strong>' + escHtml(getBlockedInterviewMessage()) + '</strong>';
      } else {
        banner.innerHTML = '<strong>Fix these errors</strong><ul>' +
          res.strictViolations.map(function (v) {
            return '<li><strong>' + escHtml(v.label) + '</strong> ' + escHtml(v.messages && v.messages[0] ? v.messages[0] : '') + '</li>';
          }).join('') +
        '</ul>';
      }
      banner.style.display = 'block';
    }

    if (!isBlocked && res.strictViolations.length) {
      var firstEl = document.getElementById(res.strictViolations[0].field);
      if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  for (var i = 0; i < res.softViolations.length; i++) {
    var sv = res.softViolations[i];
    var ex = EXCEPTIONS[sv.field];

    if (!ex || ex.used !== true) {
      if (banner) {
        banner.innerHTML = '<strong>Action needed</strong><ul><li><strong>' + escHtml(sv.label) + '</strong> This is a soft-rule exception. Enable the exception toggle and provide a rationale, or update the field value.</li></ul>';
        banner.style.display = 'block';
      }
      var group = document.getElementById('group-' + sv.field) || document.getElementById(sv.field);
      if (group) group.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (ex.rationaleValid !== true) {
      var re = document.getElementById('rationale-err-' + sv.field);
      var vr = validateRationale(ex.rationale, CONFIG);
      if (re) renderRationaleErrors(re, vr);

      if (banner) {
        banner.innerHTML = '<strong>Action needed</strong><ul><li><strong>' + escHtml(sv.label) + '</strong> Please enter a valid exception rationale.</li></ul>';
        banner.style.display = 'block';
      }

      var ta = document.getElementById('rationale-' + sv.field);
      if (ta) ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  if (banner) { banner.innerHTML = ''; banner.style.display = 'none'; }

  var exceptionData = {};
  var exceptionCount = 0;

  Object.keys(EXCEPTIONS).forEach(function (fn) {
    if (EXCEPTIONS[fn] && EXCEPTIONS[fn].used) {
      exceptionData[fn] = { rationale: EXCEPTIONS[fn].rationale || '' };
      exceptionCount++;
    }
  });

  var max = getMaxSoftExceptions();
  var flagged = max > 0 ? (exceptionCount > max) : false;

  var record = {};
  Object.keys(FORMSTATE).forEach(function (k) {
    if (k === 'editingId') return;
    record[k] = FORMSTATE[k];
  });

  record.exceptionCount = exceptionCount;
  record.flaggedForManager = flagged;
  record.exceptions = exceptionData;
  record.createdAt = new Date().toISOString();

  var editingId = FORMSTATE.editingId;
  var saved;

  try {
    var res = await fetch('http://localhost:8000/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    var data = await res.json();
    if (!res.ok) {
       var errMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
       if (banner) {
         banner.innerHTML = '<strong>Backend Validation Failed (Tier 1 Hard Reject)</strong><br/>' + escHtml(errMsg);
         banner.style.display = 'block';
       }
       var formTop = document.getElementById('candidate-form-fields');
       if (formTop) formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
       return;
    }
    record = Object.assign(record, data.data || {});
  } catch (err) {
    if (banner) {
      banner.innerHTML = '<strong>Network Error</strong><br/>Could not reach backend API at http://localhost:8000';
      banner.style.display = 'block';
    }
    return;
  }

  if (editingId) {
    saved = await updateSubmission(editingId, Object.assign({}, record, { updatedAt: new Date().toISOString() }));
    showToast('Record updated: ' + (saved ? (saved.fullName || '') : '') + ' (' + editingId + ')', 'success');
  } else {
    saved = await saveSubmission(record);
    showToast('Saved: ' + (saved.fullName || '') + ' (' + saved.id + ')', 'success');
  }

  SUBS = getSubmissions();
  showSuccessScreen(saved);
}

/* ---------------- Success screen ---------------- */

function showSuccessScreen(record) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.remove('nav-active'); });

  var sv = document.getElementById('view-success');
  if (sv) sv.classList.add('active');

  var sumEl = document.getElementById('success-summary');
  if (!sumEl) return;

  var sorted = Object.keys(CONFIG.fields)
    .map(function (k) { return { name: k, cfg: CONFIG.fields[k] }; })
    .sort(function (a, b) { return (a.cfg.order || 99) - (b.cfg.order || 99); });

  var rows = sorted.map(function (item) {
    var val = (record[item.name] !== undefined && record[item.name] !== null) ? String(record[item.name]) : '';
    var exc = record.exceptions && record.exceptions[item.name];
    var exTag = exc ? '<span class="rule-badge rule-badge--soft" style="font-size:.58rem">Exception</span>' : '';
    return '<tr><td class="sum-label">' + escHtml(item.cfg.label || item.name) + '</td><td class="sum-value">' + escHtml(val) + ' ' + exTag + '</td></tr>';
  }).join('');

  var flagHtml = record.flaggedForManager
    ? '<div class="success-flag-banner">Flagged for manager review • ' + escHtml(String(record.exceptionCount || 0)) + ' exceptions granted</div>'
    : '';

  sumEl.innerHTML =
    '<table class="summary-table">' +
      '<thead><tr><th>Field</th><th>Value</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    flagHtml +
    '<p class="summary-meta">ID <strong>' + escHtml(record.id) + '</strong> • ' +
      escHtml(new Date(record.createdAt).toLocaleString('en-IN')) +
    '</p>';

  wireOnce('new-candidate-btn', function () {
    if (sv) sv.classList.remove('active');
    resetForm();
    var fv = document.getElementById('view-form');
    if (fv) fv.classList.add('active');
    var nb = document.querySelector('[data-nav="form"]');
    if (nb) nb.classList.add('nav-active');
  });

  wireOnce('go-audit-btn', function () {
    if (sv) sv.classList.remove('active');
    showView('audit');
  });
}

/* ---------------- Reset form ---------------- */

function resetForm() {
  ['form-error-banner', 'rejected-banner', 'flagged-banner', 'editing-banner'].forEach(function (id) {
    var elx = document.getElementById(id);
    if (elx) { elx.style.display = 'none'; elx.innerHTML = ''; }
  });

  var counter = document.getElementById('exception-counter');
  if (counter) counter.style.display = 'none';

  Object.keys(CONFIG.fields).forEach(function (fn) {
    var input = document.getElementById(fn);
    var err = document.getElementById('error-' + fn);
    var sa = document.getElementById('soft-area-' + fn);
    var chk = document.getElementById('exc-chk-' + fn);
    var ra = document.getElementById('rationale-area-' + fn);
    var ta = document.getElementById('rationale-' + fn);
    var cc = document.getElementById('char-count-' + fn);
    var re = document.getElementById('rationale-err-' + fn);

    if (input) { input.value = ''; input.classList.remove('input-valid', 'input-error', 'input-warning'); }
    if (err) { err.textContent = ''; err.className = 'field-error'; }
    if (sa) sa.style.display = 'none';
    if (chk) chk.checked = false;
    if (ra) ra.style.display = 'none';
    if (ta) { ta.value = ''; ta.className = ''; }
    if (cc) cc.textContent = '0 / ' + getRationaleMinLength() + ' characters';
    if (re) re.innerHTML = '';
  });

  FORMSTATE = { percentageMode: 'percentage' };
  EXCEPTIONS = {};
  FIELDRESULTS = {};

  Object.keys(CONFIG.fields).forEach(function (f) {
    FORMSTATE[f] = '';
    EXCEPTIONS[f] = { used: false, rationale: '', rationaleValid: false };
  });

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    var isPct = btn.textContent.toLowerCase().indexOf('percentage') !== -1;
    btn.classList.toggle('active', isPct);
  });

  syncExceptionCounter();
  syncSubmitButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function runInitialValidationPass(prefill) {
  Object.keys(CONFIG.fields).forEach(function (fn) {
    var val = FORMSTATE[fn];
    if (val) {
      var r = runValidation(fn, val);
      if (r && r.isSoftViolation && EXCEPTIONS[fn] && EXCEPTIONS[fn].used) restoreSoftExceptionUI(fn);
    }
  });

  if (prefill && prefill.interviewStatus) renderRejectedBanner(prefill.interviewStatus);
  runValidation('offerLetterSent', FORMSTATE.offerLetterSent);

  syncExceptionCounter();
  syncSubmitButton();
}

function restoreSoftExceptionUI(fn) {
  var softArea = document.getElementById('soft-area-' + fn);
  if (!softArea) return;
  softArea.style.display = 'flex';
  softArea.style.flexDirection = 'column';
  softArea.style.gap = '8px';

  var chk = document.getElementById('exc-chk-' + fn);
  var ra = document.getElementById('rationale-area-' + fn);
  var ta = document.getElementById('rationale-' + fn);
  var cc = document.getElementById('char-count-' + fn);
  var re = document.getElementById('rationale-err-' + fn);

  if (chk) chk.checked = true;

  if (ra) {
    ra.style.display = 'flex';
    ra.style.flexDirection = 'column';
    ra.style.gap = '5px';
  }

  var minLen = getRationaleMinLength();
  var val = (EXCEPTIONS[fn].rationale || '').toString();

  if (ta) ta.value = val;

  var vr = validateRationale(val, CONFIG);
  EXCEPTIONS[fn].rationaleValid = vr.isValid;

  if (ta) ta.className = vr.isValid ? 'rationale-valid' : 'rationale-invalid';
  if (cc) cc.textContent = val.trim().length + ' / ' + minLen + ' characters';
  if (re) renderRationaleErrors(re, vr);
}

/* ---------------- Audit Log ---------------- */

function initAuditFilters() {
  ['audit-search', 'filter-status', 'filter-flagged', 'filter-exceptions'].forEach(function (id) {
    var elx = document.getElementById(id);
    if (!elx) return;
    elx.addEventListener('input', renderAuditLog);
    elx.addEventListener('change', renderAuditLog);
  });

  wireOnce('btn-export-csv', function () { exportCSV(); showToast('CSV exported.', 'success'); });
  wireOnce('btn-export-json', function () { exportJSON(); showToast('JSON exported.', 'success'); });
}

function renderAuditLog() {
  var tbody = document.querySelector('#audit-table tbody');
  if (!tbody) return;

  var subs = getSubmissions().slice().reverse();

  var search = (document.getElementById('audit-search') ? document.getElementById('audit-search').value : '') || '';
  var status = (document.getElementById('filter-status') ? document.getElementById('filter-status').value : '') || '';
  var flagged = (document.getElementById('filter-flagged') ? document.getElementById('filter-flagged').value : '') || '';
  var hasExc = (document.getElementById('filter-exceptions') ? document.getElementById('filter-exceptions').value : '') || '';

  var lc = search.toLowerCase();

  var filtered = subs.filter(function (s) {
    if (!s) return false;

    if (lc) {
      var n = String(s.fullName || '').toLowerCase();
      var e = String(s.email || '').toLowerCase();
      if (n.indexOf(lc) === -1 && e.indexOf(lc) === -1) return false;
    }

    if (status && s.pathTaken !== status) return false;

    if (flagged === 'yes' && !s.flaggedForManager) return false;
    if (flagged === 'no' && s.flaggedForManager) return false;

    var excCount = Number(s.exceptionCount || 0);
    if (hasExc === 'yes' && !(excCount > 0)) return false;
    if (hasExc === 'no' && (excCount > 0)) return false;

    return true;
  });

  var countEl = document.getElementById('audit-count');
  if (countEl) countEl.textContent = filtered.length + ' record' + (filtered.length === 1 ? '' : 's');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No matching submissions.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (s, i) {
    var sc = 'status-' + String(s.pathTaken || '').toLowerCase();
    var exc = (Number(s.exceptionCount || 0) > 0)
      ? '<span class="rule-badge rule-badge--soft">' + escHtml(String(s.exceptionCount)) + '</span>'
      : '<span style="color:var(--text-muted)">—</span>';

    var flg = s.flaggedForManager
      ? '<span class="flagged-badge">Flagged</span>'
      : '<span style="color:var(--text-muted)">—</span>';

    var stBadge = '<span class="status-badge ' + escHtml(sc) + '">' + escHtml(String(s.pathTaken || '')) + '</span>';

    return '' +
      '<tr class="' + (s.flaggedForManager ? 'flagged-row' : '') + '" data-id="' + escHtml(s.id) + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + escHtml(String(s.fullName || '')) + '</strong></td>' +
        '<td>' + escHtml(String(s.email || '')) + '</td>' +
        '<td>' + escHtml(new Date(s.createdAt).toLocaleString('en-IN')) + '</td>' +
        '<td>' + exc + '</td>' +
        '<td>' + flg + '</td>' +
        '<td>' + stBadge + '</td>' +
        '<td class="audit-actions">' +
          '<button class="btn-audit btn-audit--edit" data-id="' + escHtml(s.id) + '">Edit</button>' +
          '<button class="btn-audit btn-audit--delete" data-id="' + escHtml(s.id) + '">Delete</button>' +
        '</td>' +
      '</tr>';
  }).join('');

  // Edit
  tbody.querySelectorAll('.btn-audit--edit').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = btn.getAttribute('data-id');
      var rec = findById(id);
      if (rec) editEntry(rec);
    });
  });

  // Delete
  tbody.querySelectorAll('.btn-audit--delete').forEach(function (btn) {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      var id = btn.getAttribute('data-id');
      var rec = findById(id);
      if (!rec) return;
      if (!confirm('Delete record for ' + (rec.fullName || '') + ' (' + rec.id + ')? This cannot be undone.')) return;
      await deleteSubmission(id);
      SUBS = getSubmissions();
      showToast('Record deleted.', 'warning');
      renderAuditLog();
      renderDashboard();
    });
  });

  // NEW: Row click -> read-only detail
  tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
    tr.tabIndex = 0;
    tr.setAttribute('role', 'button');

    function openDetail() {
      var id = tr.getAttribute('data-id');
      var rec = findById(id);
      if (rec) showDetail(rec);
    }

    tr.addEventListener('click', openDetail);
    tr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') openDetail();
    });
  });
}

function showDetail(record) {
  DETAIL_ACTIVE_ID = record && record.id ? record.id : null;
  showView('detail');

  var subtitle = document.getElementById('detail-subtitle');
  if (subtitle) {
    subtitle.textContent = (record.fullName || '') + ' • ' + (record.id || '');
  }

  var flag = document.getElementById('detail-flag-banner');
  if (flag) {
    if (record.flaggedForManager) {
      flag.style.display = 'block';
      flag.innerHTML = '<strong>Flagged for manager review.</strong> ' + escHtml(String(record.exceptionCount || 0)) + ' exceptions granted.';
    } else {
      flag.style.display = 'none';
      flag.innerHTML = '';
    }
  }

  var host = document.getElementById('detail-body');
  if (!host) return;

  var sorted = Object.keys(CONFIG.fields)
    .map(function (k) { return { name: k, cfg: CONFIG.fields[k] }; })
    .sort(function (a, b) { return (a.cfg.order || 99) - (b.cfg.order || 99); });

  var rows = sorted.map(function (item) {
    var field = item.name;
    var label = item.cfg.label || field;
    var val = (record[field] !== undefined && record[field] !== null) ? String(record[field]) : '';

    var ex = record.exceptions && record.exceptions[field];
    var exHtml = '';
    if (ex && ex.rationale) {
      exHtml =
        '<div style="margin-top:6px; font-size:.82rem; color:var(--text-secondary)">' +
          '<span class="rule-badge rule-badge--soft" style="font-size:.58rem">Exception</span> ' +
          escHtml(String(ex.rationale)) +
        '</div>';
    }

    return '<tr>' +
      '<td class="sum-label">' + escHtml(label) + '</td>' +
      '<td class="sum-value">' + escHtml(val) + exHtml + '</td>' +
    '</tr>';
  }).join('');

  var meta = 'Submitted: ' + escHtml(new Date(record.createdAt).toLocaleString('en-IN'));
  if (record.updatedAt) meta += ' • Updated: ' + escHtml(new Date(record.updatedAt).toLocaleString('en-IN'));

  host.innerHTML =
    '<table class="summary-table">' +
      '<thead><tr><th>Field</th><th>Value</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '<p class="summary-meta">' + meta + '</p>';

  wireOnce('detail-back-btn', function () { showView('audit'); });
  wireOnce('detail-edit-btn', function () { editEntry(record); });
}

function editEntry(record) {
  showView('form');
  renderForm(record);
  var formCard = document.querySelector('.form-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function findById(id) {
  return getSubmissions().find(function (s) { return s && s.id === id; }) || null;
}

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  var subs = getSubmissions();

  var total = subs.length;
  var cleared = subs.filter(function (s) { return s.interviewStatus === 'Cleared'; }).length;
  var waitlisted = subs.filter(function (s) { return s.interviewStatus === 'Waitlisted'; }).length;
  var withEx = subs.filter(function (s) { return Number(s.exceptionCount || 0) > 0; }).length;
  var flagged = subs.filter(function (s) { return !!s.flaggedForManager; }).length;
  var rate = total > 0 ? ((withEx / total) * 100).toFixed(1) : '0.0';

  setText('dash-total', total);
  setText('dash-cleared', cleared);
  setText('dash-waitlisted', waitlisted);
  setText('dash-with-ex', withEx);
  setText('dash-rate', rate);
  setText('dash-flagged', flagged);
}

function setText(id, v) {
  var e = document.getElementById(id);
  if (e) e.textContent = String(v);
}

/* ---------------- Utilities ---------------- */

function el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wireOnce(id, fn) {
  var node = document.getElementById(id);
  if (!node) return;
  var fresh = node.cloneNode(true);
  node.parentNode.replaceChild(fresh, node);
  fresh.addEventListener('click', fn);
}