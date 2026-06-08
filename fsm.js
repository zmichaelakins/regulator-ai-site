/**
 * FSM Module for SIC Governance Kernel
 * Finite State Machine for interaction boundary states
 */

function setFSM(s, uiHelpers) {
  if (uiHelpers && typeof uiHelpers.setFSMUI === 'function') {
    uiHelpers.setFSMUI(s);
  }
  // Core logic if needed
  return s;
}

function setWC(s, uiHelpers) {
  if (uiHelpers && typeof uiHelpers.setWCUI === 'function') {
    uiHelpers.setWCUI(s);
  }
  return s;
}

function resetFSM(uiHelpers) {
  if (uiHelpers && typeof uiHelpers.resetFSMUI === 'function') {
    uiHelpers.resetFSMUI();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
  setFSM,
  setWC,
  resetFSM
};
}

// Browser
if (typeof window !== 'undefined') {
  window.FSM = { setFSM, setWC, resetFSM };
}
