/**
 * ============================================================================
 * WORKSPACE ENTERPRISE ARCHITECTURE - CORE CONTROLLER
 * Project: Flash Assistant (O18) UNIFIED UPGRADE
 * Feature: Total Payload Decoupling, Jixy Lens, Strict Schema Preservation
 * Patch: Explicit Parked State Chaining (AHT Net Calculation)
 * ============================================================================
 */

function getSpreadsheetId() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active.getId();
  } catch(e) {}
  return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'YOUR_SPREADSHEET_ID_HERE';
}

// ============================================================================
// ECOSYSTEM IDS & CONFIGURATION
// ============================================================================
const SPREADSHEET_ID = getSpreadsheetId();
const CENTRAL_IMAGE_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('CENTRAL_IMAGE_FOLDER_ID') || 'YOUR_IMAGE_FOLDER_ID_HERE';
const JIXY_FEEDBACK_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('JIXY_FEEDBACK_FOLDER_ID') || 'YOUR_FEEDBACK_FOLDER_ID_HERE';
const CHAT_SPACE_URL = PropertiesService.getScriptProperties().getProperty('CHAT_SPACE_URL') || 'https://chat.google.com/';

// --- GLOBAL CONFIGURATION ---
const BASE_LOG_NAME = 'Log DB - ALL';
const SETTINGS_SHEET_NAME = 'Settings';
const JIXY_KB_SHEET_NAME = 'Jixy_KB';
const GRAY_AREA_SHEET_NAME = 'Gray_Areas';
const JIXY_FEEDBACK_SHEET_NAME = 'Jixy_Feedback_Log';
const README_SHEET_NAME = '⚠️ READ ME';

const CACHE_KEY_QA = 'QA_ACCESS_LIST_O18';
const CACHE_KEY_POLICIES = 'ACTIVE_POLICIES_LIST_O18';
const CACHE_KEY_JIXY = 'JIXY_KNOWLEDGE_DATA_O18';
const CACHE_KEY_GRAY = 'GRAY_AREA_DATA_O18';
const CACHE_KEY_DATA = 'DATA_SYNC_ALL_O18';

const CACHE_TTL_SEC = 21600; // 6 Hours
const TTL_AFTER_QA_MS = 30 * 24 * 60 * 60 * 1000; // 30 DAYS

const DEFAULT_POLICIES = [
  { category: "Standard", isVisible: true, media: [ { type: "All", policies: ["No Violation"] } ] },
  { category: "Safety", isVisible: true, media: [ { type: "Video", policies: ["Violence", "CSAM", "Dangerous Content"] }, { type: "Text", policies: ["Harassment", "Hate Speech"] } ] },
  { category: "Content", isVisible: true, media: [ { type: "Image", policies: ["Sexually Explicit", "Medical Info"] } ] }
];

function flushSystemCache() {
  const cache = CacheService.getScriptCache();
  cache.remove(CACHE_KEY_QA);
  cache.remove(CACHE_KEY_POLICIES);
  cache.remove('CD_DURATION_O18');
  cache.remove('CD_VISIBILITY_O18');
  cache.remove(CACHE_KEY_JIXY);
  cache.remove(CACHE_KEY_GRAY);
  cache.remove(CACHE_KEY_DATA);
}

function doGet(e) {
  try {
    SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    return HtmlService.createHtmlOutput('Access Denied. Please verify Editor permissions on the target Spreadsheet.').setTitle('Access Denied');
  }
  const iconUrl = "https://img.icons8.com/fluency/48/traffic-light.png";
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Flash Assistant (O18)')
    .setFaviconUrl(iconUrl)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function _extractSubworkflow(policyStr) {
  if (!policyStr) return "";
  const parts = String(policyStr).split(',');
  const subs = parts.map(p => {
    const m = p.match(/^\[(.*?)\s*\|/);
    return m ? m[1].trim() : "";
  }).filter(Boolean);
  return [...new Set(subs)].join(', ');
}

function _extractCleanPolicy(policyStr) {
  if (!policyStr) return "";
  const parts = String(policyStr).split(',');
  const pols = parts.map(p => p.replace(/^\[.*?\]\s*/, '').trim()).filter(Boolean);
  return [...new Set(pols)].join(', ');
}

function getPolicies() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY_POLICIES);
  if (cached) return JSON.parse(cached);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return DEFAULT_POLICIES;
    const vals = sheet.getRange("F2:I").getValues();
    const grouped = {};
    const visibilityMap = {};
    let hasData = false;

    vals.forEach(row => {
      let cat = String(row[0]).trim() || "General";
      let med = String(row[1]).trim() || "All";
      let pol = String(row[2]).trim();
      let isVis = row[3] === "" ? true : (row[3] === true || String(row[3]).toLowerCase() === "true");
      if (visibilityMap[cat] === undefined) { visibilityMap[cat] = isVis; }
      if (!pol && String(row[1]).trim() !== "" && !String(row[2]).trim()) { pol = String(row[1]).trim(); med = "All"; }
      else if (!pol && cat !== "General" && !String(row[1]).trim()) { pol = cat; cat = "General"; med = "All"; }
      if (pol) {
        hasData = true;
        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][med]) grouped[cat][med] = [];
        if (!grouped[cat][med].includes(pol)) grouped[cat][med].push(pol);
      }
    });

    const policiesToCache = hasData ? Object.keys(grouped).map(cat => ({ category: cat, isVisible: visibilityMap[cat], media: Object.keys(grouped[cat]).map(med => ({ type: med, policies: grouped[cat][med] })) })) : DEFAULT_POLICIES;
    cache.put(CACHE_KEY_POLICIES, JSON.stringify(policiesToCache), CACHE_TTL_SEC);
    return policiesToCache;
  } catch (e) { return DEFAULT_POLICIES; }
}

