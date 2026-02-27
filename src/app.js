/**
 * app.js — AdmitGuard SPA
 *
 * Bug fix: Edit → Save button now activates correctly
 *   — renderForm(prefill) calls _runInitialValidationPass() after DOM is built,
 *     which programmatically fires runValidation() for every pre-filled field.
 *     This populates FIELD_RESULTS so syncSubmitButton() can enable the button.
 *
 * Prompt-04: calculateAgeOnDate() (integer, per spec) used in validator.js
 * Prompt-04: soft rule UI — amber warnings, exception toggle, rationale textarea
 * All soft/strict rules, thresholds, and messages remain config-driven.
 */
'use strict';

// ─── DEFAULT CONFIG ───────────────────────────────────────────────────────────
var DEFAULT_CONFIG = {
  schemaVersion:'1.0.0',
  programStartDate:'2026-07-01',
  softRuleKeywords:['approved by','special case','documentation pending','waiver granted'],
  systemRules:{ maxSoftExceptions:2 },
  fields:{
    fullName:{label:'Full Name',type:'text',ruleType:'strict',order:1,
      validations:{required:true,minLength:2,pattern:'^[A-Za-z ]+$'},
      messages:{required:'Full name is required.',minLength:'Full name must be at least 2 characters.',
                pattern:'Full name cannot contain numbers or special characters.'}},
    email:{label:'Email Address',type:'text',ruleType:'strict',order:2,
      validations:{required:true,format:'email',unique:true},
      messages:{required:'Email is required.',format:'Enter a valid email (e.g. name@domain.com).',
                unique:'This email address has already been submitted.'}},
    phone:{label:'Phone Number',type:'text',ruleType:'strict',order:3,
      validations:{required:true,pattern:'^[6-9][0-9]{9}$'},
      messages:{required:'Phone number is required.',
                pattern:'Must be a 10-digit Indian mobile number starting with 6–9.'}},
    dateOfBirth:{label:'Date of Birth',type:'date',ruleType:'soft',order:4,
      validations:{required:true,ageMin:18,ageMax:35},
      messages:{required:'Date of birth is required.',
                ageMin:'This candidate does not meet the standard age criteria (18–35 years on program start date).',
                ageMax:'This candidate does not meet the standard age criteria (18–35 years on program start date).'},
      exceptionAllowed:true,
      softWarning:'This candidate does not meet the standard age criteria (18–35 years on program start date).'},
    highestQualification:{label:'Highest Qualification',type:'select',ruleType:'strict',order:5,
      validations:{required:true,enum:['B.Tech','B.E.','B.Sc','BCA','M.Tech','M.Sc','MCA','MBA']},
      messages:{required:'Please select a qualification.',
                enum:'Must be one of: B.Tech, B.E., B.Sc, BCA, M.Tech, M.Sc, MCA, MBA.'}},
    graduationYear:{label:'Graduation Year',type:'number',ruleType:'soft',order:6,
      validations:{required:true,min:2015,max:2025},
      messages:{required:'Graduation year is required.',
                min:'Graduation year is outside the accepted range (must be 2015 or later).',
                max:'Graduation year is outside the accepted range (must be 2025 or earlier).'},
      exceptionAllowed:true,
      softWarning:'Graduation year is outside the accepted range (2015–2025).'},
    percentageOrCgpa:{label:'Percentage / CGPA',type:'percentageCgpa',ruleType:'soft',order:7,
      validations:{required:true,percentageMin:60,cgpaMin:6.0,cgpaMax:10.0},
      messages:{required:'Percentage or CGPA is required.',
                percentageMin:'Candidate does not meet the minimum academic score criteria (must be ≥ 60%).',
                cgpaMin:'Candidate does not meet the minimum academic score criteria (CGPA must be ≥ 6.0).',
                cgpaMax:'CGPA cannot exceed 10.0.'},
      exceptionAllowed:true,
      softWarning:'Candidate does not meet the minimum academic score criteria.'},
    screeningTestScore:{label:'Screening Test Score',type:'number',ruleType:'soft',order:8,
      validations:{required:true,min:0,max:100,passMark:40},
      messages:{required:'Screening test score is required.',min:'Cannot be negative.',
                max:'Cannot exceed 100.',
                passMark:'Screening test score is below the passing threshold of 40.'},
      exceptionAllowed:true,
      softWarning:'Screening test score is below the passing threshold of 40.'},
    interviewStatus:{label:'Interview Status',type:'select',ruleType:'strict',order:9,
      validations:{required:true,enum:['Cleared','Waitlisted','Rejected'],blockedValues:['Rejected']},
      messages:{required:'Interview status is required.',enum:'Must be Cleared, Waitlisted, or Rejected.',
                blockedValues:'Rejected candidates cannot be enrolled.'}},
    aadhaarNumber:{label:'Aadhaar Number',type:'text',ruleType:'strict',order:10,
      validations:{required:true,pattern:'^[0-9]{12}$'},
      messages:{required:'Aadhaar number is required.',
                pattern:'Must be exactly 12 digits — no letters or special characters.'}},
    offerLetterSent:{label:'Offer Letter Sent',type:'select',ruleType:'strict',order:11,
      validations:{required:true,enum:['Yes','No'],
        crossField:{dependsOn:'interviewStatus',triggerValue:'Yes',
                    allowedWhen:['Cleared','Waitlisted'],
                    message:'Offer letter cannot be sent to rejected candidates.'}},
      messages:{required:'Please specify offer letter status.',enum:'Must be Yes or No.'}}
  }
};

// ─── Live config ───────────────────────────────────────────────────────────────
var CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

// ─── State ─────────────────────────────────────────────────────────────────────
var FORM_STATE    = {};
var EXCEPTIONS    = {};
var FIELD_RESULTS = {};
var SUBS          = [];

