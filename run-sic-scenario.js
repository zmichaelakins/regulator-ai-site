/**
 * Run SIC Scenario - Core Orchestration
 * Command-line and browser compatible
 */

const AuditChain = (typeof require === 'function') ? require('./audit-chain') : window.AuditChain;
const FSM = (typeof require === 'function') ? require('./fsm') : window.FSM;
const GhostAssetScanner = (typeof require === 'function') ? require('./ghost-asset-scanner') : window.GhostAssetScanner;
const PolicyEngine = (typeof require === 'function') ? require('./policy-engine') : window.PolicyEngine;
const ForwardGuard = (typeof require === 'function') ? require('./forward-guard') : window.ForwardGuard;

const INTERACTIONS = [
  {id:'INT-001',name:'Route Optimization Agent',  src:'targetco.route-opt.v3',     dst:'acquireco.dispatch-hub',  safe:true,  ghost:false},
  {id:'INT-002',name:'Fleet Telemetry Agent',     src:'targetco.telemetry.v2',     dst:'acquireco.ops-monitor',   safe:true,  ghost:false},
  {id:'INT-003',name:'Legacy Dispatch Agent',     src:'targetco.dispatch-legacy.v1',dst:'acquireco.route-engine', safe:false, ghost:true}
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runInteraction(ix, intx, uiHelpers = {}) {
  const PACE = intx.ghost ? 1100 : 800;
  
  // UI updates
  if (uiHelpers.setQItem) uiHelpers.setQItem(ix, 'active', 'PROCESSING');
  if (uiHelpers.setCurLabel) uiHelpers.setCurLabel('Processing: ' + intx.name);
  if (uiHelpers.resetGates) uiHelpers.resetGates();
  if (uiHelpers.hideDecision) uiHelpers.hideDecision();
  if (uiHelpers.hideGhostBox) uiHelpers.hideGhostBox();
  if (uiHelpers.setProgress) uiHelpers.setProgress(0);

  // Gate 1 - IBI Intercept
  if (uiHelpers.setGate) uiHelpers.setGate(0, 'g-active');
  if (uiHelpers.setFSM) uiHelpers.setFSM('EVALUATING');
  if (uiHelpers.setProgress) uiHelpers.setProgress(10);
  await sleep(PACE);
  AuditChain.addLog('IBI_INTERCEPT', {
    interaction_id: intx.id, 
    agent: intx.name, 
    source: intx.src, 
    destination: intx.dst
  }, 'info', uiHelpers);
  if (uiHelpers.setGate) uiHelpers.setGate(0, 'g-ok');
  if (uiHelpers.setProgress) uiHelpers.setProgress(18);
  await sleep(PACE * 0.4);

  // Gate 2 - Traversal record
  if (uiHelpers.setGate) uiHelpers.setGate(1, 'g-active');
  if (uiHelpers.setWC) uiHelpers.setWC('PENDING');
  if (uiHelpers.setProgress) uiHelpers.setProgress(28);
  await sleep(PACE);
  AuditChain.addLog('TRAVERSAL_RECORD_COMMIT', {
    interaction_id: intx.id, 
    traversal_flag: false, 
    write_confirm: true
  }, 'info', uiHelpers);
  await sleep(PACE * 0.3);
  AuditChain.addLog('TRAVERSAL_FLAG_SET', {
    interaction_id: intx.id, 
    traversal_flag: true, 
    write_confirm: true
  }, 'info', uiHelpers);
  if (uiHelpers.setWC) uiHelpers.setWC('CONFIRMED');
  if (uiHelpers.setGate) uiHelpers.setGate(1, 'g-ok');
  if (uiHelpers.setProgress) uiHelpers.setProgress(40);
  await sleep(PACE * 0.4);

  // Gate 3 - Ghost scan
  if (uiHelpers.setGate) uiHelpers.setGate(2, 'g-active');
  if (uiHelpers.setProgress) uiHelpers.setProgress(50);
  await sleep(PACE * 1.1);
  const ghostScan = GhostAssetScanner.scanForGhostAsset(intx);
  if (intx.ghost) {
    if (uiHelpers.setGate) uiHelpers.setGate(2, 'g-warn');
    if (uiHelpers.showGhostBox) uiHelpers.showGhostBox();
    if (uiHelpers.setQItem) uiHelpers.setQItem(ix, 'ghost', 'GHOST DETECTED');
    AuditChain.addLog('MDM_GHOST_ASSET_FLAG', {
      interaction_id: intx.id, 
      ghost_flag: true, 
      coupling: ghostScan.coupling
    }, 'ghost', uiHelpers);
    if (uiHelpers.setProgress) uiHelpers.setProgress(56);
    await sleep(PACE * 1.8);
  } else {
    AuditChain.addLog('MDM_SCAN_CLEAR', {
      interaction_id: intx.id, 
      ghost_flag: false
    }, 'info', uiHelpers);
    if (uiHelpers.setGate) uiHelpers.setGate(2, 'g-ok');
    if (uiHelpers.setProgress) uiHelpers.setProgress(56);
    await sleep(PACE * 0.4);
  }

  // Gate 4 - CPE Evaluation
  if (uiHelpers.setGate) uiHelpers.setGate(3, 'g-active');
  if (uiHelpers.setProgress) uiHelpers.setProgress(64);
  await sleep(PACE * 1.1);
  const policyResult = PolicyEngine.evaluatePolicy(intx, ghostScan);
  AuditChain.addLog('CPE_TEE_EVALUATION', {
    interaction_id: intx.id, 
    decision: policyResult.decision, 
    ghost_flag: policyResult.ghost_flag
  }, policyResult.decision === 'PERMIT' ? 'permit' : 'block', uiHelpers);
  if (uiHelpers.setGate) uiHelpers.setGate(3, policyResult.decision === 'PERMIT' ? 'g-ok' : 'g-block');
  if (uiHelpers.setProgress) uiHelpers.setProgress(74);
  await sleep(PACE * 0.4);

  // Gate 5 - Token committed
  if (uiHelpers.setGate) uiHelpers.setGate(4, 'g-active');
  if (uiHelpers.setWC) uiHelpers.setWC('PENDING');
  if (uiHelpers.setProgress) uiHelpers.setProgress(82);
  await sleep(PACE);
  const sig = AuditChain.hashStr(intx.id + policyResult.decision + Date.now());
  AuditChain.addLog('TOKEN_COMMITTED', {
    interaction_id: intx.id, 
    token_type: policyResult.decision + '_TOKEN', 
    tee_sig: sig.slice(0,16), 
    write_confirm: true
  }, policyResult.decision === 'PERMIT' ? 'permit' : 'block', uiHelpers);
  if (uiHelpers.setWC) uiHelpers.setWC('CONFIRMED');
  if (uiHelpers.setGate) uiHelpers.setGate(4, policyResult.decision === 'PERMIT' ? 'g-ok' : 'g-block');
  if (uiHelpers.setProgress) uiHelpers.setProgress(90);
  await sleep(PACE * 0.4);

  // Gate 6 - Forward Guard
  if (uiHelpers.setGate) uiHelpers.setGate(5, 'g-active');
  if (uiHelpers.setProgress) uiHelpers.setProgress(96);
  await sleep(PACE);
  const guardResult = ForwardGuard.verifyForwardGuard(policyResult.decision, intx, AuditChain);
  if (policyResult.decision === 'PERMIT') {
    if (uiHelpers.setGate) uiHelpers.setGate(5, 'g-ok');
    if (uiHelpers.setFSM) uiHelpers.setFSM('COMPLIANT');
    if (uiHelpers.showDecision) uiHelpers.showDecision('permit', 'PERMIT — ' + intx.name + ' cleared for boundary crossing.',
      ' Traversal record committed, TEE-attested PERMIT token committed, Forward Guard verified. Integration Boundary Invariant satisfied.');
    if (uiHelpers.setQItem) uiHelpers.setQItem(ix, 'permit', 'PERMITTED');
  } else {
    if (uiHelpers.setGate) uiHelpers.setGate(5, 'g-block');
    if (uiHelpers.setFSM) uiHelpers.setFSM('RESTRICTED');
    if (uiHelpers.showDecision) uiHelpers.showDecision(intx.ghost ? 'ghost' : 'block',
      intx.ghost ? 'BLOCK — Ghost Asset contained. Legacy Dispatch Agent halted at boundary.' : 'BLOCK — CPE constraint evaluation failed.',
      intx.ghost ? ' Undocumented coupling to routing-db-v1.legacy flagged by MDM. BLOCK token committed before any forwarding action. Forward Guard enforced. Successor liability contained.' : ' BLOCK token committed to Authoritative Audit Substrate before denial signal. FSM transitioned to RESTRICTED.');
    if (uiHelpers.setQItem) uiHelpers.setQItem(ix, 'block', 'BLOCKED');
  }
  if (uiHelpers.setProgress) uiHelpers.setProgress(100);
  AuditChain.addLog('FSM_STATE_COMMITTED', {
    interaction_id: intx.id, 
    new_state: policyResult.decision === 'PERMIT' ? 'COMPLIANT' : 'RESTRICTED', 
    fsm_transition: policyResult.decision === 'PERMIT' ? 'EVALUATING -> COMPLIANT' : 'EVALUATING -> RESTRICTED'
  }, policyResult.decision === 'PERMIT' ? 'permit' : 'block', uiHelpers);

  if (uiHelpers.setCurLabel) uiHelpers.setCurLabel(null);
  await sleep(PACE * 1.4);
  if (uiHelpers.setFSM) uiHelpers.setFSM('IDLE');
  if (uiHelpers.setWC) uiHelpers.setWC('--');
  if (uiHelpers.setProgress) uiHelpers.setProgress(0);
  if (uiHelpers.resetGates) uiHelpers.resetGates();
  if (uiHelpers.hideDecision) uiHelpers.hideDecision();
  if (uiHelpers.hideGhostBox) uiHelpers.hideGhostBox();
}

async function runIntegration(uiHelpers = {}) {
  const running = true; // Simplified for CLI, handle in UI if needed
  AuditChain.resetAuditChain();
  if (uiHelpers.resetUI) uiHelpers.resetUI();

  AuditChain.addLog('SESSION_START', {
    acquirer: 'AcquireCo Logistics', 
    target: 'TargetCo Fleet Systems', 
    boundary: 'POST_CLOSE_DAY_ONE', 
    interactions: 3
  }, 'info', uiHelpers);

  for (let i = 0; i < INTERACTIONS.length; i++) {
    await runInteraction(i, INTERACTIONS[i], uiHelpers);
    await sleep(350);
  }

  AuditChain.addLog('SESSION_COMPLETE', {
    total: 3, 
    permitted: 2, 
    blocked: 1, 
    ghost_assets_contained: 1
  }, 'info', uiHelpers);

  if (uiHelpers.setCurLabel) {
    uiHelpers.setCurLabel('Integration complete: 2 PERMITTED  |  1 BLOCKED (Ghost Asset contained)');
    setTimeout(() => { if (uiHelpers.setCurLabel) uiHelpers.setCurLabel(null); }, 5000);
  }

  const bundleData = {
    bundle_version: 'SIC-Gen2-Demo-v2.0',
    exported_at: new Date().toISOString(),
    scenario: {acquirer: 'AcquireCo Logistics', target: 'TargetCo Fleet Systems', boundary: 'POST_CLOSE_DAY_ONE'},
    summary: {total: 3, permitted: 2, blocked: 1, ghost_assets_contained: 1},
    chain_root: 'GENESIS',
    chain_head: AuditChain.getLastHash(),
    chain_length: AuditChain.getAuditChain().length,
    audit_chain: AuditChain.getAuditChain()
  };

  return bundleData;
}

// For CLI
if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
  console.log('Running SIC Integration Boundary Demo (CLI mode)...');
  runIntegration().then(bundle => {
    console.log('Integration complete.');
    console.log('Audit bundle generated. Summary:', bundle.summary);
    require('fs').writeFileSync('sic-audit-bundle.json', JSON.stringify(bundle, null, 2));
    console.log('Bundle exported to sic-audit-bundle.json');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runIntegration, runInteraction, INTERACTIONS };
}

// Browser global
if (typeof window !== 'undefined') {
  window.RunSICScenario = { runIntegration, runInteraction, INTERACTIONS };
}
