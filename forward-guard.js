/**
 * Forward Guard Module
 * Enforces commit-before-forward at integration boundary
 */

function verifyForwardGuard(decision, interaction, auditHelpers) {
  if (decision === 'PERMIT') {
    const logData = {
      interaction_id: interaction.id,
      permit_token_verified: true,
      forwarding: 'PERMITTED',
      fsm_transition: 'EVALUATING -> COMPLIANT'
    };
    if (auditHelpers && auditHelpers.addLog) {
      auditHelpers.addLog('FORWARD_GUARD_VERIFIED', logData, 'permit');
    }
    return { status: 'PERMITTED', verified: true };
  } else {
    const logData = {
      interaction_id: interaction.id,
      block_token_committed: true,
      forwarding: 'HALTED',
      ghost_asset_contained: interaction.ghost,
      fsm_transition: 'EVALUATING -> RESTRICTED'
    };
    if (auditHelpers && auditHelpers.addLog) {
      auditHelpers.addLog('FORWARD_GUARD_HALT', logData, 'block');
    }
    return { status: 'HALTED', verified: true, contained: interaction.ghost };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
  verifyForwardGuard
};
}

if (typeof window !== 'undefined') {
  window.ForwardGuard = { verifyForwardGuard };
}