// ─── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  var savedRules = getSavedRules();
  if (savedRules) {
    try { CONFIG = JSON.parse(JSON.stringify(savedRules)); } catch(e) {}
  }
  var synced = await syncFromDir();
  SUBS = getSubmissions();

  applyTheme(getTheme());
  renderForm();
  initNavigation();
  initThemeToggle();
  initAuditFilters();
  initStoragePanel();
  renderConfigRules();
  updateStorageBadge();

  if (synced) showToast('Synced data from local folder.', 'success');
});

// ─── Navigation ────────────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(function(btn) {
    btn.addEventListener('click', function(){ showView(btn.getAttribute('data-nav')); });
  });
  showView('form');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('[data-nav]').forEach(function(b){ b.classList.remove('nav-active'); });
  var v = document.getElementById('view-' + id);
  var b = document.querySelector('[data-nav="' + id + '"]');
  if (v) v.classList.add('active');
  if (b) b.classList.add('nav-active');
  if (id === 'audit')     renderAuditLog();
  if (id === 'dashboard') renderDashboard();
  if (id === 'config')    renderConfigRules();
}

// ─── Theme ─────────────────────────────────────────────────────────────────────
function initThemeToggle() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next); saveTheme(next);
  });
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? '☀ Light' : '🌙 Dark';
}

// ─── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast toast--' + (type||'info') + ' toast--show';
  clearTimeout(el._timer);
  el._timer = setTimeout(function(){ el.classList.remove('toast--show'); }, 3200);
}

// ─── Storage badge ──────────────────────────────────────────────────────────────
function updateStorageBadge() {
  var badge = document.getElementById('storage-badge');
  var name  = getDirName();
  if (!badge) return;
  if (name) {
    badge.textContent = '📁 ' + name;
    badge.title = 'Saving to local folder: ' + name;
    badge.className = 'storage-badge storage-badge--active';
  } else {
    badge.textContent = '🗄 Browser Storage';
    badge.title = 'Data stored in browser localStorage';
    badge.className = 'storage-badge storage-badge--default';
  }
}

// ─── Storage panel ──────────────────────────────────────────────────────────────
function initStoragePanel() {
  wireOnce('btn-pick-folder', async function() {
    var result = await pickStorageFolder();
    if (result.ok) {
      updateStorageBadge();
      showToast('Saving to folder: ' + result.name, 'success');
    } else {
      showToast(result.message, 'warning');
    }
    renderStorageStatus();
  });
  wireOnce('btn-clear-folder', async function() {
    await clearStorageFolder();
    updateStorageBadge();
    showToast('Switched back to browser storage.', 'info');
    renderStorageStatus();
  });
  renderStorageStatus();
}