function getJixyKnowledge() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY_JIXY);
  if (cached) return JSON.parse(cached);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(JIXY_KB_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
    const knowledge = data.map(row => { return { title: row[0], url: row[1], keywords: row[2] ? String(row[2]).split(',').map(k => k.trim().toLowerCase()) : [] }; });
    cache.put(CACHE_KEY_JIXY, JSON.stringify(knowledge), 3600);
    return knowledge;
  } catch (e) { return []; }
}

function saveJixyKnowledge(knowledgeArray) {
  if (!getUserContext().isQa) throw new Error("Unauthorized");
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(JIXY_KB_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(JIXY_KB_SHEET_NAME);
    else sheet.clear();
    sheet.getRange(1, 1, 1, 3).setValues([["Title", "URL", "Keywords (comma separated)"]]).setFontWeight("bold");
    if (knowledgeArray && knowledgeArray.length > 0) {
      const rows = knowledgeArray.map(item => [item.title, item.url, item.keywords.join(', ')]);
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
    CacheService.getScriptCache().remove(CACHE_KEY_JIXY);
    return { success: true };
  } finally { lock.releaseLock(); }
}

function getUserContext() {
  const email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  const cdConfig = getCountdownConfig();
  return { 
    email: email, 
    ldap: email ? email.split('@')[0].toLowerCase() : 'Unknown', 
    isQa: checkIsQa(email), 
    countdownDuration: cdConfig.duration, 
    countdownVisibility: cdConfig.visibility, 
    policies: getPolicies(), 
    jixyKB: getJixyKnowledge(),
    chatSpaceUrl: CHAT_SPACE_URL
  };
}

function getCountdownConfig() {
  const cache = CacheService.getScriptCache();
  let duration = cache.get('CD_DURATION_O18');
  let visibility = cache.get('CD_VISIBILITY_O18');
  if (duration && visibility) return { duration: parseInt(duration, 10), visibility: visibility === 'true' };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    let d = sheet.getRange(2, 3).getValue();
    let v = sheet.getRange(2, 4).getValue();
    if (d === "" || isNaN(parseInt(d, 10))) { d = 3; sheet.getRange(2, 3).setValue(3); }
    if (v === "") { v = true; sheet.getRange(2, 4).insertCheckboxes().check(); }
    cache.put('CD_DURATION_O18', d.toString(), CACHE_TTL_SEC);
    cache.put('CD_VISIBILITY_O18', v.toString(), CACHE_TTL_SEC);
    return { duration: parseInt(d, 10), visibility: v === true || v === 'true' };
  } catch (e) { return { duration: 3, visibility: true }; }
}

