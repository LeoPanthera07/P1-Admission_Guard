/* ═══════════════════════════════════════════════════════
   AdmitGuard — app.js
   Responsibilities (Prompt 1 scope):
   - SPA view switching (no page reload)
   - Theme toggle (light / dark) with localStorage persistence
   - Score mode toggle (Percentage % / CGPA /10)
   - Reset form
   - Wire "Go to Audit Log" and "New Candidate" on success screen
   Validation logic intentionally NOT included here — see validator.js (Phase 3)
   ═══════════════════════════════════════════════════════ */

'use strict';

// ── Constants ──────────────────────────────────────────
const THEME_KEY  = 'admitguard-theme';
const VIEWS      = ['form', 'audit', 'dashboard'];
const DEFAULT_VIEW = 'form';

// ── DOM References ─────────────────────────────────────
const html         = document.documentElement;
const themeToggle  = document.getElementById('theme-toggle');
const themeIcon    = document.getElementById('theme-icon');
const navTabs      = document.querySelectorAll('.nav-tab');
const viewSections = {
  form:      document.getElementById('view-form'),
  audit:     document.getElementById('view-audit'),
  dashboard: document.getElementById('view-dashboard'),
};

const modeRadios       = document.querySelectorAll('input[name="scoreMode"]');
const scoreSuffix      = document.getElementById('score-suffix');
const scoreInput       = document.getElementById('percentageOrCgpa');
const scoreHint        = document.getElementById('percentageOrCgpa-hint');

const btnReset         = document.getElementById('btn-reset');
const btnNewCandidate  = document.getElementById('btn-new-candidate');
const btnGoAudit       = document.getElementById('btn-go-audit');
const btnRefreshDash   = document.getElementById('btn-refresh-dashboard');

const modalOverlay     = document.getElementById('detail-modal-overlay');
const modalClose       = document.getElementById('modal-close');
const modalCloseBtn    = document.getElementById('modal-close-btn');

// ── View Switching ─────────────────────────────────────
/**
 * Activate a named view and update nav tab active state.
 * @param {string} viewName - 'form' | 'audit' | 'dashboard'
 */
function activateView(viewName) {
  if (!VIEWS.includes(viewName)) viewName = DEFAULT_VIEW;

  VIEWS.forEach((v) => {
    const section = viewSections[v];
    const tab     = document.getElementById('nav-' + v);
    if (!section || !tab) return;

    if (v === viewName) {
      section.classList.remove('hidden');
      section.classList.add('active');
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    } else {
      section.classList.add('hidden');
      section.classList.remove('active');
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // Side-effects per view
  if (viewName === 'audit')     refreshAuditLog();
  if (viewName === 'dashboard') refreshDashboard();
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.view;
    activateView(target);
  });
});

// ── Theme Toggle ───────────────────────────────────────
function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = html.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

themeToggle.addEventListener('click', toggleTheme);

// Restore saved theme on load
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
})();

// ── Score Mode Toggle (Percentage ↔ CGPA) ──────────────
function applyScoreMode(mode) {
  if (mode === 'cgpa') {
    scoreSuffix.textContent = '/ 10';
    scoreInput.max   = '10';
    scoreInput.step  = '0.01';
    scoreInput.placeholder = 'e.g. 7.5';
    if (scoreHint) scoreHint.textContent = 'CGPA must be ≥ 6.0 on a 10-point scale';
  } else {
    scoreSuffix.textContent = '%';
    scoreInput.max   = '100';
    scoreInput.step  = '0.01';
    scoreInput.placeholder = 'e.g. 72.5';
    if (scoreHint) scoreHint.textContent = 'Percentage must be ≥ 60%';
  }

  // Expose current mode globally so validator can read it
  window.AdmitGuard = window.AdmitGuard || {};
  window.AdmitGuard.scoreMode = mode;

  // Clear existing value on mode switch to avoid stale data
  scoreInput.value = '';

  // Re-validate if validator is loaded (Phase 3+)
  if (typeof validateField === 'function') {
    validateField('percentageOrCgpa', '', getFormState());
  }
}

modeRadios.forEach((radio) => {
  radio.addEventListener('change', () => applyScoreMode(radio.value));
});

// Initialize score mode
applyScoreMode('percentage');

