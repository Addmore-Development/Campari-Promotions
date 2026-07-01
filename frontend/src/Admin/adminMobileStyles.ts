/**
 * adminMobileStyles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single shared stylesheet injected once across all admin pages.
 * Covers: stat grids, tables→cards, filter rows, modals, page headers,
 *         export cards, calculator, map, and form layouts.
 *
 * Usage:  import { injectAdminMobileStyles } from './adminMobileStyles'
 *         Call injectAdminMobileStyles() once inside a useEffect in each page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function injectAdminMobileStyles() {
  if (document.getElementById('hg-admin-mobile')) return

  const el = document.createElement('style')
  el.id = 'hg-admin-mobile'
  el.textContent = `

/* ─── BASE RESET FOR ALL ADMIN PAGES ────────────────────────────────────────── */
.hg-page {
  padding: 40px 48px;
}

/* ─── STAT GRIDS ─────────────────────────────────────────────────────────────
   All 4- or 5-column stat grids collapse gracefully.                          */
.hg-stat-grid {
  display: grid;
  gap: 1px;
}
.hg-stat-grid-5 { grid-template-columns: repeat(5, 1fr); }
.hg-stat-grid-4 { grid-template-columns: repeat(4, 1fr); }
.hg-stat-grid-3 { grid-template-columns: repeat(3, 1fr); }

/* ─── FILTER ROW ─────────────────────────────────────────────────────────────*/
.hg-filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

/* ─── TABLE WRAPPER — horizontal scroll on small screens ────────────────────*/
.hg-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.hg-table-wrap table {
  min-width: 680px;
}

/* ─── CARD GRID (export cards, feature cards) ─────────────────────────────── */
.hg-card-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.hg-card-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* ─── FORM GRID ──────────────────────────────────────────────────────────────*/
.hg-form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.hg-form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}
.hg-form-grid-4 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  align-items: end;
}

/* ─── MODAL ──────────────────────────────────────────────────────────────────*/
.hg-modal-inner {
  padding: 44px;
}

/* ─── PAGE HEADER ROW ────────────────────────────────────────────────────────*/
.hg-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 28px;
}

/* ─── SPLIT LAYOUT (table + detail panel side by side) ──────────────────────*/
.hg-split-layout {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
}

