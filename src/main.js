// src/main.js
import { validateField, validateForm } from "./validation.js";

let config = null;
let submissions = [];

const formState = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  aadhaarNumber: "",
  highestQualification: "",
  graduationYear: "",
  scoreMode: "percentage",
  percentageOrCgpa: "",
  screeningTestScore: "",
  interviewStatus: "",
  offerLetterSent: "No"
};

const fieldErrors = {};

function renderFieldError(fieldName) {
  const errorEl = document.getElementById(`${fieldName}-error`);
  if (!errorEl) return;
  
  const errors = fieldErrors[fieldName];
  if (errors && errors.length > 0) {
    errorEl.textContent = errors[0];
    errorEl.style.display = "block";
  } else {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById("submitBtn");
  if (!submitBtn || !config) return;

  const { hasStrictErrors } = validateForm(formState, submissions, config);
  submitBtn.disabled = hasStrictErrors;
}

function validateAndUpdate(fieldName) {
  if (!config) return;
  
  const result = validateField(
    fieldName,
    formState[fieldName],
    formState,
    submissions,
    config
  );
  
  fieldErrors[fieldName] = result.errors;
  renderFieldError(fieldName);
  updateSubmitButtonState();
}

function attachFieldHandlers() {
  const form = document.getElementById("candidateForm");
  if (!form) return;

  // Handle text, email, tel, number, date inputs
  const textInputs = form.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"]'
  );
  
  textInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const name = e.target.name;
      if (name in formState) {
        formState[name] = e.target.value;
        validateAndUpdate(name);
      }
    });

    input.addEventListener("blur", (e) => {
      const name = e.target.name;
      if (name in formState) {
        validateAndUpdate(name);
      }
    });
  });

  // Handle select dropdowns
  const selects = form.querySelectorAll("select");
  selects.forEach((select) => {
    select.addEventListener("change", (e) => {
      const name = e.target.name;
      if (name in formState) {
        formState[name] = e.target.value;
        validateAndUpdate(name);
      }
    });
  });

  // Handle score mode radio buttons
  const scoreModeRadios = document.querySelectorAll('input[name="scoreMode"]');
  scoreModeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      formState.scoreMode = e.target.value;
      
      const scoreInput = document.getElementById("academicScore");
      const helperText = document.getElementById("academicScore-helper");
      
      if (e.target.value === "percentage") {
        scoreInput.placeholder = "Enter percentage";
        helperText.textContent = "Enter percentage (0-100)";
      } else {
        scoreInput.placeholder = "Enter CGPA";
        helperText.textContent = "Enter CGPA on a 10-point scale (0-10)";
      }
      
      // Re-validate if there's already a value
      if (formState.percentageOrCgpa) {
        validateAndUpdate("percentageOrCgpa");
      }
    });
  });

  // Handle offer letter toggle
  const offerToggles = document.querySelectorAll(".toggle-option");
  offerToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      const allToggles = document.querySelectorAll(".toggle-option");
      allToggles.forEach((t) => t.classList.remove("active"));
      e.currentTarget.classList.add("active");
      
      const value = e.currentTarget.dataset.value;
      formState.offerLetterSent = value;
      document.getElementById("offerLetterSent").value = value;
      validateAndUpdate("offerLetterSent");
    });
  });

function attachSubmitHandler() {
  const form = document.getElementById("candidateForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!config) return;

    const { fieldResults, hasStrictErrors, hasSoftErrors } = validateForm(
      formState,
      submissions,
      config
    );

    // Update all field errors
    Object.keys(fieldResults).forEach((fieldName) => {
      fieldErrors[fieldName] = fieldResults[fieldName].errors;
      renderFieldError(fieldName);
    });

    updateSubmitButtonState();

    if (hasStrictErrors) {
      alert("Please resolve all validation errors before submitting.");
      return;
    }

    if (hasSoftErrors) {
      console.log("Soft errors detected (exceptions will be handled in later phase)");
    }

    console.log("Form submitted:", formState);
    
    // Add to submissions for uniqueness checking
    submissions.push({ ...formState });
    
    alert("Form submitted successfully! Check console for details.");
    handleReset();
  });
}

function handleReset() {
  const form = document.getElementById("candidateForm");
  if (!form) return;

  if (confirm("Are you sure you want to clear all fields?")) {
    form.reset();
    
    Object.keys(formState).forEach((key) => {
      if (key === "scoreMode") {
        formState[key] = "percentage";
      } else if (key === "offerLetterSent") {
        formState[key] = "No";
      } else {
        formState[key] = "";
      }
      fieldErrors[key] = [];
      renderFieldError(key);
    });

    // Reset offer letter toggle UI
    const offerToggles = document.querySelectorAll(".toggle-option");
    offerToggles.forEach((t) => t.classList.remove("active"));
    document.getElementById("offerLetter-no").classList.add("active");

    updateSubmitButtonState();
  }
}

async function init() {
  try {
    const res = await fetch("../config/rules.json");
    if (!res.ok) throw new Error("Failed to load rules.json");
    config = await res.json();
    console.log("Config loaded successfully:", config);
  } catch (e) {
    console.error("Failed to load rules.json:", e);
    alert("Failed to load validation rules. Please refresh the page.");
    return;
  }

  attachFieldHandlers();
  attachSubmitHandler();
  
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", handleReset);
  }

  updateSubmitButtonState();
}

document.addEventListener("DOMContentLoaded", init);