function renderStorageStatus() {
  var el   = document.getElementById('storage-status-msg');
  var name = getDirName();
  if (!el) return;
  if (name) {
    el.innerHTML = '<span class="storage-ok">✅ Saving to local folder: <strong>' + escHtml(name) + '</strong></span>';
  } else if (hasFSAA()) {
    el.innerHTML = '<span class="storage-warn">🗄 Using browser storage. Pick a folder to persist data locally.</span>';
  } else {
    el.innerHTML = '<span class="storage-warn">⚠ File System API not supported in this browser. Using browser storage.</span>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURE RULES
// ═══════════════════════════════════════════════════════════════════════════════
function renderConfigRules() {
  renderStorageStatus();
  var container = document.getElementById('config-rules-body');
  if (!container) return;
  container.innerHTML = '';

  // System settings
  var sysCard = _el('div','config-card');
  sysCard.innerHTML = '<div class="config-card__title">⚙ System Settings</div>';
  var sysGrid = _el('div','config-sys-grid');
  sysGrid.appendChild(_configRow('Program Start Date','programStartDate','date',CONFIG.programStartDate,
    function(v){ CONFIG.programStartDate=v; }));
  sysGrid.appendChild(_configRow('Max Exceptions Before Flagging','maxSoftExceptions','number',CONFIG.systemRules.maxSoftExceptions,
    function(v){ CONFIG.systemRules.maxSoftExceptions=parseInt(v,10)||2; }));
  sysGrid.appendChild(_configRow('Exception Keywords (comma-separated)','softRuleKeywords','text',CONFIG.softRuleKeywords.join(', '),
    function(v){ CONFIG.softRuleKeywords=v.split(',').map(function(k){return k.trim();}).filter(Boolean); }));
  sysCard.appendChild(sysGrid);
  container.appendChild(sysCard);

  // Per-field
  var sorted = Object.keys(CONFIG.fields).map(function(k){ return {name:k,cfg:CONFIG.fields[k]}; })
    .sort(function(a,b){ return (a.cfg.order||99)-(b.cfg.order||99); });

  sorted.forEach(function(item) {
    var fn=item.name, cfg=item.cfg, v=cfg.validations||{};
    var card=_el('div','config-card');
    var hdr=_el('div','config-card__header');
    var ttl=_el('div','config-card__title'); ttl.textContent=cfg.label;
    var bdg=_el('span','rule-badge rule-badge--'+cfg.ruleType);
    bdg.textContent=cfg.ruleType.charAt(0).toUpperCase()+cfg.ruleType.slice(1);
    hdr.appendChild(ttl); hdr.appendChild(bdg); card.appendChild(hdr);
    var grid=_el('div','config-fields-grid');

    if (fn==='dateOfBirth') {
      grid.appendChild(_configRow('Min Age (years)',fn+'_ageMin','number',v.ageMin,function(val){
        var n=parseFloat(val)||18; CONFIG.fields[fn].validations.ageMin=n;
        CONFIG.fields[fn].messages.ageMin='This candidate does not meet the standard age criteria (must be ≥'+n+' years).';
        CONFIG.fields[fn].messages.ageMax='This candidate does not meet the standard age criteria (must be ≤'+CONFIG.fields[fn].validations.ageMax+' years).';
        CONFIG.fields[fn].softWarning='This candidate does not meet the standard age criteria ('+n+'–'+CONFIG.fields[fn].validations.ageMax+' years on program start date).';
      }));
      grid.appendChild(_configRow('Max Age (years)',fn+'_ageMax','number',v.ageMax,function(val){
        var n=parseFloat(val)||35; CONFIG.fields[fn].validations.ageMax=n;
        CONFIG.fields[fn].messages.ageMax='This candidate does not meet the standard age criteria (must be ≤'+n+' years).';
        CONFIG.fields[fn].softWarning='This candidate does not meet the standard age criteria ('+CONFIG.fields[fn].validations.ageMin+'–'+n+' years on program start date).';
      }));
    }
    if (fn==='graduationYear') {
      grid.appendChild(_configRow('Min Year',fn+'_min','number',v.min,function(val){
        var n=parseInt(val,10)||2015; CONFIG.fields[fn].validations.min=n;
        CONFIG.fields[fn].messages.min='Graduation year is outside the accepted range (must be '+n+' or later).';
        CONFIG.fields[fn].softWarning='Graduation year is outside the accepted range ('+n+'–'+CONFIG.fields[fn].validations.max+').';
      }));
      grid.appendChild(_configRow('Max Year',fn+'_max','number',v.max,function(val){
        var n=parseInt(val,10)||2025; CONFIG.fields[fn].validations.max=n;
        CONFIG.fields[fn].messages.max='Graduation year is outside the accepted range (must be '+n+' or earlier).';
        CONFIG.fields[fn].softWarning='Graduation year is outside the accepted range ('+CONFIG.fields[fn].validations.min+'–'+n+').';
      }));
    }
    if (fn==='percentageOrCgpa') {
      grid.appendChild(_configRow('Min Percentage (%)',fn+'_pct','number',v.percentageMin,function(val){
        var n=parseFloat(val)||60; CONFIG.fields[fn].validations.percentageMin=n;
        CONFIG.fields[fn].messages.percentageMin='Candidate does not meet the minimum academic score criteria (must be ≥'+n+'%).';
      }));
      grid.appendChild(_configRow('Min CGPA (/10)',fn+'_cgpa','number',v.cgpaMin,function(val){
        var n=parseFloat(val)||6; CONFIG.fields[fn].validations.cgpaMin=n;
        CONFIG.fields[fn].messages.cgpaMin='Candidate does not meet the minimum academic score criteria (CGPA must be ≥'+n+').';
      }));
    }
    if (fn==='screeningTestScore') {
      grid.appendChild(_configRow('Pass Mark',fn+'_pass','number',v.passMark,function(val){
        var n=parseFloat(val)||40; CONFIG.fields[fn].validations.passMark=n;
        CONFIG.fields[fn].messages.passMark='Screening test score is below the passing threshold of '+n+'.';
        CONFIG.fields[fn].softWarning='Screening test score is below the passing threshold of '+n+'.';
      }));
    }
    if (fn==='highestQualification') {
      grid.appendChild(_configRow('Allowed Qualifications (comma-separated)',fn+'_enum','text',(v.enum||[]).join(', '),function(val){
        CONFIG.fields[fn].validations.enum=val.split(',').map(function(k){return k.trim();}).filter(Boolean);
      }));
    }
    if (cfg.ruleType==='soft' && cfg.softWarning!==undefined) {
      grid.appendChild(_configRow('Soft Warning Message',fn+'_warn','text',cfg.softWarning,function(val){
        CONFIG.fields[fn].softWarning=val;
      }));
    }
    if (grid.children.length===0) {
      var note=_el('p','config-no-params'); note.textContent='No configurable parameters for this field.';
      grid.appendChild(note);
    }
    card.appendChild(grid); container.appendChild(card);
  });

  var actions = document.getElementById('config-actions');
  if (actions) {
    wireOnce('btn-save-rules',function(){
      saveRules(CONFIG); showToast('Rules saved! New entries will use updated rules.','success');
    });
    wireOnce('btn-reset-rules',function(){
      if (!confirm('Reset all rules to their original defaults?')) return;
      resetRules(); CONFIG=JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      renderConfigRules(); showToast('Rules reset to defaults.','info');
    });
    wireOnce('btn-export-rules',function(){
      var blob=new Blob([JSON.stringify(CONFIG,null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download='admitguard-rules.json';
      document.body.appendChild(a); a.click();
      setTimeout(function(){URL.revokeObjectURL(url);a.remove();},800);
      showToast('Rules exported as JSON.','success');
    });
  }
}

function _configRow(label,id,type,defaultVal,onChange){
  var row=_el('div','config-row');
  var lbl=_el('label',''); lbl.setAttribute('for','cfg-'+id); lbl.textContent=label;
  var inp=_el('input','cfg-input');
  inp.type=(type==='date'?'date':type==='number'?'number':'text');
  inp.id='cfg-'+id; inp.value=defaultVal!==undefined?defaultVal:'';
  inp.addEventListener('change',function(){onChange(inp.value);});
  inp.addEventListener('blur',  function(){onChange(inp.value);});
  row.appendChild(lbl); row.appendChild(inp); return row;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE FORM
// ═══════════════════════════════════════════════════════════════════════════════
function renderForm(prefill) {
  var container = document.getElementById('candidate-form-fields');
  if (!container) return;
  container.innerHTML = '';

  FORM_STATE    = { percentageMode:'percentage' };
  EXCEPTIONS    = {};
  FIELD_RESULTS = {};

  Object.keys(CONFIG.fields).forEach(function(f) {
    FORM_STATE[f]  = prefill ? (prefill[f] || '') : '';
    EXCEPTIONS[f]  = { used:false, rationale:'', rationaleValid:false };
  });

  if (prefill) {
    FORM_STATE._editingId     = prefill.id || null;
    FORM_STATE.percentageMode = prefill.percentageMode || 'percentage';
    // Restore exception state if editing a record that had exceptions
    if (prefill.exceptions) {
      Object.keys(prefill.exceptions).forEach(function(fn) {
        if (EXCEPTIONS[fn]) {
          EXCEPTIONS[fn].used           = true;
          EXCEPTIONS[fn].rationale      = prefill.exceptions[fn].rationale || '';
          EXCEPTIONS[fn].rationaleValid = validateRationale(EXCEPTIONS[fn].rationale).valid;
        }
      });
    }
  }

  var sorted = Object.keys(CONFIG.fields)
    .map(function(k){ return {name:k,cfg:CONFIG.fields[k]}; })
    .sort(function(a,b){ return (a.cfg.order||99)-(b.cfg.order||99); });

  sorted.forEach(function(item){ container.appendChild(buildFieldGroup(item.name, item.cfg)); });

  // Show editing banner
  var editBanner = document.getElementById('editing-banner');
  if (editBanner) {
    if (prefill && prefill.id) {
      editBanner.innerHTML = '✏️ Editing record <strong>' + escHtml(prefill.id) + '</strong> — ' + escHtml(prefill.fullName || '');
      editBanner.style.display = 'block';
    } else {
      editBanner.style.display = 'none';
    }
  }

  wireSubmitBtn();
  var rb = document.getElementById('reset-btn');
  if (rb) {
    var rfresh = rb.cloneNode(true);
    rb.parentNode.replaceChild(rfresh, rb);
    rfresh.addEventListener('click', resetForm);
  }

  // ── BUG FIX: Run validation for all pre-filled fields so Save button activates ──
  if (prefill) {
    // Use requestAnimationFrame to ensure DOM inputs are rendered before reading
    requestAnimationFrame(function() {
      _runInitialValidationPass(prefill);
    });
  } else {
    syncSubmitButton();
  }
}

/**
 * BUG FIX — Edit → Save button activation
 *
 * Problem: programmatic el.value = x does NOT fire 'input'/'change' events.
 *          FIELD_RESULTS stays empty → syncSubmitButton always disables the button.
 *
 * Fix: After DOM renders, call runValidation() for every field that has a value,
 *      then call syncSubmitButton() once all results are populated.
 *
 * Also restores exception UI state for fields that had exceptions in the original record.
 */
function _runInitialValidationPass(prefill) {
  // Run validation for every field
  Object.keys(CONFIG.fields).forEach(function(fn) {
    var val = FORM_STATE[fn] || '';
    if (val) {
      var result = runValidation(fn, val);
      // Restore soft exception UI if this field had an exception
      if (result && result.isSoftViolation && EXCEPTIONS[fn] && EXCEPTIONS[fn].used) {
        _restoreSoftExceptionUI(fn);
      }
    }
  });

  // Trigger cross-field re-validation (e.g. offerLetterSent depends on interviewStatus)
  if (prefill.interviewStatus) {
    renderRejectedBanner(prefill.interviewStatus);
    runValidation('offerLetterSent', FORM_STATE['offerLetterSent'] || '');
  }

  syncExceptionCounter();
  syncSubmitButton();
}

/** Restores checkbox + textarea UI for a field that had an exception in the edited record */
function _restoreSoftExceptionUI(fn) {
  var softArea = document.getElementById('soft-area-' + fn);
  if (!softArea) return;
  softArea.style.display = 'flex';
  softArea.style.flexDirection = 'column';
  softArea.style.gap = '8px';

  var chk = document.getElementById('exc-chk-' + fn);
  var ra  = document.getElementById('rationale-area-' + fn);
  var ta  = document.getElementById('rationale-' + fn);
  var cc  = document.getElementById('char-count-' + fn);
  var re  = document.getElementById('rationale-err-' + fn);

  if (chk) chk.checked = true;
  if (ra)  { ra.style.display='flex'; ra.style.flexDirection='column'; ra.style.gap='4px'; }
  if (ta && EXCEPTIONS[fn].rationale) {
    ta.value = EXCEPTIONS[fn].rationale;
    var vr   = validateRationale(EXCEPTIONS[fn].rationale);
    EXCEPTIONS[fn].rationaleValid = vr.valid;
    ta.className  = vr.valid ? 'rationale-valid' : 'rationale-invalid';
    if (cc) cc.textContent = EXCEPTIONS[fn].rationale.length + ' / 30 min';
    if (re) {
      re.textContent  = vr.valid ? '✓ Rationale accepted' : vr.message;
      re.style.color  = vr.valid ? 'var(--success)' : 'var(--error)';
    }
  }
}

// ── Wire Submit ─────────────────────────────────────────────────────────────────
function wireSubmitBtn() {
  var old = document.getElementById('submit-btn');
  if (!old) return;
  var fresh = old.cloneNode(true);
  old.parentNode.replaceChild(fresh, old);
  fresh.disabled = true;
  fresh.addEventListener('click', handleSubmit);
}

// ── Field Group Builder ─────────────────────────────────────────────────────────
function buildFieldGroup(fieldName, cfg) {
  var group = _el('div','field-group');
  group.id  = 'group-' + fieldName;

  var label = document.createElement('label');
  label.setAttribute('for', fieldName);
  var lspan = _el('span',''); lspan.textContent = cfg.label;
  label.appendChild(lspan);
  if (cfg.validations.required) {
    var req = _el('span','required-mark'); req.textContent=' *'; label.appendChild(req);
  }
  var badge = _el('span','rule-badge rule-badge--'+cfg.ruleType);
  badge.textContent = cfg.ruleType.charAt(0).toUpperCase()+cfg.ruleType.slice(1);
  label.appendChild(badge);
  group.appendChild(label);

  if (cfg.type === 'percentageCgpa') {
    group.appendChild(buildPercentageCgpaWidget(fieldName));
  } else {
    group.appendChild(buildInput(fieldName, cfg));
  }

  var errSpan = _el('span','field-error');
  errSpan.id = 'error-' + fieldName;
  errSpan.setAttribute('aria-live','polite');
  group.appendChild(errSpan);

  if (cfg.ruleType === 'soft' && cfg.exceptionAllowed) {
    group.appendChild(buildSoftArea(fieldName, cfg));
  }
  return group;
}

function buildInput(fieldName, cfg) {
  var el;
  if (cfg.type === 'select') {
    el = document.createElement('select');
    var ph = document.createElement('option');
    ph.value=''; ph.disabled=true; ph.selected=true;
    ph.textContent = '— Select ' + cfg.label + ' —';
    el.appendChild(ph);
    (cfg.validations.enum||[]).forEach(function(opt){
      var o = document.createElement('option'); o.value=opt; o.textContent=opt; el.appendChild(o);
    });
  } else if (cfg.type==='date') {
    el = document.createElement('input'); el.type='date';
  } else if (cfg.type==='number') {
    el = document.createElement('input'); el.type='number'; el.step='1'; el.placeholder='0';
  } else {
    el = document.createElement('input'); el.type='text'; el.placeholder=cfg.label;
  }
  el.id=fieldName; el.name=fieldName; el.className='form-input';
  if (FORM_STATE[fieldName]) el.value = FORM_STATE[fieldName];
  attachListeners(el, fieldName);
  return el;
}

function buildPercentageCgpaWidget(fieldName) {
  var wrapper = _el('div','percent-cgpa-wrapper');
  var modeRow = _el('div','mode-toggle');
  var pBtn    = document.createElement('button');
  pBtn.type='button'; pBtn.textContent='% Percentage'; pBtn.className='mode-btn active';
  var cBtn    = document.createElement('button');
  cBtn.type='button'; cBtn.textContent='CGPA /10'; cBtn.className='mode-btn';
  var input   = document.createElement('input');
  input.type='number'; input.step='0.01'; input.id=fieldName; input.name=fieldName;
  input.className='form-input'; input.placeholder='e.g. 72.5';

  // Restore mode if editing
  if (FORM_STATE.percentageMode === 'cgpa') {
    cBtn.classList.add('active'); pBtn.classList.remove('active');
    input.placeholder = 'e.g. 7.5';
  }
  if (FORM_STATE[fieldName]) input.value = FORM_STATE[fieldName];

  pBtn.addEventListener('click', function(){
    FORM_STATE.percentageMode='percentage';
    pBtn.classList.add('active'); cBtn.classList.remove('active');
    input.placeholder='e.g. 72.5'; runValidation(fieldName, input.value);
  });
  cBtn.addEventListener('click', function(){
    FORM_STATE.percentageMode='cgpa';
    cBtn.classList.add('active'); pBtn.classList.remove('active');
    input.placeholder='e.g. 7.5'; runValidation(fieldName, input.value);
  });
  attachListeners(input, fieldName);
  modeRow.appendChild(pBtn); modeRow.appendChild(cBtn);
  wrapper.appendChild(modeRow); wrapper.appendChild(input);
  return wrapper;
}

// ── Soft Exception Area (Prompt-04 full implementation) ─────────────────────────
function buildSoftArea(fieldName, cfg) {
  var area = _el('div','soft-exception-area');
  area.id  = 'soft-area-' + fieldName;
  area.style.display = 'none';

  var warnMsg = _el('div','soft-warning-msg');
  warnMsg.id  = 'soft-msg-' + fieldName;
  warnMsg.textContent = cfg.softWarning || 'This field does not meet the standard criteria.';
  area.appendChild(warnMsg);

  var toggleRow = _el('div','exception-toggle-row');
  var chk = document.createElement('input');
  chk.type='checkbox'; chk.id='exc-chk-'+fieldName;
  var chkLabel = document.createElement('label');
  chkLabel.setAttribute('for','exc-chk-'+fieldName);
  chkLabel.textContent = 'Allow Exception for this field';
  toggleRow.appendChild(chk); toggleRow.appendChild(chkLabel);
  area.appendChild(toggleRow);

  var rationaleDiv = _el('div','rationale-area');
  rationaleDiv.id = 'rationale-area-' + fieldName;
  rationaleDiv.style.display = 'none';

  var rationaleLabel = _el('label','rationale-label');
  rationaleLabel.setAttribute('for','rationale-'+fieldName);
  rationaleLabel.textContent = 'Exception Rationale:';

  var ta = document.createElement('textarea');
  ta.id   = 'rationale-' + fieldName;
  ta.placeholder = 'Min 30 chars. Include one of: "approved by", "special case", "documentation pending", "waiver granted"';
  ta.rows = 3;

  var charCount = _el('span','char-count');
  charCount.id  = 'char-count-' + fieldName;
  charCount.textContent = '0 / 30 min';

  var rationaleErr = _el('span','rationale-error');
  rationaleErr.id = 'rationale-err-' + fieldName;

  rationaleDiv.appendChild(rationaleLabel);
  rationaleDiv.appendChild(ta);
  rationaleDiv.appendChild(charCount);
  rationaleDiv.appendChild(rationaleErr);
  area.appendChild(rationaleDiv);

  // Checkbox toggle
  chk.addEventListener('change', function(){
    EXCEPTIONS[fieldName].used = chk.checked;
    if (chk.checked) {
      rationaleDiv.style.display='flex'; rationaleDiv.style.flexDirection='column'; rationaleDiv.style.gap='5px';
    } else {
      rationaleDiv.style.display='none';
      EXCEPTIONS[fieldName].rationale=''; EXCEPTIONS[fieldName].rationaleValid=false;
      ta.value=''; ta.className=''; rationaleErr.textContent=''; charCount.textContent='0 / 30 min';
    }
    syncExceptionCounter(); syncSubmitButton();
  });

  // Rationale textarea
  ta.addEventListener('input', function(){
    var val = ta.value;
    EXCEPTIONS[fieldName].rationale = val;
    charCount.textContent = val.length + ' / 30 min';
    var result = validateRationale(val);
    EXCEPTIONS[fieldName].rationaleValid = result.valid;
    ta.className  = result.valid ? 'rationale-valid' : (val.length>0 ? 'rationale-invalid' : '');
    rationaleErr.textContent = result.valid ? '✓ Rationale accepted' : result.message;
    rationaleErr.style.color = result.valid ? 'var(--success)' : 'var(--error)';
    syncSubmitButton();
  });

  return area;
}

function validateRationale(text) {
  if (!text || text.trim().length < 30)
    return { valid:false, message:'Rationale must be at least 30 characters.' };
  var lower = text.toLowerCase();
  var hasKw = CONFIG.softRuleKeywords.some(function(kw){ return lower.indexOf(kw) !== -1; });
  if (!hasKw)
    return { valid:false, message:'Must include: "' + CONFIG.softRuleKeywords.join('", "') + '".' };
  return { valid:true, message:'' };
}

// ── Attach Listeners ──────────────────────────────────────────────────────────
function attachListeners(el, fieldName) {
  function handle() {
    FORM_STATE[fieldName] = el.value;
    runValidation(fieldName, el.value);
    if (fieldName === 'interviewStatus') {
      renderRejectedBanner(el.value);
      runValidation('offerLetterSent', FORM_STATE['offerLetterSent']||'');
    }
  }
  el.addEventListener('input',  handle);
  el.addEventListener('change', handle);
  el.addEventListener('blur',   handle);
}

// ── Run Validation ─────────────────────────────────────────────────────────────
function runValidation(fieldName, value) {
  var result = validateField(fieldName, value, FORM_STATE, CONFIG, SUBS);
  FIELD_RESULTS[fieldName] = result;
  paintFieldError(fieldName, result);

  var softArea = document.getElementById('soft-area-' + fieldName);
  var softMsg  = document.getElementById('soft-msg-' + fieldName);
  if (softArea) {
    if (result.isSoftViolation) {
      // Update the soft warning message with the specific violation message
      if (softMsg && result.messages.length > 0) softMsg.textContent = result.messages[0];
      softArea.style.display='flex'; softArea.style.flexDirection='column'; softArea.style.gap='8px';
    } else {
      softArea.style.display='none';
      // Only clear exception state if not currently active (don't wipe during edit restore)
      if (EXCEPTIONS[fieldName] && !EXCEPTIONS[fieldName].used) {
        EXCEPTIONS[fieldName].used=false; EXCEPTIONS[fieldName].rationaleValid=false;
        var chk=document.getElementById('exc-chk-'+fieldName);
        var ra =document.getElementById('rationale-area-'+fieldName);
        var ta =document.getElementById('rationale-'+fieldName);
        var cc =document.getElementById('char-count-'+fieldName);
        var re =document.getElementById('rationale-err-'+fieldName);
        if (chk) chk.checked=false; if (ra) ra.style.display='none';
        if (ta)  { ta.value=''; ta.className=''; }
        if (cc)  cc.textContent='0 / 30 min'; if (re) re.textContent='';
      }
    }
  }

  syncExceptionCounter();
  syncSubmitButton();
  return result;
}

// ── Sync Exception Counter ─────────────────────────────────────────────────────
function syncExceptionCounter() {
  var count   = Object.keys(EXCEPTIONS).filter(function(fn){ return EXCEPTIONS[fn].used; }).length;
  var max     = CONFIG.systemRules.maxSoftExceptions;
  var counter = document.getElementById('exception-counter');
  var valEl   = document.getElementById('exception-count-val');
  var flagBan = document.getElementById('flagged-banner');
  if (counter) counter.style.display = count>0 ? 'flex' : 'none';
  if (valEl)   valEl.textContent = count;
  if (flagBan) {
    if (count > max) {
      flagBan.style.display='block';
      flagBan.innerHTML='⚠ <strong>'+count+' exceptions granted</strong> — this entry will be <strong>flagged for manager review</strong>. You may still submit.';
    } else {
      flagBan.style.display='none';
    }
  }
}

// ── Sync Submit Button ──────────────────────────────────────────────────────────
function syncSubmitButton() {
  var btn = document.getElementById('submit-btn');
  if (!btn) return;
  var res        = validateForm(FORM_STATE, CONFIG, SUBS);
  var isRejected = (FORM_STATE['interviewStatus'] === 'Rejected');
  if (!res.isFormValid || isRejected) {
    btn.disabled=true; btn.setAttribute('aria-disabled','true'); return;
  }
  // Soft: blocked if violation present AND exception toggle is OFF or rationale invalid
  var softBlocked = res.softViolations.some(function(sv) {
    var ex = EXCEPTIONS[sv.field];
    return !(ex && ex.used===true && ex.rationaleValid===true);
  });
  btn.disabled = softBlocked;
  btn.setAttribute('aria-disabled', softBlocked ? 'true' : 'false');
}

// ── Paint Field Error ──────────────────────────────────────────────────────────
function paintFieldError(fieldName, result) {
  var span  = document.getElementById('error-'+fieldName);
  var input = document.getElementById(fieldName);
  if (!span) return;
  if (input) input.classList.remove('input-valid','input-error','input-warning');
  if (!result.isValid && result.messages.length>0) {
    span.textContent = result.messages[0];
    span.className   = result.isStrictViolation ? 'field-error field-error--strict' : 'field-error field-error--soft';
    if (input) input.classList.add(result.isStrictViolation ? 'input-error' : 'input-warning');
  } else {
    span.textContent=''; span.className='field-error';
    if (input && String(FORM_STATE[fieldName]||'').trim()!=='') input.classList.add('input-valid');
  }
}

function renderRejectedBanner(val) {
  var b = document.getElementById('rejected-banner');
  if (!b) return;
  if (val === 'Rejected') {
    b.innerHTML='🚫 <strong>Rejected candidates cannot be enrolled.</strong> Submission is blocked.';
    b.style.display='block';
  } else { b.innerHTML=''; b.style.display='none'; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT
// ═══════════════════════════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();
  SUBS = getSubmissions();
  var res    = validateForm(FORM_STATE, CONFIG, SUBS);
  var banner = document.getElementById('form-error-banner');

  Object.keys(res.fieldResults).forEach(function(fn){
    FIELD_RESULTS[fn]=res.fieldResults[fn]; paintFieldError(fn,res.fieldResults[fn]);
  });

  if (!res.isFormValid) {
    banner.innerHTML = '<strong>⛔ Fix these errors:</strong><ul>' +
      res.strictViolations.map(function(v){
        return '<li><strong>'+escHtml(v.label)+':</strong> '+escHtml(v.messages[0])+'</li>';
      }).join('')+'</ul>';
    banner.style.display='block';
    var firstEl = document.getElementById(res.strictViolations[0].field);
    if (firstEl) firstEl.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  banner.style.display='none';

  var exceptionData={}, exceptionCount=0;
  Object.keys(EXCEPTIONS).forEach(function(fn){
    if (EXCEPTIONS[fn].used){ exceptionData[fn]={rationale:EXCEPTIONS[fn].rationale}; exceptionCount++; }
  });
  var flagged = exceptionCount > CONFIG.systemRules.maxSoftExceptions;

  var record = {};
  Object.keys(FORM_STATE).forEach(function(k){
    if (k!=='percentageMode' && k!=='_editingId') record[k]=FORM_STATE[k];
  });
  record.percentageMode    = FORM_STATE.percentageMode;
  record.exceptionCount    = exceptionCount;
  record.flaggedForManager = flagged;
  record.exceptions        = exceptionData;
  record.createdAt         = new Date().toISOString();

  var editingId = FORM_STATE._editingId;
  var saved;
  if (editingId) {
    saved = await updateSubmission(editingId, record);
    showToast('Record updated: '+(saved.fullName||saved.id),'success');
  } else {
    saved = await saveSubmission(record);
  }
  SUBS = getSubmissions();
  showSuccessScreen(saved);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function showSuccessScreen(record) {
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('[data-nav]').forEach(function(b){ b.classList.remove('nav-active'); });
  var sv = document.getElementById('view-success');
  if (sv) sv.classList.add('active');

  var sumEl = document.getElementById('success-summary');
  if (!sumEl) return;

  var sorted = Object.keys(CONFIG.fields)
    .map(function(k){ return {name:k,cfg:CONFIG.fields[k]}; })
    .sort(function(a,b){ return (a.cfg.order||99)-(b.cfg.order||99); });

  var rows = sorted.map(function(item){
    var val   = String(record[item.name]||'—');
    var exc   = record.exceptions && record.exceptions[item.name];
    var exTag = exc ? ' <span class="rule-badge rule-badge--soft" style="font-size:.58rem">Exception</span>' : '';
    return '<tr><td class="sum-label">'+escHtml(item.cfg.label)+'</td><td class="sum-value">'+escHtml(val)+exTag+'</td></tr>';
  }).join('');

  var flagHtml = record.flaggedForManager
    ? '<div class="success-flag-banner">⚠ Flagged for manager review — '+record.exceptionCount+' exception(s) granted</div>'
    : '';

  sumEl.innerHTML =
    '<table class="summary-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>'+rows+'</tbody></table>' +
    flagHtml +
    '<p class="summary-meta">ID: <strong>'+escHtml(record.id)+'</strong> · '+new Date(record.createdAt).toLocaleString('en-IN')+'</p>';

  wireOnce('new-candidate-btn', function(){
    if (sv) sv.classList.remove('active');
    resetForm();
    var fv=document.getElementById('view-form'); if(fv) fv.classList.add('active');
    var nb=document.querySelector('[data-nav="form"]'); if(nb) nb.classList.add('nav-active');
  });
  wireOnce('go-audit-btn', function(){
    if (sv) sv.classList.remove('active');
    showView('audit');
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════
function resetForm() {
  ['form-error-banner','rejected-banner','flagged-banner','editing-banner'].forEach(function(id){
    var el=document.getElementById(id); if(el){ el.style.display='none'; el.innerHTML=''; }
  });
  var counter=document.getElementById('exception-counter');
  if (counter) counter.style.display='none';

  Object.keys(CONFIG.fields).forEach(function(fn){
    var el=document.getElementById(fn), err=document.getElementById('error-'+fn),
        sa=document.getElementById('soft-area-'+fn), chk=document.getElementById('exc-chk-'+fn),
        ra=document.getElementById('rationale-area-'+fn), ta=document.getElementById('rationale-'+fn),
        cc=document.getElementById('char-count-'+fn), re=document.getElementById('rationale-err-'+fn);
    if (el)  { el.value=''; el.classList.remove('input-valid','input-error','input-warning'); }
    if (err) { err.textContent=''; err.className='field-error'; }
    if (sa)  sa.style.display='none'; if (chk) chk.checked=false;
    if (ra)  ra.style.display='none';
    if (ta)  { ta.value=''; ta.className=''; }
    if (cc)  cc.textContent='0 / 30 min'; if (re) re.textContent='';
  });
  FORM_STATE={percentageMode:'percentage'}; EXCEPTIONS={}; FIELD_RESULTS={};
  Object.keys(CONFIG.fields).forEach(function(f){
    FORM_STATE[f]=''; EXCEPTIONS[f]={used:false,rationale:'',rationaleValid:false};
  });
  document.querySelectorAll('.mode-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.textContent.indexOf('%')!==-1);
  });
  syncSubmitButton();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG — Edit, Flag/Unflag, Delete
// ═══════════════════════════════════════════════════════════════════════════════
function initAuditFilters() {
  ['audit-search','filter-status','filter-flagged','filter-exceptions'].forEach(function(id){
    var el=document.getElementById(id);
    if (el) el.addEventListener('input',  renderAuditLog);
    if (el) el.addEventListener('change', renderAuditLog);
  });
  wireOnce('btn-export-csv',  function(){ exportCSV();  showToast('CSV exported.','success'); });
  wireOnce('btn-export-json', function(){ exportJSON(); showToast('JSON exported.','success'); });
}

function renderAuditLog() {
  var tbody = document.querySelector('#audit-table tbody');
  if (!tbody) return;
  var subs    = getSubmissions().slice().reverse();
  var search  = (document.getElementById('audit-search')     ||{}).value||'';
  var status  = (document.getElementById('filter-status')    ||{}).value||'';
  var flagged = (document.getElementById('filter-flagged')   ||{}).value||'';
  var hasExc  = (document.getElementById('filter-exceptions')||{}).value||'';
  var lc      = search.toLowerCase();

  var filtered = subs.filter(function(s){
    if (lc && !((s.fullName||'').toLowerCase().includes(lc)||(s.email||'').toLowerCase().includes(lc))) return false;
    if (status  && s.interviewStatus!==status)       return false;
    if (flagged==='yes' && !s.flaggedForManager)     return false;
    if (flagged==='no'  &&  s.flaggedForManager)     return false;
    if (hasExc==='yes'  && !(s.exceptionCount>0))    return false;
    if (hasExc==='no'   &&   s.exceptionCount>0)     return false;
    return true;
  });

  var countEl=document.getElementById('audit-count');
  if (countEl) countEl.textContent=filtered.length+' record'+(filtered.length!==1?'s':'');

  if (!filtered.length) {
    tbody.innerHTML='<tr><td colspan="8" class="empty-state">No matching submissions.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(s,i){
    var sc      = 'status-'+(s.interviewStatus||'').toLowerCase();
    var exc     = s.exceptionCount>0
      ? '<span class="rule-badge rule-badge--soft">'+s.exceptionCount+'</span>'
      : '<span style="color:var(--text-muted)">—</span>';
    var flg     = s.flaggedForManager
      ? '<span class="flagged-badge">⚠ Flagged</span>'
      : '<span style="color:var(--text-muted)">—</span>';
    var stBadge = '<span class="status-badge '+sc+'">'+escHtml(s.interviewStatus||'—')+'</span>';
    var flagBtnTxt = s.flaggedForManager ? 'Unflag' : 'Flag';
    var flagBtnCls = s.flaggedForManager ? 'btn-audit btn-audit--unflag' : 'btn-audit btn-audit--flag';
    return '<tr class="'+(s.flaggedForManager?'flagged-row':'')+'" data-id="'+escHtml(s.id)+'">' +
      '<td>'+(i+1)+'</td>'+
      '<td><strong>'+escHtml(s.fullName||'—')+'</strong></td>'+
      '<td>'+escHtml(s.email||'—')+'</td>'+
      '<td>'+new Date(s.createdAt).toLocaleString('en-IN')+'</td>'+
      '<td>'+exc+'</td>'+
      '<td>'+flg+'</td>'+
      '<td>'+stBadge+'</td>'+
      '<td class="audit-actions">'+
        '<button class="btn-audit btn-audit--edit"   data-id="'+escHtml(s.id)+'">✏️ Edit</button>'+
        '<button class="'+flagBtnCls+'"              data-id="'+escHtml(s.id)+'">🚩 '+flagBtnTxt+'</button>'+
        '<button class="btn-audit btn-audit--delete" data-id="'+escHtml(s.id)+'">🗑 Delete</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  tbody.querySelectorAll('.btn-audit--edit').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var id  = btn.getAttribute('data-id');
      var rec = getSubmissions().find(function(s){ return s.id===id; });
      if (rec) editEntry(rec);
    });
  });
  tbody.querySelectorAll('.btn-audit--flag, .btn-audit--unflag').forEach(function(btn){
    btn.addEventListener('click', async function(e){
      e.stopPropagation();
      var updated = await toggleFlag(btn.getAttribute('data-id'));
      SUBS = getSubmissions();
      showToast(updated.flaggedForManager ? 'Entry flagged.' : 'Flag removed.','info');
      renderAuditLog(); renderDashboard();
    });
  });
  tbody.querySelectorAll('.btn-audit--delete').forEach(function(btn){
    btn.addEventListener('click', async function(e){
      e.stopPropagation();
      var id  = btn.getAttribute('data-id');
      var rec = getSubmissions().find(function(s){ return s.id===id; });
      if (!rec || !confirm('Delete record for "'+( rec.fullName||rec.id )+'"? This cannot be undone.')) return;
      await deleteSubmission(id);
      SUBS = getSubmissions();
      showToast('Record deleted.','warning');
      renderAuditLog(); renderDashboard();
    });
  });
}

function editEntry(record) {
  showView('form');
  renderForm(record);
  var formCard = document.querySelector('.form-card');
  if (formCard) formCard.scrollIntoView({behavior:'smooth',block:'start'});
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  var subs=getSubmissions(), total=subs.length;
  var cleared    = subs.filter(function(s){return s.interviewStatus==='Cleared';}).length;
  var waitlisted = subs.filter(function(s){return s.interviewStatus==='Waitlisted';}).length;
  var withEx     = subs.filter(function(s){return s.exceptionCount>0;}).length;
  var flagged    = subs.filter(function(s){return s.flaggedForManager;}).length;
  var rate       = total>0 ? ((withEx/total)*100).toFixed(1) : '0.0';
  function set(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
  set('dash-total',total); set('dash-cleared',cleared); set('dash-waitlisted',waitlisted);
  set('dash-with-ex',withEx); set('dash-rate',rate+'%'); set('dash-flagged',flagged);
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function _el(tag,cls){ var e=document.createElement(tag); if(cls) e.className=cls; return e; }
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function wireOnce(id,fn){
  var el=document.getElementById(id); if(!el) return;
  var fresh=el.cloneNode(true); el.parentNode.replaceChild(fresh,el);
  fresh.addEventListener('click',fn);
}