/* ─── CALCULATOR ROW ─────────────────────────────────────────────────────────*/
.hg-calc-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  align-items: end;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BREAKPOINT  ≤ 1100 px  — medium screens / small laptops
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
@media (max-width: 1100px) {
  .hg-stat-grid-5 { grid-template-columns: repeat(3, 1fr); }
  .hg-card-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .hg-calc-row    { grid-template-columns: 1fr 1fr; }
  .hg-split-layout { grid-template-columns: 1fr; }
  .hg-split-panel  { position: static !important; }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BREAKPOINT  ≤ 900 px  — tablets
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
@media (max-width: 900px) {
  .hg-page { padding: 24px 20px; }

  .hg-stat-grid-5 { grid-template-columns: repeat(2, 1fr); }
  .hg-stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .hg-stat-grid-3 { grid-template-columns: repeat(2, 1fr); }

  .hg-card-grid-3 { grid-template-columns: 1fr; }
  .hg-card-grid-2 { grid-template-columns: 1fr; }

  .hg-form-grid-2 { grid-template-columns: 1fr; }
  .hg-form-grid-3 { grid-template-columns: 1fr; }
  .hg-form-grid-4 { grid-template-columns: 1fr 1fr; }

  .hg-calc-row { grid-template-columns: 1fr 1fr; gap: 12px; }

  .hg-page-header { flex-direction: column; align-items: flex-start; gap: 14px; }
  .hg-page-header > *:last-child { align-self: flex-start; }

  .hg-filter-row { gap: 6px; }

  .hg-modal-inner { padding: 28px 20px; }

  /* Table: hide low-priority columns */
  .hg-col-hide-md { display: none !important; }

  /* Stat card value slightly smaller */
  .hg-stat-val { font-size: 28px !important; }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BREAKPOINT  ≤ 600 px  — phones
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
@media (max-width: 600px) {
  .hg-page { padding: 16px 12px; }

  .hg-stat-grid-5 { grid-template-columns: repeat(2, 1fr); }
  .hg-stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .hg-stat-grid-3 { grid-template-columns: repeat(2, 1fr); }

  .hg-form-grid-4 { grid-template-columns: 1fr; }
  .hg-calc-row    { grid-template-columns: 1fr; }

  .hg-modal-inner { padding: 20px 14px; }

  /* hide even more table columns */
  .hg-col-hide-sm { display: none !important; }

  .hg-filter-row button,
  .hg-filter-row select {
    font-size: 9px !important;
    padding: 5px 9px !important;
  }

  /* Force table to card layout on phones */
  .hg-table-cards thead { display: none; }
  .hg-table-cards tbody tr {
    display: block;
    margin-bottom: 10px;
    border: 1px solid rgba(212,136,10,0.16) !important;
    border-radius: 3px;
    padding: 14px 14px 10px;
    background: #151209;
  }
  .hg-table-cards tbody tr td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0 !important;
    border-bottom: 1px solid rgba(212,136,10,0.08) !important;
    font-size: 12px;
  }
  .hg-table-cards tbody tr td:last-child {
    border-bottom: none !important;
    padding-top: 10px !important;
  }
  .hg-table-cards tbody tr td::before {
    content: attr(data-label);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(192,178,158,0.55);
    font-family: 'Playfair Display', Georgia, serif;
    flex-shrink: 0;
    margin-right: 12px;
  }

  /* Jobs page: action buttons vertical on phones */
  .hg-action-col { flex-direction: column !important; gap: 4px !important; }

  /* Live map: stat pills wrap */
  .hg-map-pills { flex-wrap: wrap !important; gap: 4px !important; }
  .hg-map-pills > div { flex: 1 1 calc(50% - 4px); min-width: 90px; }

  /* Reports export cards full width */
  .hg-export-card { width: 100% !important; }

  /* Payout calculator total card */
  .hg-calc-total { padding: 14px 16px !important; }
  .hg-calc-total .hg-calc-val { font-size: 22px !important; }
}

/* ─── MODAL OVERLAY — always full-screen on mobile ───────────────────────────*/
@media (max-width: 600px) {
  .hg-modal-overlay {
    padding: 0 !important;
    align-items: flex-end !important;
  }
  .hg-modal-box {
    max-width: 100% !important;
    width: 100% !important;
    max-height: 95vh !important;
    border-radius: 12px 12px 0 0 !important;
  }
}

/* ─── JOB VIEW MODAL detail grid ─────────────────────────────────────────────*/
@media (max-width: 600px) {
  .hg-job-detail-grid { grid-template-columns: 1fr !important; }
  .hg-shift-stats     { grid-template-columns: 1fr 1fr !important; }
  .hg-selfie-grid     { grid-template-columns: 1fr !important; }
  .hg-promoter-grid   { grid-template-columns: 1fr !important; }
}

/* ─── COMPLAINTS / ENQUIRIES filter bar ─────────────────────────────────────*/
@media (max-width: 900px) {
  .hg-ce-filters {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }
  .hg-ce-filters > div {
    width: 100%;
    flex-wrap: wrap;
  }
}

/* ─── USERS page action column ───────────────────────────────────────────────*/
@media (max-width: 900px) {
  .hg-user-actions { flex-direction: column !important; gap: 4px !important; }
  .hg-user-actions button { flex: none !important; width: 100% !important; }
}

/* ─── ONBOARDING split layout ────────────────────────────────────────────────*/
@media (max-width: 900px) {
  .hg-onboard-split { grid-template-columns: 1fr !important; }
}

/* ─── LIVE MAP top bar ───────────────────────────────────────────────────────*/
@media (max-width: 900px) {
  .hg-map-topbar {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 12px !important;
    padding: 16px 20px !important;
  }
}
@media (max-width: 600px) {
  .hg-map-height { height: 36vh !important; }
}

/* ─── ADMIN DASHBOARD quick-actions + activity grid ─────────────────────────*/
@media (max-width: 900px) {
  .hg-dash-two-col { grid-template-columns: 1fr !important; }
  .hg-dash-stats   { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 600px) {
  .hg-dash-stats   { grid-template-columns: 1fr !important; }
  .hg-dash-header  { flex-direction: column !important; gap: 8px !important; }
}

/* ─── Address block grid (Jobs create/edit) ──────────────────────────────────*/
@media (max-width: 600px) {
  .hg-addr-grid-top { grid-template-columns: 1fr !important; }
  .hg-addr-grid-bot { grid-template-columns: 1fr !important; }
}

/* ─── Scrollbar always thin on mobile ───────────────────────────────────────*/
@media (max-width: 900px) {
  ::-webkit-scrollbar { width: 2px; height: 2px; }
}
  `
  document.head.appendChild(el)
}