function checkIsQa(email) {
  if (!email) return false;
  const normalizedEmail = String(email).toLowerCase().trim();
  const ldapMatch = normalizedEmail.split('@')[0];
  const cache = CacheService.getScriptCache();
  const cachedList = cache.get(CACHE_KEY_QA);
  let qaIdentifiers;
  if (cachedList) { qaIdentifiers = JSON.parse(cachedList); }
  else {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
      if (!sheet || sheet.getLastRow() < 2) qaIdentifiers = [];
      else { qaIdentifiers = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().map(e => String(e).toLowerCase().trim()).filter(Boolean); }
      cache.put(CACHE_KEY_QA, JSON.stringify(qaIdentifiers), CACHE_TTL_SEC);
    } catch(e) { return false; }
  }
  return qaIdentifiers.includes(normalizedEmail) || qaIdentifiers.includes(ldapMatch);
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // 1. SETTINGS SHEET
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    settingsSheet.getRange(1, 1).setValue("QA Emails").setFontWeight("bold");
    settingsSheet.getRange(1, 3).setValue("Countdown Duration (Min)").setFontWeight("bold");
    settingsSheet.getRange(1, 4).setValue("Countdown Visibility").setFontWeight("bold");
    settingsSheet.getRange(1, 6).setValue("Subworkflow Category").setFontWeight("bold");
    settingsSheet.getRange(1, 7).setValue("Media Type").setFontWeight("bold");
    settingsSheet.getRange(1, 8).setValue("Active Policy").setFontWeight("bold");
    settingsSheet.getRange(1, 9).setValue("Is Visible").setFontWeight("bold");
    settingsSheet.getRange(2, 1).setValue(Session.getActiveUser().getEmail());
    settingsSheet.getRange(2, 3).setValue(3);
    settingsSheet.getRange(2, 4).insertCheckboxes().check();
    settingsSheet.setColumnWidth(1, 250); settingsSheet.setColumnWidth(3, 200); settingsSheet.setColumnWidth(4, 200); settingsSheet.setColumnWidth(6, 150); settingsSheet.setColumnWidth(7, 100); settingsSheet.setColumnWidth(8, 250); settingsSheet.setColumnWidth(9, 100);
  }

  // 2. JIXY KB
  let jixySheet = ss.getSheetByName(JIXY_KB_SHEET_NAME);
  if (!jixySheet) {
    jixySheet = ss.insertSheet(JIXY_KB_SHEET_NAME);
    jixySheet.getRange(1, 1, 1, 3).setValues([["Title", "URL", "Keywords (comma separated)"]]).setFontWeight("bold");
  }

  // 3. GRAY AREAS
  let grayAreaSheet = ss.getSheetByName(GRAY_AREA_SHEET_NAME);
  if (!grayAreaSheet) {
    grayAreaSheet = ss.insertSheet(GRAY_AREA_SHEET_NAME, 1);
    grayAreaSheet.getRange(1, 1, 1, 6).setValues([['Date Added', 'Origin', 'Job ID', 'Policy', 'QA Rationale', 'QA LDAP']]).setFontWeight('bold');
    grayAreaSheet.setFrozenRows(1);
  }
  ss.getSheetByName(GRAY_AREA_SHEET_NAME).getRange("C:C").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // 4. JIXY FEEDBACK LOG
  let feedbackSheet = ss.getSheetByName(JIXY_FEEDBACK_SHEET_NAME);
  if (!feedbackSheet) {
    feedbackSheet = ss.insertSheet(JIXY_FEEDBACK_SHEET_NAME);
    feedbackSheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'LDAP Reporter', 'Issue / Bug Report', 'Suggested Solution', 'Visual Preview', 'Drive Link']]).setFontWeight('bold').setBackground('#ffebee').setFontColor('#c62828');
    feedbackSheet.setFrozenRows(1);
    feedbackSheet.setColumnWidth(1, 150); feedbackSheet.setColumnWidth(2, 150); feedbackSheet.setColumnWidth(3, 350); feedbackSheet.setColumnWidth(4, 350); feedbackSheet.setColumnWidth(5, 200); feedbackSheet.setColumnWidth(6, 250);
  }

  // 5. LOG DB ALL
  let logSheet = ss.getSheetByName(BASE_LOG_NAME);
  const headers18 = ['Timestamp', 'LDAP_System', 'Workflow', 'Job ID', 'Agent Policy', 'Agent Comment', 'QA Correct Policy', 'QA Comment', 'Status', 'Raters Blob', 'Gray Area', 'QA Resolution Time', 'Agent Subworkflow', 'QA Subworkflow', 'Agent Clean Policy', 'QA Clean Policy', 'Agent Query', 'Model Response'];
  if (!logSheet) {
    logSheet = ss.insertSheet(BASE_LOG_NAME);
    logSheet.getRange(1, 1, 1, 18).setValues([headers18]).setFontWeight('bold');
    logSheet.setFrozenRows(1);
  } else {
    if (String(logSheet.getRange(1, 17).getValue()).trim() === "") logSheet.getRange(1, 17).setValue('Agent Query').setFontWeight('bold');
    if (String(logSheet.getRange(1, 18).getValue()).trim() === "") logSheet.getRange(1, 18).setValue('Model Response').setFontWeight('bold');
  }
  logSheet.getRange("D:D").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  setupReadme(ss);
  ensureProtections(ss);

  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    if (name !== README_SHEET_NAME && name !== GRAY_AREA_SHEET_NAME && name !== SETTINGS_SHEET_NAME && name !== JIXY_FEEDBACK_SHEET_NAME) {
      try { sheet.hideSheet(); } catch (e) {}
    }
  });
}

