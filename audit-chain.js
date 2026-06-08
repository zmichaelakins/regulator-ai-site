/**
 * Audit Chain Module for SIC Governance Kernel
 * Handles hash-chained logging to Authoritative Audit Substrate
 */

let auditChain = [];
let lastHash = 'GENESIS';
let seqN = 0;

function hashStr(s) {
  var h1=0x6a09e667,h2=0xbb67ae85,h3=0x3c6ef372,h4=0xa54ff53a;
  for(var i=0;i<s.length;i++){
    var c=s.charCodeAt(i);
    h1=Math.imul(h1^c,0x9e3779b9)>>>0;
    h2=Math.imul(h2^c,0x85ebca6b)>>>0;
    h3=Math.imul(h3^(h1>>>16),0xc2b2ae35)>>>0;
    h4=Math.imul(h4^(h2>>>16),0x27d4eb2f)>>>0;
  }
  h1^=h2>>>13;h2^=h3>>>7;h3^=h4>>>17;h4^=h1>>>5;
  h1=Math.imul(h1^(h1>>>16),0x45d9f3b)>>>0;
  h2=Math.imul(h2^(h2>>>16),0x45d9f3b)>>>0;
  h3=Math.imul(h3^(h3>>>16),0x45d9f3b)>>>0;
  h4=Math.imul(h4^(h4>>>16),0x45d9f3b)>>>0;
  return [h1,h2,h3,h4].map(function(n){return n.toString(16).padStart(8,'0')}).join('');
}

function addLog(type, data, style, uiHelpers) {
  var entry = {
    seq: ++seqN,
    event_type: type,
    timestamp: new Date().toISOString(),
    previous_hash: lastHash
  };
  for (var k in data) entry[k] = data[k];
  var hash = hashStr(JSON.stringify(entry));
  entry.entry_hash = hash;
  lastHash = hash;
  auditChain.push(entry);

  // UI update if helpers provided
  if (uiHelpers && typeof uiHelpers.addLogUI === 'function') {
    uiHelpers.addLogUI(entry, type, data, style);
  }

  return entry;
}

function getAuditChain() {
  return auditChain;
}

function getLastHash() {
  return lastHash;
}

function resetAuditChain() {
  auditChain = [];
  lastHash = 'GENESIS';
  seqN = 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
  addLog,
  hashStr,
  getAuditChain,
  getLastHash,
  resetAuditChain
};
}

// For browser
if (typeof window !== 'undefined') {
  window.AuditChain = { addLog, hashStr, getAuditChain, getLastHash, resetAuditChain };
}
