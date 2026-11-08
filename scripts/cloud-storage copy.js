/**
 * DWSS storage
 * Database is the only mode. Application data is never stored in the browser.
 */
(function () {
  const COLLECTIONS = {
    siteDiaryData: 'siteDiary',
    inspectionData: 'inspection',
    wageData: 'wage',
    labourWageData: 'labourWage',
    dwss_site_data_v9: 'sites',
    ael_dwss_teams: 'teams',
    dwss_user_groups: 'groups'
  };

  let cloudMode = false;
  const cache = {};
  const versions = {};
  let ready = false;
  const waiters = [];

  function idOf(item) {
    return String(item && (item.id || item.record_id) || '');
  }

  function isDataKey(key) {
    return Object.prototype.hasOwnProperty.call(COLLECTIONS, key);
  }

  function markReady() {
    ready = true;
    while (waiters.length) {
      try { waiters.shift()(); } catch (e) { console.error(e); }
    }
  }

  async function loadCollection(lsKey, coll) {
    const res = await fetch('/api/records/' + coll, { cache: 'no-store' });
    if (!res.ok) {
      cache[lsKey] = [];
      versions[lsKey] = {};
      return;
    }
    const list = await res.json();
    cache[lsKey] = Array.isArray(list) ? list : [];
    versions[lsKey] = {};
    cache[lsKey].forEach(function (item) {
      const id = idOf(item);
      if (id) versions[lsKey][id] = item._version || 1;
    });
  }

  const saveChain = {};

  function enqueueSave(lsKey) {
    const prev = saveChain[lsKey] || Promise.resolve();
    const next = prev.then(function () { return saveCollection(lsKey); }).catch(function (e) {
      console.warn('[Storage] Save error', lsKey, e);
      return false;
    });
    saveChain[lsKey] = next;
    return next;
  }

  async function saveCollection(lsKey) {
    if (!cloudMode || !isDataKey(lsKey)) return false;
    const coll = COLLECTIONS[lsKey];
    const items = Array.isArray(cache[lsKey]) ? cache[lsKey] : [];
    const prevCount = versions[lsKey] ? Object.keys(versions[lsKey]).length : 0;
    if (items.length === 0 && prevCount === 0) return true;

    const payload = items.map(function (item) {
      const id = idOf(item);
      return Object.assign({}, item, {
        _version: (versions[lsKey] && versions[lsKey][id]) || null
      });
    });

    const url = '/api/records/' + coll + '/bulk' + (items.length === 0 ? '?allowEmpty=1' : '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 409) {
      alert('Another user changed this data. The page will reload.');
      location.reload();
      return false;
    }
    if (!res.ok) {
      console.warn('[Storage] Save failed', lsKey, res.status);
      return false;
    }
    await loadCollection(lsKey, coll);
    return true;
  }

  function clearDataFromLocalStorage() {
    Object.keys(COLLECTIONS).forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) {}
    });
  }

  const SESSION_DATA_KEYS = {
    editDocument: 1,
    currentDocument: 1,
    currentDiaryRecord: 1,
    currentRecord: 1,
    currentWageRecord: 1,
    currentInspectionRecord: 1,
    viewDocument: 1,
    siteDiaryData: 1,
    inspectionData: 1,
    wageData: 1,
    labourWageData: 1
  };

  function isSessionDataKey(key) {
    if (SESSION_DATA_KEYS[key]) return true;
    return /^(dsd_formdata_|labour_formdata_|labour_template_|editlabour_layout_)/.test(key);
  }

  function installSessionBlock() {
    const origGet = sessionStorage.getItem.bind(sessionStorage);
    const origSet = sessionStorage.setItem.bind(sessionStorage);
    sessionStorage.getItem = function (key) {
      if (isSessionDataKey(key)) return null;
      return origGet(key);
    };
    sessionStorage.setItem = function (key, value) {
      if (isSessionDataKey(key)) return;
      origSet(key, value);
    };
  }

  function installCloudPatch() {
    const origGet = localStorage.getItem.bind(localStorage);
    const origSet = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);

    localStorage.getItem = function (key) {
      if (isDataKey(key)) {
        if (!Array.isArray(cache[key])) return null;
        return JSON.stringify(cache[key]);
      }
      return origGet(key);
    };

    localStorage.setItem = function (key, value) {
      if (isDataKey(key)) {
        try { cache[key] = JSON.parse(value); } catch (e) { cache[key] = []; }
        if (!Array.isArray(cache[key])) cache[key] = [];
        enqueueSave(key);
        return;
      }
      origSet(key, value);
    };

    localStorage.removeItem = function (key) {
      if (isDataKey(key)) {
        cache[key] = [];
        enqueueSave(key);
        return;
      }
      origRemove(key);
    };
  }

  function defaultUsers() {
    const base = {
      organization: '',
      companyName: '',
      contractNo: 'Contract No. DE/2024/12',
      status: 'online',
      passwordChanged: false,
      passwordChangedAt: null,
      passwordExpiresAt: null
    };
    return [
      Object.assign({}, base, { id: 1, name: 'Admin', email: 'admin@ael-dwss.com', username: 'admin', password: 'admin123', organization: 'SYSTEM_VENDOR', companyName: 'AEL - Associated Engineers Ltd.', role: 'admin', department: 'System Administration', projectIds: ['DE/2026/05', 'DE/2025/02', 'DE/2025/09'], permissions: { level: 5, canChangeStatus: true, canManageUsers: true, name: 'Administrator' } }),
      Object.assign({}, base, { id: 2, name: 'Kenneth Daluz', email: 'kenneth.daluz@dsd.gov.hk', username: 'kenneth', password: 'officer123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'eg', department: 'Engineer Grade', projectIds: ['DE/2026/05', 'DE/2025/02'], permissions: { level: 4, canChangeStatus: false, canManageUsers: false, name: 'Engineer Grade' } }),
      Object.assign({}, base, { id: 3, name: 'TANG Chi Long, Gary', email: 'gcifang@dsd.gov.hk', username: 'garytang', password: 'aei123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2026/05'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Inspector Grade' } }),
      Object.assign({}, base, { id: 4, name: 'FUNG Wai Ching', email: 'wcfung04@dsd.gov.hk', username: 'wcfung', password: 'wsg123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'wsg', department: 'Works Supervisor Grade', projectIds: ['DE/2026/05'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Works Supervisor Grade' } }),
      Object.assign({}, base, { id: 10, name: 'CHA Chi Ming', email: 'cmcha02@dsd.gov.hk', username: 'cmcha', password: 'ig123', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2025/02', 'DE/2025/09'], permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: 'Inspector Grade' } }),
      Object.assign({}, base, { id: 5, name: 'John Smith', email: 'john.smith@rec-ael.com', username: 'john', password: 'inspector123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'sa', department: 'Site Agent', projectIds: ['DE/2025/02'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Site Agent' } }),
      Object.assign({}, base, { id: 6, name: 'Sarah Johnson', email: 'sarah.j@rec-ael.com', username: 'sarah', password: 'contractor123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'ssa', department: 'Sub-Site Agent', projectIds: ['DE/2025/09'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Sub-Site Agent' } }),
      Object.assign({}, base, { id: 7, name: 'Robert Chen', email: 'robert.chen@rec-ael.com', username: 'robert', password: 'rso123', organization: 'CONTRACTOR', companyName: 'REC - AEL Joint Venture', role: 'rso', department: 'Registered Safety Officer', projectIds: ['DE/2026/05', 'DE/2025/02'], permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: 'Registered Safety Officer' } }),
      Object.assign({}, base, { id: 8, name: 'WONG Lap Pan', email: 'lpwong@abc-eng.com', username: 'lpwong', password: 'sub123', organization: 'SUBCONTRACTOR', companyName: 'ABC Engineering Ltd.', role: 'subcontractor', department: 'Subcontractor Team A', projectIds: ['DE/2026/05'], permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: 'Subcontractor' } }),
      Object.assign({}, base, { id: 9, name: 'Emma Wilson', email: 'emma.w@xyz-supply.com', username: 'emma', password: 'supplier123', organization: 'SUPPLIER', companyName: 'XYZ Materials Supply Co.', role: 'supplier', department: 'Material Supplier', projectIds: ['DE/2026/05'], permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: 'Supplier' } })
    ];
  }

  function flatten(groups) {
    const all = [];
    Object.keys(groups).forEach(function (k) {
      groups[k].forEach(function (rec) { all.push(Object.assign({}, rec)); });
    });
    return all;
  }

  function defaultDiaries() {
    return flatten({
      'DE/2026/05': [
        { id: 'SD/DE-2026-05/000001A', status: 'draft', site: 'Treatment Plant', date: '2025-08-15', submittedBy: 'John Doe', type: 'Contractor Documents', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'SD/DE-2026-05/000002A', status: 'submitted-wsg', site: 'Pipeline', date: '2025-08-14', submittedBy: 'Jane Smith', type: 'Contractor Documents', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'SD/DE-2026-05/000003A', status: 'closed', site: 'Reservoir', date: '2025-08-13', submittedBy: 'Robert Johnson', type: 'Sub Contractor Documents', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'SD/DE-2026-05/000004A', status: 'reopen', site: 'Distribution', date: '2025-08-12', submittedBy: 'Sarah Williams', type: 'Sub Contractor Documents', project: 'DE/2026/05', pdfData: null, annotations: [] }
      ],
      'DE/2025/02': [
        { id: 'SD/DE-2025-02/000001A', status: 'submitted-ig', site: 'Pump Station', date: '2025-05-10', submittedBy: 'Michael Brown', type: 'Contractor Documents', project: 'DE/2025/02', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-02/000002A', status: 'closed', site: 'Pipeline', date: '2025-05-09', submittedBy: 'Emma Davis', type: 'Sub Contractor Documents', project: 'DE/2025/02', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-02/000003A', status: 'cancelled', site: 'Reservoir', date: '2025-05-08', submittedBy: 'James Miller', type: 'Contractor Documents', project: 'DE/2025/02', pdfData: null, annotations: [] }
      ],
      'DE/2025/09': [
        { id: 'SD/DE-2025-09/000001A', status: 'submitted-wsg', site: 'Distribution', date: '2025-09-07', submittedBy: 'Olivia Garcia', type: 'Sub Contractor Documents', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-09/000002A', status: 'reopen', site: 'Treatment Plant', date: '2025-09-06', submittedBy: 'William Rodriguez', type: 'Contractor Documents', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-09/000003A', status: 'draft', site: 'Pump Station', date: '2025-09-05', submittedBy: 'David Wilson', type: 'Contractor Documents', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-09/000004A', status: 'closed', site: 'Pipeline', date: '2025-09-04', submittedBy: 'Jane Smith', type: 'Sub Contractor Documents', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'SD/DE-2025-09/000005A', status: 'submitted-ig', site: 'Reservoir', date: '2025-09-03', submittedBy: 'John Doe', type: 'Contractor Documents', project: 'DE/2025/09', pdfData: null, annotations: [] }
      ]
    });
  }

  function defaultInspections() {
    return flatten({
      'DE/2026/05': [
        { id: 'SSR/WSI/DE-2026-05/000001A', status: 'draft', site: 'Treatment Plant', date: '2025-08-15', inspector: 'John Doe', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'SSR/WSI/DE-2026-05/000002A', status: 'submitted', site: 'Pipeline', date: '2025-08-14', inspector: 'Jane Smith', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'SSR/WSI/DE-2026-05/000003A', status: 'closed', site: 'Reservoir', date: '2025-08-13', inspector: 'Robert Johnson', project: 'DE/2026/05', pdfData: null, annotations: [] }
      ],
      'DE/2025/02': [
        { id: 'SSR/WSI/DE-2025-02/000001A', status: 'reopen', site: 'Pump Station', date: '2025-05-10', inspector: 'Michael Brown', project: 'DE/2025/02', pdfData: null, annotations: [] },
        { id: 'SSR/WSI/DE-2025-02/000002A', status: 'closed', site: 'Pipeline', date: '2025-05-09', inspector: 'Emma Davis', project: 'DE/2025/02', pdfData: null, annotations: [] }
      ],
      'DE/2025/09': [
        { id: 'SSR/WSI/DE-2025-09/000001A', status: 'submitted', site: 'Distribution', date: '2025-09-07', inspector: 'Olivia Garcia', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'SSR/WSI/DE-2025-09/000002A', status: 'closed', site: 'Reservoir', date: '2025-09-06', inspector: 'David Wilson', project: 'DE/2025/09', pdfData: null, annotations: [] }
      ]
    });
  }

  function defaultWages() {
    return flatten({
      'DE/2026/05': [
        { id: 'LRR/DE-2026-05/000001A', type: 'GF527A', typeText: 'GF527A - Return on Construction Site Employment', status: 'draft', site: 'Treatment Plant', period: '01-Sep-2025 to 07-Sep-2025', submittedBy: 'John Doe', periodStart: '2025-09-01', periodEnd: '2025-09-07', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'LRR/DE-2026-05/000002A', type: 'GF527-2003', typeText: 'GF527 (2003) - Labour Wage', status: 'submitted', site: 'Pipeline', period: '01-Sep-2025 to 15-Sep-2025', submittedBy: 'Jane Smith', periodStart: '2025-09-01', periodEnd: '2025-09-15', project: 'DE/2026/05', pdfData: null, annotations: [] },
        { id: 'LRR/DE-2026-05/000003A', type: 'GF527-2017', typeText: 'GF527 (2017) - Labour Wage', status: 'endorsed', site: 'Reservoir', period: '01-Aug-2025 to 31-Aug-2025', submittedBy: 'Robert Johnson', periodStart: '2025-08-01', periodEnd: '2025-08-31', project: 'DE/2026/05', pdfData: null, annotations: [] }
      ],
      'DE/2025/02': [
        { id: 'LRR/DE-2025-02/000001A', type: 'GF527A', typeText: 'GF527A - Return on Construction Site Employment', status: 'draft', site: 'Distribution', period: '01-Sep-2025 to 07-Sep-2025', submittedBy: 'Michael Brown', periodStart: '2025-09-01', periodEnd: '2025-09-07', project: 'DE/2025/02', pdfData: null, annotations: [] },
        { id: 'LRR/DE-2025-02/000002A', type: 'GF527-2003', typeText: 'GF527 (2003) - Labour Wage', status: 'double-check', site: 'Pump Station', period: '01-Sep-2025 to 15-Sep-2025', submittedBy: 'Emma Davis', periodStart: '2025-09-01', periodEnd: '2025-09-15', project: 'DE/2025/02', pdfData: null, annotations: [] }
      ],
      'DE/2025/09': [
        { id: 'LRR/DE-2025-09/000001A', type: 'GF527-2017', typeText: 'GF527 (2017) - Labour Wage', status: 'confirm', site: 'Reservoir', period: '01-Sep-2025 to 15-Sep-2025', submittedBy: 'Olivia Garcia', periodStart: '2025-09-01', periodEnd: '2025-09-15', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'LRR/DE-2025-09/000002A', type: 'GF527A', typeText: 'GF527A - Return on Construction Site Employment', status: 'submitted', site: 'Treatment Plant', period: '01-Sep-2025 to 07-Sep-2025', submittedBy: 'David Wilson', periodStart: '2025-09-01', periodEnd: '2025-09-07', project: 'DE/2025/09', pdfData: null, annotations: [] },
        { id: 'LRR/DE-2025-09/000003A', type: 'GF527-2003', typeText: 'GF527 (2003) - Labour Wage', status: 'endorsed', site: 'Pipeline', period: '01-Aug-2025 to 31-Aug-2025', submittedBy: 'James Miller', periodStart: '2025-08-01', periodEnd: '2025-08-31', project: 'DE/2025/09', pdfData: null, annotations: [] }
      ]
    });
  }

  function defaultSites() {
    return [
      { id: 1, name: 'Stonecutters Island Sewage Treatment Works', category: 'Treatment Plant', icon: 'fa-water', lat: 22.3477, lng: 114.1358, lastUpdated: '15-Aug-25', status: 'active', description: 'Major sewage treatment facility serving Kowloon and Hong Kong Island. Phase 2 expansion in progress.', contact: 'Mr. Chan Tai Man', progress: 78 },
      { id: 2, name: 'Mong Kok Water Main Replacement', category: 'Pipeline', icon: 'fa-road', lat: 22.3193, lng: 114.1694, lastUpdated: '14-Aug-25', status: 'in-progress', description: 'Replacement of aging water mains along Nathan Road. Night work to minimize traffic disruption.', contact: 'Mr. Lee Kwok Wai', progress: 45 },
      { id: 3, name: 'Kowloon Reservoir Maintenance', category: 'Reservoir', icon: 'fa-tint', lat: 22.3556, lng: 114.1497, lastUpdated: '13-Aug-25', status: 'active', description: 'Routine maintenance and structural inspection of Kowloon Reservoir dam and overflow systems.', contact: 'Ms. Wong Siu Ling', progress: 92 },
      { id: 4, name: 'Pok Fu Lam Service Reservoir', category: 'Distribution', icon: 'fa-network-wired', lat: 22.2660, lng: 114.1383, lastUpdated: '12-Aug-25', status: 'active', description: 'Fresh water service reservoir supplying Western District. Valve and pipeline upgrades ongoing.', contact: 'Mr. Ho Cheuk Yin', progress: 60 },
      { id: 5, name: 'Sheung Shui Pumping Station Upgrade', category: 'Pump Station', icon: 'fa-gas-pump', lat: 22.5013, lng: 114.1281, lastUpdated: '11-Aug-25', status: 'attention', description: 'High-pressure pumping station serving northern New Territories. Equipment replacement required.', contact: 'Ms. Cheung Mei Ling', progress: 33 }
    ];
  }

  async function seedIfEmpty(lsKey, builder) {
    if (Array.isArray(cache[lsKey]) && cache[lsKey].length > 0) return;
    cache[lsKey] = builder();
    await saveCollection(lsKey);
    console.log('[Storage] Seeded', lsKey, cache[lsKey].length);
  }

  async function seedUsersIfEmpty() {
    if (Array.isArray(cache.dwss_users_db) && cache.dwss_users_db.length > 0) return;
    cache.dwss_users_db = defaultUsers();
    await saveCollection('dwss_users_db');
    console.log('[Storage] Seeded default accounts');
  }

  async function seedDefaults() {
    await seedIfEmpty('siteDiaryData', defaultDiaries);
    await seedIfEmpty('inspectionData', defaultInspections);
    await seedIfEmpty('wageData', defaultWages);
    await seedIfEmpty('labourWageData', defaultWages);
    await seedIfEmpty('dwss_site_data_v9', defaultSites);
  }

  async function detectAndLoad() {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error('no api');
      const info = await res.json();
      if (!info.db) throw new Error('no database');
      cloudMode = true;
      console.log('[Storage] Database mode');
      clearDataFromLocalStorage();
      installCloudPatch();
      installSessionBlock();
      markReady();

      for (const lsKey of Object.keys(COLLECTIONS)) {
        await loadCollection(lsKey, COLLECTIONS[lsKey]);
      }
      await seedDefaults();
    } catch (e) {
      console.error('[Storage] Database is required', e);
      markReady();
    }
  }

  window.DWSS_Storage = {
    isCloud: function () { return cloudMode; },
    ready: function () { return ready; },
    whenReady: function (fn) { if (ready) fn(); else waiters.push(fn); },
    flush: function (key) { return enqueueSave(key); },
    getCache: function (key) { return cache[key]; }
  };

  detectAndLoad();
})();
