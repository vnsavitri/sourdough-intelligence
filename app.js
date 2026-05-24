/**
 * CRUMB — UI Controller
 * Wires DOM inputs to the engine, renders the resulting plan.
 */
import { CONFIG, generatePlan } from './engine.js';

// =============================================================
// STATE
// =============================================================
const state = {
  archetype: 'open_crumb',
  finishAt: null, // Date object
  hasLevain: false,
  activeBudget: 'standard',
  activeMinutes: 35,
  tempBand: 'moderate',
  flourType: 'bread_flour',
  wholeWheatPct: 0,
  customHydration: null,
  skill: 'beginner',
  loaves: 1,
  doughPerLoaf: 900,
  currentStep: 0,
  reachedStep: 0, // furthest step the user has visited (for rail nav guard)
  quietEnabled: true,
  quietStart: '23:00', // 'HH:MM', no active steps after this
  quietEnd: '06:00',   // 'HH:MM', active steps OK from this time onward
};

// =============================================================
// HELPERS
// =============================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function activeMinutesFromBudget(key) {
  const map = { very_low: 18, low: 25, standard: 38, high: 70 };
  return map[key] || 35;
}

// =============================================================
// THEME
// =============================================================
function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';

  $('#themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  });
}

// =============================================================
// STEP 1: ARCHETYPES
// =============================================================
function renderArchetypes() {
  const grid = $('#archetypeGrid');
  const archEmojis = {
    sandwich: '🥪',
    toast: '🍞',
    open_crumb: '🥖',
    rolls: '🥐',
    pizza: '🍕',
    focaccia: '🫓',
    baguette: '🥖',
  };
  grid.innerHTML = '';
  Object.entries(CONFIG.archetypes).forEach(([key, arch]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'archetype-card';
    card.dataset.value = key;
    card.setAttribute('role', 'radio');
    if (key === state.archetype) card.classList.add('is-selected');
    card.innerHTML = `
      <span class="archetype-emoji">${archEmojis[key] || '🍞'}</span>
      <span class="archetype-title">${arch.label}</span>
      <span class="archetype-desc">${arch.description}</span>
    `;
    card.addEventListener('click', () => selectCard(grid, card, 'archetype'));
    grid.appendChild(card);
  });
}

function selectCard(grid, card, stateKey) {
  $$('button', grid).forEach((c) => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-checked', 'false');
  });
  card.classList.add('is-selected');
  card.setAttribute('aria-checked', 'true');
  state[stateKey] = card.dataset.value;
}

// =============================================================
// DATE / TIME
// =============================================================
function initDateTime() {
  const dateInput = $('#finishDate');
  const timeInput = $('#finishTime');

  // Default: tomorrow 6pm. Allow today as the minimum so users can plan a
  // same-day bake if their window is short enough.
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  dateInput.value = fmtDate(tomorrow);
  dateInput.min = fmtDate(today);

  function updateFinishAt() {
    const [h, m] = timeInput.value.split(':');
    const d = new Date(dateInput.value);
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    state.finishAt = d;
  }
  dateInput.addEventListener('change', updateFinishAt);
  timeInput.addEventListener('change', updateFinishAt);
  updateFinishAt();
}

