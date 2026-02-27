'use strict';

/**
 * validator.js — AdmitGuard
 *
 * Prompt-03: case-insensitive email, spaces-only → empty
 * Prompt-04: integer-precise age via calculateAgeOnDate() per spec
 */

// ── Prompt-04 age calculation (exact spec implementation) ────────────────────
function calculateAgeOnDate(dobString, referenceDateString) {
  var dob = new Date(dobString);
  var ref = new Date(referenceDateString);
  var age = ref.getFullYear() - dob.getFullYear();
  var monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function validateField(fieldName, value, formState, config, existingSubs) {
  var cfg = config.fields[fieldName];
  if (!cfg) return { isValid:true, isStrictViolation:false, isSoftViolation:false, messages:[] };

  var v    = cfg.validations || {};
  var m    = cfg.messages    || {};
  var msgs = [];

  // Required — spaces-only treated as empty (Prompt-03)
  var trimmed = value ? String(value).trim() : '';
  if (v.required && !trimmed) {
    msgs.push(m.required || fieldName + ' is required.');
    return { isValid:false, isStrictViolation:cfg.ruleType==='strict', isSoftViolation:cfg.ruleType==='soft', messages:msgs };
  }
  if (!trimmed) return { isValid:true, isStrictViolation:false, isSoftViolation:false, messages:[] };

  var s = trimmed;

  // Email format
  if (v.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) msgs.push(m.format);

  // Email uniqueness — case-insensitive (Prompt-03 FIX-1)
  if (v.unique && existingSubs && !msgs.length) {
    var currentId   = formState._editingId || null;
    var sLower      = s.toLowerCase();
    var isDuplicate = existingSubs.some(function(sub) {
      return sub.email && sub.email.toLowerCase() === sLower && sub.id !== currentId;
    });
    if (isDuplicate) msgs.push(m.unique);
  }

  // Pattern
  if (v.pattern && !new RegExp(v.pattern).test(s)) msgs.push(m.pattern);

  // minLength
  if (v.minLength && s.length < v.minLength) msgs.push(m.minLength);

  // Enum
  if (v.enum && v.enum.indexOf(s) === -1) msgs.push(m.enum);

  // Blocked values
  if (v.blockedValues && v.blockedValues.indexOf(s) !== -1) msgs.push(m.blockedValues);

  // Cross-field
  if (v.crossField && !msgs.length) {
    var cf     = v.crossField;
    var depVal = formState[cf.dependsOn] || '';
    if (s === cf.triggerValue && cf.allowedWhen.indexOf(depVal) === -1) msgs.push(cf.message);
  }

  // ── Soft rules (Prompt-04) ────────────────────────────────────────────────
  if (cfg.ruleType === 'soft') {

    // Date of Birth — integer age via spec function (Prompt-04)
    if (fieldName === 'dateOfBirth') {
      var dob = new Date(s);
      if (!isNaN(dob)) {
        var age = calculateAgeOnDate(s, config.programStartDate);
        if (age < v.ageMin)      msgs.push(m.ageMin);
        else if (age > v.ageMax) msgs.push(m.ageMax);
      }
    }

    // Graduation Year
    if (fieldName === 'graduationYear') {
      var yr = parseInt(s, 10);
      if (!isNaN(yr)) {
        if (yr < v.min)      msgs.push(m.min);
        else if (yr > v.max) msgs.push(m.max);
      }
    }

    // Percentage / CGPA — reads mode from formState (Prompt-04)
    if (fieldName === 'percentageOrCgpa') {
      var num = parseFloat(s);
      if (!isNaN(num)) {
        if (formState.percentageMode === 'cgpa') {
          if (num < v.cgpaMin)       msgs.push(m.cgpaMin);
          else if (num > v.cgpaMax)  msgs.push(m.cgpaMax);
        } else {
          if (num < v.percentageMin) msgs.push(m.percentageMin);
        }
      }
    }

    // Screening Test Score
    if (fieldName === 'screeningTestScore') {
      var score = parseFloat(s);
      if (!isNaN(score)) {
        if (score < 0)               msgs.push(m.min);
        else if (score > 100)        msgs.push(m.max);
        else if (score < v.passMark) msgs.push(m.passMark);
      }
    }
  }

  var isStrict = cfg.ruleType === 'strict' && msgs.length > 0;
  var isSoft   = cfg.ruleType === 'soft'   && msgs.length > 0;
  return { isValid:msgs.length===0, isStrictViolation:isStrict, isSoftViolation:isSoft, messages:msgs };
}

function validateForm(formState, config, existingSubs) {
  var strictViolations=[], softViolations=[], fieldResults={};
  Object.keys(config.fields).forEach(function(fn) {
    var r = validateField(fn, formState[fn]||'', formState, config, existingSubs);
    fieldResults[fn] = r;
    if (r.isStrictViolation) strictViolations.push(Object.assign({field:fn,label:config.fields[fn].label},r));
    if (r.isSoftViolation)   softViolations.push(Object.assign({field:fn,label:config.fields[fn].label},r));
  });
  return { isFormValid:strictViolations.length===0, strictViolations:strictViolations, softViolations:softViolations, fieldResults:fieldResults };
}
