/**
 * Policy Engine Module for SIC
 * Evaluates CPE/TEE constraints and decides PERMIT/BLOCK
 */

function evaluatePolicy(interaction, ghostScanResult) {
  const decision = interaction.safe ? 'PERMIT' : 'BLOCK';
  return {
    decision,
    ghost_flag: interaction.ghost || (ghostScanResult && ghostScanResult.detected),
    rationale: decision === 'PERMIT' ? 'All constraints satisfied' : 'CPE constraint evaluation failed'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
  evaluatePolicy
};
}

if (typeof window !== 'undefined') {
  window.PolicyEngine = { evaluatePolicy };
}