// =============================================================
// CARD SELECTORS — BUDGET, TEMP, SKILL
// =============================================================
function initCardSelectors() {
  // Budget
  const budgetGrid = $('#budgetGrid');
  $$('button', budgetGrid).forEach((card) => {
    card.addEventListener('click', () => {
      selectCard(budgetGrid, card, 'activeBudget');
      state.activeMinutes = activeMinutesFromBudget(card.dataset.value);
    });
  });

  // Temp
  const tempGrid = $('#tempGrid');
  $$('button', tempGrid).forEach((card) => {
    card.addEventListener('click', () => selectCard(tempGrid, card, 'tempBand'));
  });

  // Skill
  const skillGrid = $('#skillGrid');
  $$('button', skillGrid).forEach((card) => {
    card.addEventListener('click', () => selectCard(skillGrid, card, 'skill'));
  });

  // Quiet hours
  const quietEnabled = $('#quietEnabled');
  const quietStart = $('#quietStart');
  const quietEnd = $('#quietEnd');
  const quietTimes = $('#quietTimes');
  if (quietEnabled && quietStart && quietEnd && quietTimes) {
    const syncDisabled = () => {
      quietTimes.classList.toggle('is-disabled', !quietEnabled.checked);
      state.quietEnabled = quietEnabled.checked;
    };
    quietEnabled.addEventListener('change', syncDisabled);
    quietStart.addEventListener('change', () => { state.quietStart = quietStart.value; });
    quietEnd.addEventListener('change', () => { state.quietEnd = quietEnd.value; });
    syncDisabled();
  }

  // Levain — boolean toggle stored as state.hasLevain
  const levainGrid = $('#levainGrid');
  if (levainGrid) {
    $$('button', levainGrid).forEach((card) => {
      card.addEventListener('click', () => {
        $$('button', levainGrid).forEach((c) => {
          c.classList.remove('is-selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-checked', 'true');
        state.hasLevain = card.dataset.value === 'yes';
      });
    });
  }
}

// =============================================================
// FORM INPUTS
// =============================================================
function initInputs() {
  $('#flourType').addEventListener('change', (e) => (state.flourType = e.target.value));
  $('#wwPct').addEventListener('change', (e) => (state.wholeWheatPct = parseInt(e.target.value) || 0));
  $('#customHydration').addEventListener('change', (e) => {
    const v = parseInt(e.target.value);
    state.customHydration = v >= 50 && v <= 100 ? v : null;
  });
  $('#loaves').addEventListener('change', (e) => (state.loaves = Math.max(1, parseInt(e.target.value) || 1)));
  $('#doughPerLoaf').addEventListener('change', (e) => (state.doughPerLoaf = Math.max(400, parseInt(e.target.value) || 900)));
}

// =============================================================
// STEP NAVIGATION
// =============================================================
function goToStep(n) {
  state.currentStep = n;
  if (n > state.reachedStep) state.reachedStep = n;
  $$('.step').forEach((s) => s.classList.remove('is-active'));
  $(`[data-step="${n}"].step`).classList.add('is-active');

  // Update rail
  let activeLi = null;
  $$('.rail-steps li').forEach((li) => {
    li.classList.remove('is-active', 'is-done');
    const stepNum = parseInt(li.dataset.step);
    if (stepNum === n) { li.classList.add('is-active'); activeLi = li; }
    else if (stepNum < n) li.classList.add('is-done');
    // Mark whether the user can jump to this step from the rail.
    // Allow any step they have already reached.
    if (stepNum <= state.reachedStep) li.classList.add('is-clickable');
    else li.classList.remove('is-clickable');
  });

  // On mobile rail is horizontal; scroll active item into view
  if (activeLi && window.innerWidth <= 880) {
    activeLi.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Scroll to top of wizard
  $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initNavigation() {
  $$('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      goToStep(next);
    });
  });
  $$('[data-prev]').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(Math.max(0, state.currentStep - 1)));
  });

  $('#generateBtn').addEventListener('click', () => {
    generateAndRender();
    goToStep(4);
  });

  $('#restartBtn').addEventListener('click', () => {
    state.reachedStep = 0;
    goToStep(0);
  });

  // Rail navigation — let users jump back (or forward to any step they've reached)
  // by clicking the progress rail items.
  $$('.rail-steps li').forEach((li) => {
    li.addEventListener('click', () => {
      const target = parseInt(li.dataset.step);
      if (Number.isNaN(target)) return;
      if (target > state.reachedStep) return; // can't jump ahead to unvisited steps
      // If they've already generated a plan and jump back to an input step,
      // re-running through Continue/Generate will rebuild the plan.
      goToStep(target);
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        li.click();
      }
    });
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
  });
}

// =============================================================
// PLAN GENERATION & RENDERING
// =============================================================
function generateAndRender() {
  const inputs = {
    archetype: state.archetype,
    finishAt: state.finishAt,
    hasLevain: state.hasLevain,
    activeMinutes: state.activeMinutes,
    tempBand: state.tempBand,
    flourType: state.flourType,
    wholeWheatPct: state.wholeWheatPct,
    customHydration: state.customHydration,
    skill: state.skill,
    loaves: state.loaves,
    doughPerLoafGrams: state.doughPerLoaf,
    quietHours: state.quietEnabled
      ? { start: state.quietStart, end: state.quietEnd }
      : null,
  };

  const plan = generatePlan(inputs);
  renderPlan(plan, inputs);
}

