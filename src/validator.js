'use strict';

/**
 * validator.js — AdmitGuard
 *
 * Prompt-06: ZERO business-rule values hardcoded here.
 * All thresholds, enums, regex, bounds, program dates MUST come from config/rules.json.
 *
 * Notes:
 * - If config does not provide a needed rule (e.g., email pattern), we do NOT fallback to a hardcoded rule.
 * - That keeps JS rule-free and forces rules.json to be the single source of truth.
 */

// Prompt-04: integer-precise age via calculateAgeOnDate
function calculateAgeOnDate(dobString, referenceDateString) {
  var dob = new Date(dobString);
  var ref = new Date(referenceDateString);
  if (isNaN(dob) || isNaN(ref)) return NaN;

  var age = ref.getFullYear() - dob.getFullYear();
  var monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

function asTrimmedString(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  var n = parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
}

function hasNumber(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function safeRegExp(pattern) {
  // Pattern must come from config (Prompt-06). If invalid, treat as "no regex available".
  if (pattern === undefined || pattern === null || pattern === '') return null;
  try {
    return new RegExp(pattern);
  } catch (e) {
    return null;
  }
}

/**
 * validateField(fieldName, value, formState, config, existingSubs)
 * returns:
 * { isValid, isStrictViolation, isSoftViolation, messages[] }
 */
function validateField(fieldName, value, formState, config, existingSubs) {
  var cfg = config && config.fields ? config.fields[fieldName] : null;
  if (!cfg) {
    return { isValid: true, isStrictViolation: false, isSoftViolation: false, messages: [] };
  }

  var v = cfg.validations || {};
  var m = cfg.messages || {};
  var msgs = [];

  var trimmed = asTrimmedString(value);

  // Required (config key: fields.<field>.validations.required)
  if (v.required && isBlank(trimmed)) {
    msgs.push(m.required || (cfg.label || fieldName) + ' is required.');
    return {
      isValid: false,
      isStrictViolation: cfg.ruleType === 'strict',
      isSoftViolation: cfg.ruleType === 'soft',
      messages: msgs
    };
  }

  // Empty but not required => valid
  if (isBlank(trimmed)) {
    return { isValid: true, isStrictViolation: false, isSoftViolation: false, messages: [] };
  }

  // ── Generic validations driven by config ───────────────────────────────────

  // Min length (config key: fields.<field>.validations.minLength)
  if (hasNumber(v.minLength) && trimmed.length < v.minLength) {
    msgs.push(m.minLength || 'Too short.');
  }

  // Regex pattern (config key: fields.<field>.validations.pattern)
  // Prompt-06: do not hardcode regexes anywhere.
  if (v.pattern) {
    var rx = safeRegExp(v.pattern);
    if (!rx) {
      msgs.push(m.pattern || 'Invalid validation pattern in config.');
    } else if (!rx.test(trimmed)) {
      msgs.push(m.pattern || 'Invalid format.');
    }
  }

  // Email format legacy flag (config key currently might be fields.email.validations.format)
  // Prompt-06: if you want email validation, provide validations.pattern in rules.json.
  if (v.format === 'email' && !v.pattern) {
    // No hardcoded fallback allowed.
    msgs.push(m.format || 'Email validation requires fields.email.validations.pattern in rules.json.');
  }

  // Enum list (config key: fields.<field>.validations.enum)
  if (Array.isArray(v.enum) && v.enum.length) {
    if (v.enum.indexOf(trimmed) === -1) msgs.push(m.enum || 'Invalid value.');
  }

  // Blocked values (config key: fields.<field>.validations.blockedValues OR blockIfValue)
  if (v.blockIfValue !== undefined && v.blockIfValue !== null) {
    if (trimmed === String(v.blockIfValue)) msgs.push(m.blockIfValue || m.blockedValues || 'This value is not allowed.');
  } else if (Array.isArray(v.blockedValues) && v.blockedValues.length) {
    if (v.blockedValues.indexOf(trimmed) !== -1) msgs.push(m.blockedValues || 'This value is not allowed.');
  }

  // Cross-field validation (config key: fields.<field>.validations.crossField)
  if (v.crossField && msgs.length === 0) {
    var cf = v.crossField;
    var depVal = formState ? formState[cf.dependsOn] : undefined;

    // If triggerValue matches, then depVal must be within allowedWhen[]
    if (trimmed === String(cf.triggerValue)) {
      var allowed = Array.isArray(cf.allowedWhen) ? cf.allowedWhen : [];
      if (allowed.indexOf(depVal) === -1) {
        msgs.push(cf.message || m.crossField || 'Cross-field validation failed.');
      }
    }
  }

  // Uniqueness (config key: fields.email.validations.unique) — kept generic here
  if (v.unique && existingSubs && msgs.length === 0) {
    var currentId = formState ? formState.editingId : null;
    var sLower = trimmed.toLowerCase();
    var isDuplicate = existingSubs.some(function (sub) {
      if (!sub) return false;
      // uniqueness is evaluated on same fieldName when possible; fallback to email for backward compatibility
      var subVal = (sub[fieldName] !== undefined && sub[fieldName] !== null) ? String(sub[fieldName]) : (sub.email || '');
      return subVal && String(subVal).toLowerCase() === sLower && sub.id !== currentId;
    });
    if (isDuplicate) msgs.push(m.unique || 'Value already exists.');
  }

  // ── Soft-rule validations (all thresholds from config) ──────────────────────
  if (cfg.ruleType === 'soft' && msgs.length === 0) {
    // Date of Birth age range:
    // config keys:
    // - programStartDate
    // - fields.dateOfBirth.validations.ageMin / ageMax
    if (fieldName === 'dateOfBirth') {
      var age = calculateAgeOnDate(trimmed, config.programStartDate);
      if (!isNaN(age)) {
        if (hasNumber(v.ageMin) && age < v.ageMin) msgs.push(m.ageMin || 'Below minimum age.');
        else if (hasNumber(v.ageMax) && age > v.ageMax) msgs.push(m.ageMax || 'Above maximum age.');
      }
    }

    // Graduation year range:
    // config keys: fields.graduationYear.validations.min / max
    if (fieldName === 'graduationYear') {
      var yr = parseInt(trimmed, 10);
      if (!isNaN(yr)) {
        if (hasNumber(v.min) && yr < v.min) msgs.push(m.min || 'Year too early.');
        else if (hasNumber(v.max) && yr > v.max) msgs.push(m.max || 'Year too late.');
      }
    }

    // Percentage / CGPA:
    // config keys: fields.percentageOrCgpa.validations.percentageMin / cgpaMin / cgpaMax
    if (fieldName === 'percentageOrCgpa') {
      var num = toNumber(trimmed);
      if (!isNaN(num)) {
        var mode = formState && formState.percentageMode ? formState.percentageMode : 'percentage';
        if (mode === 'cgpa') {
          if (hasNumber(v.cgpaMin) && num < v.cgpaMin) msgs.push(m.cgpaMin || 'CGPA too low.');
          else if (hasNumber(v.cgpaMax) && num > v.cgpaMax) msgs.push(m.cgpaMax || 'CGPA too high.');
        } else {
          if (hasNumber(v.percentageMin) && num < v.percentageMin) msgs.push(m.percentageMin || 'Percentage too low.');
        }
      }
    }

    // Screening test score bounds + pass mark:
    // config keys: fields.screeningTestScore.validations.min / max / passMark
    if (fieldName === 'screeningTestScore') {
      var score = toNumber(trimmed);
      if (!isNaN(score)) {
        if (hasNumber(v.min) && score < v.min) msgs.push(m.min || 'Below minimum.');
        else if (hasNumber(v.max) && score > v.max) msgs.push(m.max || 'Above maximum.');
        else if (hasNumber(v.passMark) && score < v.passMark) msgs.push(m.passMark || 'Below pass mark.');
      }
    }
  }

  var isStrict = (cfg.ruleType === 'strict') && (msgs.length > 0);
  var isSoft = (cfg.ruleType === 'soft') && (msgs.length > 0);

  return {
    isValid: msgs.length === 0,
    isStrictViolation: isStrict,
    isSoftViolation: isSoft,
    messages: msgs
  };
}

function validateForm(formState, config, existingSubs) {
  var strictViolations = [];
  var softViolations = [];
  var fieldResults = {};

  Object.keys((config && config.fields) ? config.fields : {}).forEach(function (fn) {
    var r = validateField(fn, formState ? formState[fn] : '', formState, config, existingSubs);
    fieldResults[fn] = r;

    if (r.isStrictViolation) {
      strictViolations.push(Object.assign({ field: fn, label: config.fields[fn].label }, r));
    }
    if (r.isSoftViolation) {
      softViolations.push(Object.assign({ field: fn, label: config.fields[fn].label }, r));
    }
  });

  return {
    isFormValid: strictViolations.length === 0,
    strictViolations: strictViolations,
    softViolations: softViolations,
    fieldResults: fieldResults
  };
}

// Make available to app.js in non-module setup
window.validateField = validateField;
window.validateForm = validateForm;