function setupReadme(ss) {
  let sheet = ss.getSheetByName(README_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(README_SHEET_NAME, 0);
  sheet.clear();
  sheet.setTabColor("#ff0000");
  const range = sheet.getRange("B2:J15");
  range.merge().setBackground("#ffebee").setBorder(true, true, true, true, true, true, "#d32f2f", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  const textValue = "🛑 SYSTEM WARNING - O18 DATABASE 🛑\n\nThis Spreadsheet represents the monolithic backend of the Flash Assistant (O18) application.\nGray Area Cases and Jixy AI Knowledge Base are stored in their respective visible sheets.\nAll other row manipulation happens exclusively via Web API.\n\n⚠️ OPERATIVE RULES FOR AGENTS AND QA:\n1. DO NOT manually modify, delete, or reorder columns.\n2. DO NOT delete rows from active logs.\n\nAny manual interaction will corrupt the structured JSON flows causing app failure.";
  sheet.getRange("B2").setValue(textValue).setFontFamily("Roboto").setFontSize(12).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.setHiddenGridlines(true);
}

function ensureProtections(ss) {
  const sheet = ss.getSheetByName(BASE_LOG_NAME);
  if (!sheet) return;
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  if (!protections.some(p => p.getRange().getRow() === 1)) {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect().setDescription("Headers Protected").setWarningOnly(true);
  }
}

function getTableData(page = 1, pageSize = 10, searchQuery = "") {
  try {
    const context = getUserContext();
    const query = searchQuery.toString().toLowerCase().trim();
    const cache = CacheService.getScriptCache();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (!sheet || sheet.getLastRow() < 2) { return { user: context, data: [], totalRows: 0, page: 1, totalPages: 0 }; }

    const totalRows = sheet.getLastRow() - 1;
    const totalPages = Math.ceil(totalRows / pageSize);
    let processedData = [];
    let safePage = page;

    if (!query) {
      safePage = (page > totalPages && totalPages > 0) ? totalPages : Math.max(1, page);
      const endRow = sheet.getLastRow() - ((safePage - 1) * pageSize);
      const startRow = Math.max(2, endRow - pageSize + 1);
      const numRowsToRead = endRow - startRow + 1;

      if (numRowsToRead > 0) {
        const dataValues = sheet.getRange(startRow, 1, numRowsToRead, 18).getValues();
        processedData = dataValues.map((row, index) => { return _parseRowArrayToObj(row, startRow + index); });
        processedData.reverse();
      }
    } else {
      const maxScan = Math.min(totalRows, 1000);
      const startRow = Math.max(2, sheet.getLastRow() - maxScan + 1);
      const dataValues = sheet.getRange(startRow, 1, maxScan, 18).getValues();
      let allScanned = dataValues.map((row, index) => _parseRowArrayToObj(row, startRow + index));
      allScanned.reverse();
      processedData = allScanned.filter(item => String(item.jobId).toLowerCase().includes(query) || String(item.workflow).toLowerCase().includes(query));
    }

    let finalData = processedData;
    let finalTotalRows = totalRows;
    let finalTotalPages = totalPages;

    if (query) {
      finalTotalRows = processedData.length;
      finalTotalPages = Math.ceil(finalTotalRows / pageSize);
      safePage = (page > finalTotalPages && finalTotalPages > 0) ? finalTotalPages : Math.max(1, page);
      finalData = processedData.slice((safePage - 1) * pageSize, safePage * pageSize);
    }

    for (let i = 0; i < finalData.length; i++) {
      const lockStatus = cache.get('LOCK_O18_' + finalData[i].rowNum);
      if (lockStatus) finalData[i].lockedBy = lockStatus;
    }
    return { user: context, data: finalData, totalRows: finalTotalRows, page: safePage, totalPages: finalTotalPages };
  } catch (e) { throw new Error(`Data extraction failed: ${e.message}`); }
}

function _parseRowArrayToObj(row, rowNum) {
  const rawJobId = String(row[3]);
  const statusRaw = String(row[8]);
  let qaLdap = "";
  let parkedDurationMs = 0;

  if (statusRaw.startsWith("RESOLVED|") || statusRaw.startsWith("PARKED|")) {
    const parts = statusRaw.split("|");
    if (parts.length > 2) qaLdap = parts[2];
    if (parts.length === 5 && parts[3] === "PARKED_DURATION") {
      parkedDurationMs = parseInt(parts[4], 10);
    }
  }

  return {
    rowNum: rowNum, 
    timestamp: (row[0] instanceof Date) ? row[0].toISOString() : row[0],
    ldap: row[1], 
    workflow: row[2], 
    jobId: rawJobId.startsWith("'") ? rawJobId.substring(1) : rawJobId,
    agentPolicy: row[4], 
    agentComment: row[5], 
    qaCorrectPolicy: row[6], 
    qaComment: row[7],
    status: statusRaw, 
    qaLdap: qaLdap, 
    raters: row[9],
    isGrayArea: row[10] === true || String(row[10]).toLowerCase() === "true",
    qaResolutionTime: (row[11] instanceof Date) ? row[11].toISOString() : row[11],
    agentSubworkflow: row[12] || "", 
    qaSubworkflow: row[13] || "",
    agentCleanPolicy: row[14] || "", 
    qaCleanPolicy: row[15] || "",
    query: row[16] || "", 
    response: row[17] || "",
    parkedDurationMs: parkedDurationMs
  };
}

function logNewEntry(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const comment = String(data.agentComment || '').trim();
    if (comment.length < 15) { return { success: false, message: "Escalation Rejected: A detailed rationale context (min 15 characters) is mandatory." }; }
    data.agentComment = comment;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (!sheet) throw new Error("Unified Database missing.");

    const userContext = getUserContext();
    const safeJobIdStr = String(data.jobId).trim();
    const cleanJobId = safeJobIdStr.replace(/^'/, "").toLowerCase();
    const workflow = String(data.workflow).trim().toLowerCase();

    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;
    let currentData = [];
    if (lastRow > 1) {
      currentData = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
      existingRowIndex = currentData.findIndex(r => String(r[3]).replace(/\s+/g, ' ').replace(/^'/, "").toLowerCase() === cleanJobId && String(r[2]).toLowerCase() === workflow);
    }

    if (existingRowIndex !== -1) {
      const existingStatus = String(currentData[existingRowIndex][8]);
      if (existingStatus === "PENDING_QA" || existingStatus.startsWith("PARKED")) { return addBlindAnalysis(sheet, existingRowIndex + 2, currentData[existingRowIndex], data, userContext); }
      else { return { success: false, message: "Ticket has already been resolved by QA." }; }
    }

    const timestamp = new Date();
    const ratersJson = JSON.stringify([{ ldap: userContext.ldap, policy: data.agentPolicy || '', comment: data.agentComment, timestamp: timestamp.getTime() }]);

    const agentSubworkflowExtracted = _extractSubworkflow(data.agentPolicy);
    const agentCleanPolicyExtracted = _extractCleanPolicy(data.agentPolicy);

    sheet.appendRow([
      timestamp, userContext.ldap, data.workflow, "'" + safeJobIdStr,
      data.agentPolicy || '', data.agentComment, "", "", "PENDING_QA",
      ratersJson, false, "", agentSubworkflowExtracted, "",
      agentCleanPolicyExtracted, "", data.query || "", data.response || ""
    ]);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(CACHE_KEY_DATA);
    return { success: true, message: "Doubt successfully submitted to Unified Queue." };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function addBlindAnalysis(sheet, rowNum, rowData, inputData, userContext) {
  const comment = String(inputData.agentComment || '').trim();
  if (comment.length < 15) { return { success: false, message: "Analysis Rejected: A detailed rationale context (min 15 characters) is mandatory." }; }

  let raters = [];
  try { raters = JSON.parse(rowData[9]); } catch(e) { raters = []; }
  if (raters.some(r => r.ldap === userContext.ldap)) return { success: false, message: "Blind analysis already submitted." };

  raters.push({ ldap: userContext.ldap, policy: inputData.agentPolicy || '', comment: comment, timestamp: new Date().getTime() });

  const allAgentSubs = raters.map(r => _extractSubworkflow(r.policy)).filter(Boolean).join(', ');
  const allAgentCleanPols = raters.map(r => _extractCleanPolicy(r.policy)).filter(Boolean).join(', ');

  sheet.getRange(rowNum, 10).setValue(JSON.stringify(raters));
  sheet.getRange(rowNum, 13).setValue(allAgentSubs);
  sheet.getRange(rowNum, 15).setValue(allAgentCleanPols);
  SpreadsheetApp.flush();
  CacheService.getScriptCache().remove(CACHE_KEY_DATA);
  return { success: true, message: "Analysis integrated into the Blind Thread." };
}

function syncGrayAreaRecord(jobId, policy, comment, isGrayArea) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(GRAY_AREA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(GRAY_AREA_SHEET_NAME, 1);
    sheet.getRange(1, 1, 1, 6).setValues([['Date Added', 'Origin', 'Job ID', 'Policy', 'QA Rationale', 'QA LDAP']]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const safeJobIdStr = String(jobId).replace(/\s+/g, ' ').trim();
  const cleanJobId = safeJobIdStr.replace(/^'/, "").toLowerCase();
  const lastRow = sheet.getLastRow();
  let foundRow = -1;

  if (lastRow > 1) {
    const data = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).replace(/\s+/g, ' ').replace(/^'/, "").trim().toLowerCase() === cleanJobId) { foundRow = i + 2; break; }
    }
  }

  if (isGrayArea) {
    const ldap = getUserContext().ldap;
    const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    if (foundRow !== -1) { sheet.getRange(foundRow, 1, 1, 6).setValues([[dateStr, "ALL", "'" + safeJobIdStr, policy, comment, ldap]]); }
    else { sheet.appendRow([dateStr, "ALL", "'" + safeJobIdStr, policy, comment, ldap]); }
  } else {
    if (foundRow !== -1) { sheet.deleteRow(foundRow); }
  }
  SpreadsheetApp.flush();
  CacheService.getScriptCache().remove(CACHE_KEY_GRAY);
}

function getGrayAreaDatabase() {
  if (!getUserContext().isQa) throw new Error("Access Denied");
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY_GRAY);
  if (cached) return JSON.parse(cached);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(GRAY_AREA_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(GRAY_AREA_SHEET_NAME, 1);
      sheet.getRange(1, 1, 1, 6).setValues([['Date Added', 'Origin', 'Job ID', 'Policy', 'QA Rationale', 'QA LDAP']]).setFontWeight('bold');
      sheet.setFrozenRows(1);
      return [];
    }
    if (sheet.getLastRow() < 2) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    const result = data.map(row => {
      const rawJob = String(row[2]);
      return { date: (row[0] instanceof Date) ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), "yyyy-MM-dd") : row[0], market: row[1], jobId: rawJob.startsWith("'") ? rawJob.substring(1) : rawJob, policy: row[3], rationale: row[4], ldap: row[5] };
    });
    result.reverse();
    cache.put(CACHE_KEY_GRAY, JSON.stringify(result), 300);
    return result;
  } catch (e) { return []; }
}

function resolveByQa(rowNum, qaPolicy, qaComment, isGrayArea = false) {
  const context = getUserContext();
  if (!context.isQa) throw new Error("Restricted to QA staff only.");
  const cache = CacheService.getScriptCache();
  const activeLock = cache.get('LOCK_O18_' + rowNum);
  if (activeLock && activeLock !== context.ldap) { throw new Error("Action Denied: Your row lock expired and was acquired by another QA user."); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (rowNum > sheet.getLastRow()) throw new Error("Target row no longer exists.");
    const currentStatus = String(sheet.getRange(rowNum, 9).getValue());
    const resolveTime = new Date();
    let finalStatus = `RESOLVED|${resolveTime.getTime()}|${context.ldap}`;

    if (currentStatus.startsWith("PARKED|")) {
      const parkTime = parseInt(currentStatus.split("|")[1], 10);
      const parkedDurationMs = resolveTime.getTime() - parkTime;
      finalStatus = `RESOLVED|${resolveTime.getTime()}|${context.ldap}|PARKED_DURATION|${parkedDurationMs}`;
    }

    const qaSubworkflowExtracted = _extractSubworkflow(qaPolicy);
    const qaCleanPolicyExtracted = _extractCleanPolicy(qaPolicy);
    sheet.getRange(rowNum, 7, 1, 3).setValues([[qaPolicy, qaComment, finalStatus]]);
    sheet.getRange(rowNum, 11, 1, 2).setValues([[isGrayArea, resolveTime]]);
    sheet.getRange(rowNum, 14).setValue(qaSubworkflowExtracted);
    sheet.getRange(rowNum, 16).setValue(qaCleanPolicyExtracted);
    const jobId = sheet.getRange(rowNum, 4).getValue();
    syncGrayAreaRecord(jobId, qaPolicy, qaComment, isGrayArea);
    SpreadsheetApp.flush();
    cache.remove(CACHE_KEY_DATA);
    unlockRow(rowNum);
    return { success: true };
  } finally { lock.releaseLock(); }
}

function parkByQa(rowNum, tentativePolicy, qaComment) {
  const context = getUserContext();
  if (!context.isQa) throw new Error("Restricted to QA staff only.");
  const cache = CacheService.getScriptCache();
  const activeLock = cache.get('LOCK_O18_' + rowNum);
  if (activeLock && activeLock !== context.ldap) { throw new Error("Action Denied: Your row lock expired and was acquired by another QA user."); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (rowNum > sheet.getLastRow()) throw new Error("Target row no longer exists.");
    const finalStatus = `PARKED|${new Date().getTime()}|${context.ldap}`;
    sheet.getRange(rowNum, 7, 1, 3).setValues([[tentativePolicy, qaComment, finalStatus]]);
    SpreadsheetApp.flush();
    cache.remove(CACHE_KEY_DATA);
    unlockRow(rowNum);
    return { success: true };
  } finally { lock.releaseLock(); }
}

function editQaResolution(rowNum, qaPolicy, qaComment, isGrayArea = false) {
  const context = getUserContext();
  if (!context.isQa) throw new Error("Restricted to QA staff only.");
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (!String(sheet.getRange(rowNum, 9).getValue()).includes(context.ldap)) throw new Error("Action Denied.");
    const resolveTime = new Date();
    const qaSubworkflowExtracted = _extractSubworkflow(qaPolicy);
    const qaCleanPolicyExtracted = _extractCleanPolicy(qaPolicy);
    sheet.getRange(rowNum, 7, 1, 2).setValues([[qaPolicy, qaComment]]);
    sheet.getRange(rowNum, 11, 1, 2).setValues([[isGrayArea, resolveTime]]);
    sheet.getRange(rowNum, 14).setValue(qaSubworkflowExtracted);
    sheet.getRange(rowNum, 16).setValue(qaCleanPolicyExtracted);
    const jobId = sheet.getRange(rowNum, 4).getValue();
    syncGrayAreaRecord(jobId, qaPolicy, qaComment, isGrayArea);

    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(CACHE_KEY_DATA);
    return { success: true, message: "Resolution updated successfully." };
  } finally { lock.releaseLock(); }
}

function getAdminSettings() {
  if (!getUserContext().isQa) throw new Error("Access Denied");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  const emails = settingsSheet.getLastRow() < 2 ? "" : settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 1).getValues().flat().join('\n');
  const cdConfig = getCountdownConfig();
  return { qaEmails: emails, policies: getPolicies(), countdownDuration: cdConfig.duration, countdownVisibility: cdConfig.visibility, jixyKB: getJixyKnowledge() };
}

function saveAdminSettings(data) {
  if (!getUserContext().isQa) throw new Error("Access Denied");
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    settingsSheet.getRange("A2:A").clearContent();
    const emails = data.qaEmails.split('\n').map(x => x.trim()).filter(Boolean);
    if (emails.length) settingsSheet.getRange(2, 1, emails.length, 1).setValues(emails.map(x => [x]));
    settingsSheet.getRange(2, 3).setValue(parseInt(data.countdownDuration, 10));
    settingsSheet.getRange(2, 4).setValue(data.countdownVisibility === true || data.countdownVisibility === 'true');
    settingsSheet.getRange("F2:I").clearContent();
    if (data.policies && Array.isArray(data.policies)) {
      let policyRows = [];
      data.policies.forEach(group => {
        const cat = group.category || "General";
        const isVis = group.isVisible !== false;
        if (group.media && Array.isArray(group.media)) {
          group.media.forEach(mediaGroup => {
            const med = mediaGroup.type || "All";
            if (mediaGroup.policies && Array.isArray(mediaGroup.policies)) { mediaGroup.policies.forEach(pol => { if (pol.trim()) policyRows.push([cat, med, pol.trim(), isVis]); }); }
          });
        }
      });
      if(policyRows.length > 0) { settingsSheet.getRange(2, 6, policyRows.length, 4).setValues(policyRows); }
    }
    let jixySheet = ss.getSheetByName(JIXY_KB_SHEET_NAME);
    if (!jixySheet) jixySheet = ss.insertSheet(JIXY_KB_SHEET_NAME);
    else jixySheet.clear();
    jixySheet.getRange(1, 1, 1, 3).setValues([["Title", "URL", "Keywords (comma separated)"]]).setFontWeight("bold");
    if (data.jixyKB && data.jixyKB.length > 0) {
      const rows = data.jixyKB.map(item => [item.title, item.url, item.keywords.join(', ')]);
      jixySheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY_QA); cache.remove(CACHE_KEY_POLICIES); cache.remove('CD_DURATION_O18'); cache.remove('CD_VISIBILITY_O18'); cache.remove(CACHE_KEY_JIXY); cache.remove(CACHE_KEY_DATA);
    return { success: true };
  } finally { lock.releaseLock(); }
}

function setupSystemTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) { if (triggers[i].getHandlerFunction() === 'runSystemMaintenance') ScriptApp.deleteTrigger(triggers[i]); }
  ScriptApp.newTrigger('runSystemMaintenance').timeBased().everyMinutes(5).create();
}

function runSystemMaintenance() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const now = new Date().getTime();
    const sheet = ss.getSheetByName(BASE_LOG_NAME);
    if (!sheet || sheet.getLastRow() < 2) return;

    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(2, 9, lastRow - 1, 1).getValues();
    let rowsToDeleteCount = 0;
    for (let i = 0; i < data.length; i++) {
      const status = String(data[i][0]);
      if (status.startsWith("RESOLVED|")) {
        const resolvedTime = parseInt(status.split("|")[1], 10);
        if (now - resolvedTime > TTL_AFTER_QA_MS) {
          rowsToDeleteCount++;
          continue;
        }
      }
      break;
    }
    if (rowsToDeleteCount > 0) {
      sheet.deleteRows(2, rowsToDeleteCount);
      SpreadsheetApp.flush();
      CacheService.getScriptCache().remove(CACHE_KEY_DATA);
    }
  } catch (e) {
    console.error("Maintenance failed: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function lockRow(rowNum) {
  var cache = CacheService.getScriptCache();
  var currentUser = Session.getActiveUser().getEmail().split('@')[0] || "QA_USER";
  var key = 'LOCK_O18_' + rowNum;
  var existingLock = cache.get(key);
  if (existingLock && existingLock !== currentUser) return { success: false, lockedBy: existingLock };
  cache.put(key, currentUser, 180);
  return { success: true };
}

function unlockRow(rowNum) { CacheService.getScriptCache().remove('LOCK_O18_' + rowNum); return { success: true }; }

function uploadImageToDrive(base64Data, mimeType, filename, customFolderId) {
  try {
    const targetFolderId = customFolderId || CENTRAL_IMAGE_FOLDER_ID;
    if (!targetFolderId || targetFolderId === 'YOUR_IMAGE_FOLDER_ID_HERE') { throw new Error("Target Folder ID not configured by Admin."); }
    const cleanBase64 = base64Data.indexOf(',') !== -1 ? base64Data.split(',')[1] : base64Data;
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, mimeType || 'image/png', filename || 'screenshot.png');
    const folder = DriveApp.getFolderById(targetFolderId);
    const file = folder.createFile(blob);
    return { success: true, url: file.getUrl(), id: file.getId() };
  } catch (e) { return { success: false, message: "Image Upload failed: " + e.message }; }
}