// ── Form Reset ─────────────────────────────────────────
function resetForm() {
  const form = document.getElementById('candidate-form');
  if (form) form.reset();

  // Reset score mode to percentage
  const modePercentage = document.getElementById('mode-percentage');
  if (modePercentage) {
    modePercentage.checked = true;
    applyScoreMode('percentage');
  }

  // Clear all inline errors
  document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.field-input, .field-select, .field-textarea').forEach((el) => {
    el.classList.remove('input-error', 'input-success', 'input-warning');
  });

  // Hide all exception blocks
  document.querySelectorAll('.exception-block').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.rationale-block').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.exception-toggle').forEach((el) => (el.checked = false));
  document.querySelectorAll('.char-counter').forEach((el) => (el.textContent = '0 / 30 min'));

  // Hide banners
  ['banner-rejected', 'banner-strict-summary', 'banner-flagged'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Hide exception counter and summary
  const excCounter = document.getElementById('exception-counter');
  const excSummary = document.getElementById('exception-summary');
  if (excCounter) excCounter.classList.add('hidden');
  if (excSummary) excSummary.classList.add('hidden');

  // Disable submit button
  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) submitBtn.disabled = true;

  // Reset global app state
  window.AdmitGuard = window.AdmitGuard || {};
  window.AdmitGuard.scoreMode = 'percentage';
  window.AdmitGuard.exceptions = {};
  window.AdmitGuard.exceptionCount = 0;

  // Re-init validator state if loaded
  if (typeof initValidatorState === 'function') initValidatorState();
}

if (btnReset) btnReset.addEventListener('click', () => {
  if (confirm('Reset the form? All entered data will be lost.')) resetForm();
});

// ── Success Screen Navigation ──────────────────────────
function showSuccessScreen(candidateRecord) {
  const formCard     = document.getElementById('form-card');
  const successScreen= document.getElementById('success-screen');
  const summaryDiv   = document.getElementById('success-summary');

  if (!formCard || !successScreen) return;

  // Build summary rows
  const fields = [
    ['Name',              candidateRecord.fullName],
    ['Email',             candidateRecord.email],
    ['Phone',             '+91 ' + candidateRecord.phone],
    ['Date of Birth',     candidateRecord.dateOfBirth],
    ['Qualification',     candidateRecord.highestQualification],
    ['Graduation Year',   candidateRecord.graduationYear],
    ['Score',             candidateRecord.scoreMode === 'cgpa'
                            ? candidateRecord.percentageOrCgpa + ' CGPA'
                            : candidateRecord.percentageOrCgpa + '%'],
    ['Screening Score',   candidateRecord.screeningTestScore + ' / 100'],
    ['Interview Status',  candidateRecord.interviewStatus],
    ['Aadhaar',           '••••••••' + String(candidateRecord.aadhaarNumber).slice(-4)],
    ['Offer Letter',      candidateRecord.offerLetterSent],
    ['Exceptions Used',   candidateRecord.exceptionCount + ' / 4'],
    ['Flagged for Review',candidateRecord.flaggedForManager ? '🚩 Yes' : '✅ No'],
  ];

  summaryDiv.innerHTML = fields.map(([k, v]) =>
    `<div class="success-summary-row">
      <span class="summary-key">${k}</span>
      <span class="summary-val">${v ?? '—'}</span>
    </div>`
  ).join('');

  formCard.classList.add('hidden');
  successScreen.classList.remove('hidden');
}

function hideSuccessScreen() {
  const formCard      = document.getElementById('form-card');
  const successScreen = document.getElementById('success-screen');
  if (formCard)      formCard.classList.remove('hidden');
  if (successScreen) successScreen.classList.add('hidden');
}

if (btnNewCandidate) {
  btnNewCandidate.addEventListener('click', () => {
    hideSuccessScreen();
    resetForm();
  });
}

if (btnGoAudit) {
  btnGoAudit.addEventListener('click', () => {
    hideSuccessScreen();
    activateView('audit');
  });
}

if (btnRefreshDash) {
  btnRefreshDash.addEventListener('click', refreshDashboard);
}

// ── Modal ──────────────────────────────────────────────
function openModal(htmlContent, title) {
  const body  = document.getElementById('detail-modal-body');
  const titleEl = document.getElementById('detail-modal-title');
  if (body)  body.innerHTML = htmlContent;
  if (titleEl) titleEl.textContent = title || 'Candidate Details';
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

if (modalClose)    modalClose.addEventListener('click', closeModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
modalOverlay && modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Stub functions (filled in storage.js / later phases) ──
function refreshAuditLog()  { if (typeof renderAuditLog  === 'function') renderAuditLog();  }
function refreshDashboard() { if (typeof renderDashboard === 'function') renderDashboard(); }

// ── Helper: get current form state (used by validator) ─
function getFormState() {
  return {
    scoreMode: (window.AdmitGuard && window.AdmitGuard.scoreMode) || 'percentage',
    exceptions: (window.AdmitGuard && window.AdmitGuard.exceptions) || {},
  };
}

// ── Expose public API ──────────────────────────────────
window.AdmitGuard = window.AdmitGuard || {};
Object.assign(window.AdmitGuard, {
  activateView,
  resetForm,
  showSuccessScreen,
  hideSuccessScreen,
  openModal,
  closeModal,
  getFormState,
  scoreMode: 'percentage',
  exceptions: {},
  exceptionCount: 0,
});

// ── Boot ───────────────────────────────────────────────
activateView(DEFAULT_VIEW);
