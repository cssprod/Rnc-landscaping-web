/**
 * RNC Landscaping: quote and contact requests to Google Sheets.
 *
 * Netlify Forms sends an "Outgoing webhook" (JSON POST) for every verified
 * submission. This web app checks a shared secret in the URL (?key=...),
 * then appends one row to the "Quotes" sheet (contact messages go to the
 * same sheet with form = "contact").
 *
 * Setup: see SETUP.md. Store the secret in Project Settings > Script
 * properties as WEBHOOK_SECRET; never paste it into this file.
 */

var SHEET_NAME = 'Quotes';
var COLUMNS = [
  'received_at', 'form', 'submission_id', 'services', 'propertyType', 'area', 'areaOther', 'address', 'timing',
  'details', 'name', 'email', 'phone', 'contactPreference', 'organization', 'consent', 'message',
  'photo1', 'photo2', 'photo3', 'site_url', 'raw_json'
];

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  var key = e && e.parameter ? e.parameter.key : '';
  if (!secret || !key || !safeEqual_(key, secret)) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'invalid JSON' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    // Netlify can retry a webhook: skip a submission ID we already stored.
    var id = String(payload.id || '');
    if (id && alreadyStored_(sheet, id)) return json_({ ok: true, duplicate: true });

    var d = payload.data || {};
    var row = COLUMNS.map(function (col) {
      switch (col) {
        case 'received_at': return payload.created_at ? new Date(payload.created_at) : new Date();
        case 'form': return payload.form_name || d['form-name'] || '';
        case 'submission_id': return id;
        case 'site_url': return payload.site_url || '';
        case 'raw_json': return JSON.stringify(payload).slice(0, 45000);
        default: return clean_(d[col]);
      }
    });
    sheet.appendRow(row);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/** Simple health check: open the web app URL in a browser. */
function doGet() {
  return json_({ ok: true, service: 'quote sheet webhook' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function alreadyStored_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var col = COLUMNS.indexOf('submission_id') + 1;
  var start = Math.max(2, last - 499); // check the most recent 500 rows
  var ids = sheet.getRange(start, col, last - start + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return true;
  return false;
}

/** File fields arrive as objects ({ url, filename, ... }); other fields as strings. */
function clean_(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.join(', '); // checkbox groups arrive as arrays
  if (typeof v === 'object') return v.url || JSON.stringify(v);
  var s = String(v);
  // Stop spreadsheet formula injection from form input.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