function saveJixyFeedback(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(JIXY_FEEDBACK_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(JIXY_FEEDBACK_SHEET_NAME);
      sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'LDAP Reporter', 'Issue / Bug Report', 'Suggested Solution', 'Visual Preview', 'Drive Link']]).setFontWeight('bold').setBackground('#ffebee').setFontColor('#c62828');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 150); sheet.setColumnWidth(2, 150); sheet.setColumnWidth(3, 350); feedbackSheet.setColumnWidth(4, 350); feedbackSheet.setColumnWidth(5, 200); feedbackSheet.setColumnWidth(6, 250);
    }

    let imageUrl = "N/A"; let imageFormula = "";
    if (data.imageBase64 && data.fileName && data.mimeType) {
      const uploadResponse = uploadImageToDrive(data.imageBase64, data.mimeType, data.fileName, JIXY_FEEDBACK_FOLDER_ID);
      if (uploadResponse.success) { imageUrl = uploadResponse.url; imageFormula = `=IMAGE("https://drive.google.com/thumbnail?id=${uploadResponse.id}")`; }
      else { imageUrl = "UPLOAD_ERROR: " + uploadResponse.message; }
    }

    sheet.appendRow([new Date(), data.ldap || 'Unknown', data.issue || '', data.solution || '', imageFormula, imageUrl]);
    if (imageFormula !== "") { sheet.setRowHeight(sheet.getLastRow(), 150); }
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}