function renderPlan(plan, inputs) {
  const out = $('#planOutput');
  const arch = plan.formula.archetype;
  const startTime = plan.timeline.levainStart;
  const finishTime = plan.timeline.finishAt;
  const now = plan.now;
  const totalHrs = ((finishTime - startTime) / 3600000).toFixed(1);
  const fit = plan.windowFit;

  // Build the summary sentence — anchor the schedule to "now"
  const startsNowish = (startTime - now) / 60000;
  let startPhrase;
  if (Math.abs(startsNowish) < 10) {
    startPhrase = `Starting now (${fmtFull(now)})`;
  } else if (startsNowish > 0) {
    const hrs = startsNowish / 60;
    startPhrase = hrs < 1
      ? `Starting in ${Math.round(startsNowish)} minutes (${fmtFull(startTime)})`
      : `Starting in ${hrs.toFixed(1)} hours (${fmtFull(startTime)})`;
  } else {
    startPhrase = `Starting at ${fmtFull(startTime)}`;
  }

  // Hero
  let html = `
    <div class="plan" data-plan-capture>
      <div class="plan-hero">
        <span class="plan-hero-eyebrow">Your plan is ready</span>
        <h2>${arch.label} · ${plan.formula.totalDough}g of dough · ${plan.formula.hydration}% hydration</h2>
        <p class="plan-hero-summary">${arch.description}. ${startPhrase}, your bread will be out of the oven at ${fmtFull(finishTime)}. Total active time: about ${plan.activeMinutesUsed} minutes spread across the day.</p>
        <div class="plan-stats">
          <div class="plan-stat">
            <span class="plan-stat-num">${totalHrs}h</span>
            <span class="plan-stat-label">Total time</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-num">${plan.activeMinutesUsed}m</span>
            <span class="plan-stat-label">Active</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-num">${plan.formula.hydration}%</span>
            <span class="plan-stat-label">Hydration</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-num">${plan.formula.inocPct}%</span>
            <span class="plan-stat-label">Starter</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-num">${plan.bulkHours.toFixed(1)}h</span>
            <span class="plan-stat-label">Bulk</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat-num">${plan.useColdRetard ? plan.retardHours.toFixed(0) + 'h' : '—'}</span>
            <span class="plan-stat-label">Cold retard</span>
          </div>
        </div>
      </div>
  `;

  // Plan-window callout: shows start-now → finish, plus any time-fit changes.
  const isInfeasible = !fit.feasible;
  const isCompressed = fit.compressed && fit.feasible;
  const requestedFinish = plan.requestedFinishAt;

  html += `
    <div class="window-callout ${isInfeasible ? 'window-callout-warn' : isCompressed ? 'window-callout-tight' : 'window-callout-ok'}">
      <div class="window-rail">
        <div class="window-point">
          <span class="window-point-label">Start now</span>
          <span class="window-point-time">${fmtFull(now)}</span>
        </div>
        <div class="window-arrow" aria-hidden="true">→</div>
        <div class="window-point window-point-end">
          <span class="window-point-label">Out of the oven</span>
          <span class="window-point-time">${fmtFull(finishTime)}</span>
          ${requestedFinish ? `<span class="window-point-note">Adjusted from your requested ${fmtFull(requestedFinish)}</span>` : ''}
        </div>
      </div>
      <p class="window-summary">
        ${isInfeasible
          ? `<strong>Your requested finish time isn't achievable.</strong> ${/^[aeiou]/i.test(arch.label) ? 'An' : 'A'} ${arch.label.toLowerCase()} at ${CONFIG.tempBands[inputs.tempBand].label} needs at least ${fit.minHours.toFixed(1)} hours from a fresh start. We've moved your finish to the earliest realistic time, ${fmtFull(finishTime)}.`
          : isCompressed
            ? `Tight window: you have ${fit.availableHours.toFixed(1)} hours, vs an ideal ~${fit.idealHours} hours for this loaf. The plan compresses by shortening the cold retard.`
            : `You have ${fit.availableHours.toFixed(1)} hours, plenty for a relaxed schedule.`
        }
      </p>
    </div>
  `;

  // Active-budget suggestion (separate from warnings so it stands out and is clickable)
  if (plan.activeSuggestion) {
    const s = plan.activeSuggestion;
    html += `
      <div class="suggestion-callout">
        <div class="suggestion-body">
          <strong>Reality check on your active-time budget</strong>
          <p>${s.reason}</p>
        </div>
        <button class="btn-link" data-apply-budget="${s.suggestedKey}" data-apply-minutes="${s.suggestedMinutes}">Use the “${CONFIG.activeBudgets[s.suggestedKey].label}” budget instead</button>
      </div>
    `;
  }

  // Other warnings (compression notes, hydration cautions, infeasibility detail)
  // Filter out items already shown in the callouts above to avoid duplication.
  const remainingWarnings = plan.warnings.filter((w) => {
    if (plan.activeSuggestion && w.suggestion) return false;
    if (fit.compressionNotes && fit.compressionNotes.includes(w.text)) return false;
    return true;
  });
  if (remainingWarnings.length > 0) {
    html += `<div class="warnings">`;
    remainingWarnings.forEach((w) => {
      html += `
        <div class="warning warning-${w.severity}">
          <span class="warning-icon">${w.severity === 'high' ? '⚠' : 'ⓘ'}</span>
          <span>${w.text}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Reasoning
  html += `
    <div class="reasoning">
      <h3>Why this plan</h3>
      <p class="section-block-sub">Crumb's choices are transparent. Here's the logic for your inputs:</p>
      <ul>
        ${plan.reasoning.map((r) => `<li>${r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}
      </ul>
    </div>
  `;

  // Formula table
  const f = plan.formula;
  const totalFlour = f.flourTotal;
  const ingredients = [
    { name: f.wholeWheat ? 'Bread / main flour' : 'Bread flour', amount: f.mainFlour, pct: ((f.mainFlour / totalFlour) * 100).toFixed(1) },
  ];
  if (f.wholeWheat) ingredients.push({ name: 'Whole wheat flour', amount: f.wholeWheat, pct: ((f.wholeWheat / totalFlour) * 100).toFixed(1) });
  ingredients.push({ name: 'Water', amount: f.water, pct: ((f.water / totalFlour) * 100).toFixed(1) });
  if (f.milk) ingredients.push({ name: 'Milk', amount: f.milk, pct: ((f.milk / totalFlour) * 100).toFixed(1) });
  ingredients.push({ name: 'Active sourdough starter (100% hydration)', amount: f.starter, pct: ((f.starter / totalFlour) * 100).toFixed(1) });
  ingredients.push({ name: 'Salt', amount: f.salt, pct: f.saltPct.toFixed(1) });
  if (f.butter) ingredients.push({ name: 'Butter (softened)', amount: f.butter, pct: ((f.butter / totalFlour) * 100).toFixed(1) });
  if (f.oil) ingredients.push({ name: 'Oil', amount: f.oil, pct: ((f.oil / totalFlour) * 100).toFixed(1) });
  if (f.sugar) ingredients.push({ name: 'Sugar', amount: f.sugar, pct: ((f.sugar / totalFlour) * 100).toFixed(1) });

  html += `
    <div class="section-block">
      <h3>The formula</h3>
      <p class="section-block-sub">Baker's percentages are calculated with total flour = 100%. ${inputs.loaves > 1 ? `Multiplied for ${inputs.loaves} loaves.` : ''}</p>
      <table class="formula-table">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th class="col-amount">Weight</th>
            <th class="col-pct">Baker's %</th>
          </tr>
        </thead>
        <tbody>
          ${ingredients.map((ing) => `
            <tr>
              <td>${ing.name}</td>
              <td class="col-amount">${ing.amount}g</td>
              <td class="col-pct">${ing.pct}%</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total dough weight</td>
            <td class="col-amount">${f.totalDough}g</td>
            <td class="col-pct">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Schedule
  html += `
    <div class="section-block">
      <h3>The schedule</h3>
      <p class="section-block-sub">Working backwards from your bake-out time of ${fmtFull(finishTime)}.</p>
      <div class="schedule">
        ${plan.steps.map((s) => renderStep(s)).join('')}
      </div>
    </div>
  `;

  // Sanity check
  html += `
    <div class="section-block">
      <h3>Sanity check</h3>
      <p class="section-block-sub">Does this fit your day? Here are the active touch-points only:</p>
      <ul style="margin: 0; padding-left: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2);">
        ${plan.steps
          .filter((s) => s.type === 'active')
          .map((s) => `<li style="font-size: var(--text-sm); line-height: 1.6;"><strong style="font-family: var(--font-mono); color: var(--color-primary);">${s.timeStr}</strong> · ${s.title} <span style="color: var(--color-text-muted);">(${s.durationMin} min)</span></li>`)
          .join('')}
      </ul>
      <div class="download-actions">
        <button class="btn-secondary" onclick="window.print()">🖨 Print this plan</button>
        <button class="btn-secondary" data-download-png>🖼 Download as image</button>
      </div>
    </div>
  `;

  html += `</div>`;
  out.innerHTML = html;

  // Wire "Use suggested budget" button — update state and regenerate plan.
  const applyBtn = out.querySelector('[data-apply-budget]');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const newKey = applyBtn.dataset.applyBudget;
      const newMin = parseInt(applyBtn.dataset.applyMinutes, 10);
      state.activeBudget = newKey;
      state.activeMinutes = newMin;
      // Reflect in the wizard step too (so going back shows correct selection)
      $$('.budget-card').forEach((c) => c.classList.toggle('is-selected', c.dataset.value === newKey));
      generateAndRender();
    });
  }

  // Wire "Download as image" button — captures the plan card as a PNG.
  const pngBtn = out.querySelector('[data-download-png]');
  if (pngBtn) {
    pngBtn.addEventListener('click', async () => {
      const target = out.querySelector('[data-plan-capture]');
      if (!target || typeof window.html2canvas !== 'function') {
        pngBtn.textContent = '⚠ Try again in a moment';
        setTimeout(() => { pngBtn.innerHTML = '🖼 Download as image'; }, 2200);
        return;
      }
      const originalLabel = pngBtn.innerHTML;
      pngBtn.disabled = true;
      pngBtn.textContent = 'Preparing image…';
      try {
        // Resolve the actual surface color so the PNG matches light/dark theme.
        const bg = getComputedStyle(document.body).backgroundColor || '#fef9f0';
        const canvas = await window.html2canvas(target, {
          backgroundColor: bg,
          scale: Math.min(window.devicePixelRatio || 1, 2) * 1.5,
          useCORS: true,
          logging: false,
          windowWidth: target.scrollWidth,
        });
        const link = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        link.download = `crumb-sourdough-plan-${stamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        pngBtn.innerHTML = '✓ Image saved';
        setTimeout(() => { pngBtn.innerHTML = originalLabel; pngBtn.disabled = false; }, 2000);
      } catch (err) {
        console.error('PNG export failed:', err);
        pngBtn.innerHTML = '⚠ Could not save image';
        setTimeout(() => { pngBtn.innerHTML = originalLabel; pngBtn.disabled = false; }, 2400);
      }
    });
  }
}

function renderStep(s) {
  const cssClass = s.type === 'active' ? 'is-active-step' : 'is-passive';
  const tagClass = s.type === 'active' ? 'step-tag-active' : 'step-tag-passive';
  const tagText = s.type === 'active' ? 'Active · hands on' : 'Passive · waiting';
  const durationText = s.type === 'active'
    ? `${s.durationMin} min`
    : s.durationMin >= 60
    ? `${Math.round((s.durationMin / 60) * 10) / 10}h`
    : `${s.durationMin} min`;

  return `
    <div class="schedule-step ${cssClass}">
      <div class="step-time">
        <span class="step-time-text">${s.timeStr}</span>
        <span class="step-duration">${durationText}</span>
        <span class="step-tag ${tagClass}">${tagText}</span>
      </div>
      <div class="step-body">
        <div class="step-title">${s.title}</div>
        <div class="step-description">${s.description}</div>
        ${s.cue ? `<div class="step-cue"><span class="cue-icon">►</span><span>${s.cue}</span></div>` : ''}
        ${s.afterCue ? `<div class="step-cue step-cue-next"><span class="cue-icon">⏳</span><span>${s.afterCue}</span></div>` : ''}
      </div>
    </div>
  `;
}

function fmtFull(date) {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================
// INIT
// =============================================================
function init() {
  initTheme();
  renderArchetypes();
  initDateTime();
  initCardSelectors();
  initInputs();
  initNavigation();
}

document.addEventListener('DOMContentLoaded', init);
