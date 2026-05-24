/**
 * FAILPROOF SOURDOUGH ENGINE
 * ==========================
 * Pure logic — no DOM. Takes a structured input object, returns a structured method.
 *
 * Calibrated against the 207-recipe Failproof Score dataset:
 *   - High-scoring profile (avg score 92.4): hydration 69%, inoculation 21%,
 *     salt 2%, bulk 5.5h @ ~74°F (23°C), retard 12-14h, total 23h
 *   - Low-scoring profile drops above 75% hydration and at extreme temperatures
 *
 * Reference: private 207-recipe analysis summarized in METHODOLOGY.md.
 * Raw recipe rows and third-party source content are intentionally excluded
 * from the public portfolio repository.
 */

// =============================================================
// CONFIG — All thresholds exposed for easy iteration
// =============================================================

export const CONFIG = {
  // Bread purpose archetypes — each defines a target dough character
  archetypes: {
    sandwich: {
      label: 'Soft sandwich loaf',
      description: 'Even crumb, soft crust, holds shape for slicing',
      hydrationRange: { beginner: [62, 68], intermediate: [65, 72], advanced: [68, 75] },
      saltPct: 2.0,
      flourGuidance: 'Bread flour. Up to 15% whole wheat for flavor.',
      enrichments: { butter_pct: 4, milk_swap_pct: 30 }, // % of water replaced with milk
      shaping: 'tin',
      bakeStyle: 'covered_then_uncovered',
      bakeTempC: 220,
      bakeTimeMin: 40,
      cuesNote: 'Aim for an even, fine crumb. Over-fermentation leaves it gummy.',
    },
    toast: {
      label: 'Toast loaf',
      description: 'Slightly chewier, more flavor, sliceable but rustic',
      hydrationRange: { beginner: [65, 70], intermediate: [68, 75], advanced: [72, 78] },
      saltPct: 2.0,
      flourGuidance: 'Bread flour with 10–25% whole wheat or rye for depth.',
      enrichments: {},
      shaping: 'tin_or_batard',
      bakeStyle: 'dutch_oven_or_uncovered',
      bakeTempC: 230,
      bakeTimeMin: 45,
      cuesNote: 'Slightly more open crumb than sandwich. Flavor over softness.',
    },
    open_crumb: {
      label: 'Open-crumb country loaf',
      description: 'Chewy, robust crust, dramatic ear, holes in crumb',
      hydrationRange: { beginner: [70, 75], intermediate: [75, 80], advanced: [78, 85] },
      saltPct: 2.0,
      flourGuidance: 'Strong bread flour. 10–20% whole wheat is classic.',
      enrichments: {},
      shaping: 'boule_or_batard',
      bakeStyle: 'dutch_oven',
      bakeTempC: 245,
      bakeTimeMin: 45,
      cuesNote: 'Strength matters here. Proper folds and shaping create the open structure.',
    },
    rolls: {
      label: 'Dinner rolls / buns',
      description: 'Soft, pillowy, tear-and-share',
      hydrationRange: { beginner: [60, 65], intermediate: [62, 68], advanced: [65, 72] },
      saltPct: 1.8,
      flourGuidance: 'Bread or AP flour. Stick to white for softness.',
      enrichments: { butter_pct: 6, milk_swap_pct: 50, sugar_pct: 5 },
      shaping: 'rolls',
      bakeStyle: 'tray',
      bakeTempC: 200,
      bakeTimeMin: 22,
      cuesNote: 'Keep dough soft. Rolls should feel pillowy, not tight.',
    },
    pizza: {
      label: 'Pizza dough',
      description: 'Chewy, blistered, naturally fermented base',
      hydrationRange: { beginner: [62, 65], intermediate: [65, 70], advanced: [68, 75] },
      saltPct: 2.5,
      flourGuidance: '00 or strong bread flour. Pure white.',
      enrichments: { oil_pct: 2 },
      shaping: 'balls',
      bakeStyle: 'pizza_oven_or_steel',
      bakeTempC: 280,
      bakeTimeMin: 8,
      cuesNote: 'Long cold ferment (24–48h) develops the best pizza dough.',
    },
    focaccia: {
      label: 'Focaccia',
      description: 'High-hydration, dimpled, oil-rich, crispy bottom',
      hydrationRange: { beginner: [75, 80], intermediate: [80, 85], advanced: [85, 90] },
      saltPct: 2.0,
      flourGuidance: 'Bread or 00 flour. White only.',
      enrichments: { oil_pct: 4 },
      shaping: 'pan_pour',
      bakeStyle: 'oven_pan',
      bakeTempC: 230,
      bakeTimeMin: 25,
      cuesNote: 'Pour-and-dimple, no shaping required. Very forgiving for beginners.',
    },
    baguette: {
      label: 'Baguette',
      description: 'Crisp crust, light open crumb, classic French shape',
      hydrationRange: { beginner: [68, 72], intermediate: [72, 76], advanced: [75, 80] },
      saltPct: 2.0,
      flourGuidance: 'T65 or strong bread flour. White only.',
      enrichments: {},
      shaping: 'baguette',
      bakeStyle: 'steam_oven',
      bakeTempC: 245,
      bakeTimeMin: 22,
      cuesNote: 'Shaping is the hardest part. Practice the pre-shape gently.',
    },
  },

  // Inoculation strategy by total fermentation budget and skill
  // (% starter relative to total flour)
  inoculation: {
    // Lookups indexed by [skill][regime]
    // regime is derived from total_hours and ambient temp
    veryShort: { beginner: 25, intermediate: 25, advanced: 30 }, // <12h total, schedule pressured
    short: { beginner: 22, intermediate: 22, advanced: 25 },     // 12–18h
    standard: { beginner: 20, intermediate: 18, advanced: 18 },  // 18–28h, sweet spot
    long: { beginner: 15, intermediate: 12, advanced: 10 },      // 28–40h
    veryLong: { beginner: 12, intermediate: 10, advanced: 8 },   // 40h+ (cold-retard heavy)
  },

  // Salt is conservative — 2% is the dataset standard
  salt: {
    default: 2.0,
    rolls: 1.8,
    pizza: 2.5,
  },

  // Active-time budget profiles
  activeBudgets: {
    very_low: { label: 'Very time-poor', maxMinutes: 20, foldCount: 0, mixStyle: 'short_intensive' },
    low: { label: 'Low touch', maxMinutes: 30, foldCount: 2, mixStyle: 'standard' },
    standard: { label: 'Standard', maxMinutes: 45, foldCount: 3, mixStyle: 'standard' },
    high: { label: 'High engagement', maxMinutes: 90, foldCount: 4, mixStyle: 'rubaud_or_slap' },
  },

  // Bulk fermentation hours @ given dough temp & inoculation
  // Approximation: time = base_hours * 75/inoc_pct * temp_factor
  // temp_factor: every 10°C up halves bulk time roughly
  fermentation: {
    referenceInocPct: 20,
    referenceTempC: 24,
    referenceBulkHours: 5.5,
    // Risk-aware bulk increase target (% volume increase)
    bulkRiseTargetPct: { beginner: 50, intermediate: 65, advanced: 75 },
  },

  // Temperature bands (kitchen ambient)
  tempBands: {
    cold: { label: 'Cold (<20°C)', tempC: 18, doughOffset: 1 },     // dough warms slightly above ambient
    moderate: { label: 'Moderate (20–24°C)', tempC: 22, doughOffset: 1 },
    warm: { label: 'Warm (24–28°C)', tempC: 26, doughOffset: 1 },
    hot: { label: 'Hot (>28°C)', tempC: 30, doughOffset: 1 },
  },

  // Hydration safety adjustment by skill
  hydrationCap: {
    beginner: 75,
    intermediate: 82,
    advanced: 92,
  },

  // Flour types — affect hydration recommendation & water absorption
  flourTypes: {
    bread_flour: { label: 'Bread flour (high protein)', absorptionMult: 1.0 },
    ap_flour: { label: 'All-purpose flour', absorptionMult: 0.95 },
    type_00: { label: 'Type 00 / 00 flour', absorptionMult: 0.97 },
    t65: { label: 'T65 / French-style', absorptionMult: 0.98 },
  },
};

// =============================================================
// CORE CALCULATIONS
// =============================================================

/**
 * Compute predicted bulk fermentation hours.
 * Uses an Arrhenius-like approximation around the reference point.
 */
export function computeBulkHours(inocPct, doughTempC, hasEnrichments) {
  const ref = CONFIG.fermentation;
  const inocFactor = ref.referenceInocPct / Math.max(inocPct, 4);
  // Q10 ≈ 2 — every 10°C increase roughly doubles fermentation rate
  const tempFactor = Math.pow(2, (ref.referenceTempC - doughTempC) / 10);
  let hours = ref.referenceBulkHours * inocFactor * tempFactor;
  // Enrichments slow fermentation
  if (hasEnrichments) hours *= 1.15;
  return Math.max(2, Math.min(14, hours));
}

/**
 * Pick inoculation regime from total time horizon.
 */
function pickInocRegime(totalHours) {
  if (totalHours < 12) return 'veryShort';
  if (totalHours < 18) return 'short';
  if (totalHours < 28) return 'standard';
  if (totalHours < 40) return 'long';
  return 'veryLong';
}

/**
 * Pick active-time bucket from declared minutes.
 */
function pickActiveBudget(minutes) {
  if (minutes <= 20) return 'very_low';
  if (minutes <= 30) return 'low';
  if (minutes <= 45) return 'standard';
  return 'high';
}

/**
 * Decide hydration target from archetype, skill, and temperature.
 */
function decideHydration(archetypeKey, skillLevel, tempBand, flourType, customHydration) {
  const arch = CONFIG.archetypes[archetypeKey];
  const range = arch.hydrationRange[skillLevel];
  let hydration = (range[0] + range[1]) / 2;

  // Hot kitchen → drop hydration slightly for handleability
  if (tempBand === 'hot') hydration -= 2;
  if (tempBand === 'cold') hydration += 1;

  // Adjust for flour absorption
  const flour = CONFIG.flourTypes[flourType] || CONFIG.flourTypes.bread_flour;
  hydration *= flour.absorptionMult;

  // Cap by skill
  hydration = Math.min(hydration, CONFIG.hydrationCap[skillLevel]);

  // User override
  if (customHydration && customHydration >= 50 && customHydration <= 100) {
    hydration = customHydration;
  }

  return Math.round(hydration);
}

/**
 * Build the ingredient list from baker's percentages.
 * Total dough weight is the user's target, distributed back to flour=100%.
 */
export function buildFormula(inputs) {
  const { archetypeKey, skillLevel, tempBand, flourType, totalDoughGrams, loaves, totalHours, customHydration, ferment, wholeWheatPct } = inputs;
  const arch = CONFIG.archetypes[archetypeKey];

  const hydration = decideHydration(archetypeKey, skillLevel, tempBand, flourType, customHydration);
  const inocRegime = pickInocRegime(totalHours);
  const inocPct = CONFIG.inoculation[inocRegime][skillLevel];
  const saltPct = CONFIG.salt[archetypeKey] || CONFIG.salt.default;

  // Enrichments
  const enrich = arch.enrichments || {};
  const butterPct = enrich.butter_pct || 0;
  const oilPct = enrich.oil_pct || 0;
  const sugarPct = enrich.sugar_pct || 0;
  const milkSwapPct = enrich.milk_swap_pct || 0;

  // Sum of all percentages (relative to flour=100)
  // dough_weight = flour * (1 + hydration/100 + salt/100 + inoc/100 + enrichments...)
  // But starter contains both flour & water — for simplicity treat starter as a separate
  // ingredient (common home-baker convention).
  const totalPctSum = 100 + hydration + saltPct + inocPct + butterPct + oilPct + sugarPct;
  const flourTotal = (totalDoughGrams * loaves) / (totalPctSum / 100);

  const water = (hydration / 100) * flourTotal;
  const starter = (inocPct / 100) * flourTotal;
  const salt = (saltPct / 100) * flourTotal;
  const butter = (butterPct / 100) * flourTotal;
  const oil = (oilPct / 100) * flourTotal;
  const sugar = (sugarPct / 100) * flourTotal;

  // Flour split
  const wwGrams = (wholeWheatPct / 100) * flourTotal;
  const mainFlour = flourTotal - wwGrams;

  // Milk swap
  let milk = 0;
  let waterFinal = water;
  if (milkSwapPct > 0) {
    milk = water * (milkSwapPct / 100);
    waterFinal = water - milk;
  }

  return {
    hydration,
    inocPct,
    saltPct,
    inocRegime,
    flourTotal: Math.round(flourTotal),
    mainFlour: Math.round(mainFlour),
    wholeWheat: Math.round(wwGrams),
    water: Math.round(waterFinal),
    milk: Math.round(milk),
    starter: Math.round(starter),
    salt: Math.round(salt * 10) / 10,
    butter: Math.round(butter),
    oil: Math.round(oil),
    sugar: Math.round(sugar),
    archetypeKey,
    archetype: arch,
    flourType,
    totalDough: totalDoughGrams * loaves,
    loaves,
  };
}

// =============================================================
// SCHEDULE GENERATION
// =============================================================

function fmtTime(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function aOrAn(word) {
  // Article based on first sound. 'open', 'open-crumb' → 'an'. Bypass the 'u' edge cases (universal) — none of our archetype labels start with that.
  return /^[aeiouAEIOU]/.test(word.trim()) ? 'an' : 'a';
}

function addHours(d, h) {
  return new Date(d.getTime() + h * 3600 * 1000);
}

/**
 * Quiet hours helpers. Takes 'HH:MM' strings; returns minutes-from-midnight.
 * The window is allowed to wrap midnight (e.g. 23:00–06:00).
 */
function parseHHMM(str) {
  if (!str || typeof str !== 'string') return null;
  const [h, m] = str.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function inQuietWindow(date, quiet) {
  if (!quiet) return false;
  const start = parseHHMM(quiet.start);
  const end = parseHHMM(quiet.end);
  if (start == null || end == null) return false;
  const t = date.getHours() * 60 + date.getMinutes();
  // Same-day window (e.g. 13:00–15:00)
  if (start < end) return t >= start && t < end;
  // Wrapping window (e.g. 23:00–06:00)
  return t >= start || t < end;
}

/**
 * If `date` lands inside the quiet window, push it to the end of that window.
 * Returns a new Date.
 */
function shiftOutOfQuiet(date, quiet) {
  if (!quiet || !inQuietWindow(date, quiet)) return date;
  const end = parseHHMM(quiet.end);
  const out = new Date(date);
  // If current time-of-day is before `end`, the end is later today.
  // Otherwise (wrapping case, currently after start), end is tomorrow.
  const t = date.getHours() * 60 + date.getMinutes();
  const start = parseHHMM(quiet.start);
  if (start != null && end != null && start > end && t >= start) {
    // Wrapping case, e.g. 23:00–06:00 and we're at 23:30 → end is next day 06:00
    out.setDate(out.getDate() + 1);
  }
  out.setHours(Math.floor(end / 60), end % 60, 0, 0);
  return out;
}

/**
 * Friendly duration formatting for sensory cues.
 *   23 → "23 min"
 *   60 → "1 hour"
 *   90 → "1.5 hours"
 *   118 → "2 hours"
 *   150 → "2.5 hours"
 * Rounds to the nearest half hour above 60.
 */
function fmtDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const halves = Math.round(minutes / 30); // count in half-hour increments
  const hours = halves / 2;
  if (hours === 1) return '1 hour';
  // Strip trailing .0 so 2.0 → "2 hours"
  const text = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
  return `${text} hours`;
}

function fmtHHMM(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function addMinutes(d, m) {
  return new Date(d.getTime() + m * 60 * 1000);
}

/**
 * Generate the full schedule, working BACKWARDS from the bake-out time.
 */
export function buildSchedule(inputs, formula) {
  const { skillLevel, tempBand, activeMinutes, finishAt, totalHours, archetypeKey, hasLevain, quietHours } = inputs;

  const tempInfo = CONFIG.tempBands[tempBand];
  const doughTempC = tempInfo.tempC + tempInfo.doughOffset;

  // Predicted bulk hours
  const arch = CONFIG.archetypes[archetypeKey];
  const hasEnrichments = !!(arch.enrichments && Object.keys(arch.enrichments).length);
  const bulkHours = computeBulkHours(formula.inocPct, doughTempC, hasEnrichments);

  // Active budget
  const budgetKey = pickActiveBudget(activeMinutes);
  const budget = CONFIG.activeBudgets[budgetKey];
  const foldCount = budget.foldCount;

  // Decide retard duration. totalHours is the full span from levain feed to
  // out of oven. The fixed components are:
  //   levain build (5h)
  //   mix block (~0.5h — includes brief autolyse / rest)
  //   bulk fermentation (computed)
  //   shaping cushion (~0.5h)
  //   bake (~bakeTimeMin/60h, includes preheat which overlaps with retard end)
  // If the user already has a ripe levain ready to use, the 5h build window is
  // collapsed to a quick "prep starter" check (~10 min) right before mixing.
  const levainHours = hasLevain ? 0 : 5;
  const mixHours = 0.5;
  const shapeCushionHours = 0.5;
  const bakeHours = arch.bakeTimeMin / 60;
  const fixedHours = levainHours + mixHours + bulkHours + shapeCushionHours + bakeHours;
  let retardHours = totalHours - fixedHours;
  retardHours = Math.max(0, Math.min(48, retardHours));

  // If retard >= 6h, do a "shape then cold retard" plan; else "shape then short bench-proof"
  const useColdRetard = retardHours >= 6;

  // Bake out time = finishAt
  const bakeStart = addMinutes(finishAt, -arch.bakeTimeMin);
  // Preheat 45 min before bake
  const preheatStart = addMinutes(bakeStart, -45);

  // Shape happens just before retard (or just before bake if no retard)
  // If using cold retard:
  //    shape_time = bake_start - retard_hours
  // If not:
  //    shape_time = bake_start - bench_proof (1h)
  const shapeTime = useColdRetard
    ? addHours(bakeStart, -retardHours)
    : addMinutes(bakeStart, -60);

  // Bulk start = shape - bulk_hours
  const bulkStart = addHours(shapeTime, -bulkHours);
  // Mix is 5–15 min before bulk
  const mixStart = addMinutes(bulkStart, -10);
  // Levain feed is 4–6 hours before mix — unless the user already has a ripe
  // levain, in which case we just use a brief check 10 min before mix.
  const levainStart = hasLevain
    ? addMinutes(mixStart, -10)
    : addHours(mixStart, -5);

  // Generate fold timestamps within bulk window
  const foldTimes = [];
  const foldShifts = []; // {original, shifted} for any fold pushed out of quiet hours
  if (foldCount > 0) {
    // Front-load folds: first fold ~30 min after mix, then every (bulk_hours - 1)/foldCount
    const foldWindow = bulkHours * 0.6 * 60; // first 60% of bulk in minutes
    const interval = foldWindow / foldCount;
    const bulkEnd = addHours(bulkStart, bulkHours);
    // Folds must always land before shaping starts (which marks the end of bulk).
    const foldCeilingTime = Math.min(bulkEnd.getTime(), shapeTime.getTime()) - 5 * 60 * 1000;
    for (let i = 0; i < foldCount; i++) {
      const planned = addMinutes(bulkStart, 30 + i * interval);
      let shifted = shiftOutOfQuiet(planned, quietHours);
      // Never push a fold past the end of bulk or into shaping
      if (shifted.getTime() > foldCeilingTime) {
        shifted = new Date(foldCeilingTime);
      }
      if (shifted.getTime() !== planned.getTime()) {
        foldShifts.push({ index: i, original: planned, shifted });
      }
      foldTimes.push(shifted);
    }
    // De-dup consecutive folds that ended up clustered after shifting.
    // If we hit the ceiling, drop the extra folds rather than push them past shaping.
    for (let i = 1; i < foldTimes.length; i++) {
      if (foldTimes[i].getTime() - foldTimes[i - 1].getTime() < 10 * 60 * 1000) {
        const nudged = foldTimes[i - 1].getTime() + 10 * 60 * 1000;
        if (nudged > foldCeilingTime) {
          // No room left: trim this and any subsequent folds.
          foldTimes.length = i;
          break;
        }
        foldTimes[i] = new Date(nudged);
      }
    }
  }

  // Assemble schedule
  const steps = [];

  if (hasLevain) {
    // User already has a ripe levain. Quick readiness check just before mixing.
    steps.push({
      type: 'active',
      time: levainStart,
      timeStr: fmtTime(levainStart),
      durationMin: 5,
      title: 'Check your levain is ripe',
      description: `You said your levain is already built. Confirm it has roughly doubled, smells tangy-sweet, and passes the float test. You'll use ${Math.round(formula.starter)}g for this dough.`,
      cue: 'If it has collapsed or smells sharply alcoholic, feed it once more and start when ready (add ~4h).',
      icon: 'starter',
    });
  } else {
    steps.push({
      type: 'active',
      time: levainStart,
      timeStr: fmtTime(levainStart),
      durationMin: 5,
      title: 'Feed your starter (levain build)',
      description: hasEnrichments
        ? `Feed ${Math.round(formula.starter * 0.5)}g starter with ${Math.round(formula.starter * 0.5)}g flour and ${Math.round(formula.starter * 0.5)}g water at room temp. It should peak in 4–6 hours.`
        : `Mix ${Math.round(formula.starter * 0.5)}g of your active starter with ${Math.round(formula.starter * 0.5)}g flour and ${Math.round(formula.starter * 0.5)}g water. Cover and let it rise until domed and bubbly (about 4–6h depending on warmth).`,
      cue: 'Ready when it has roughly doubled, smells tangy-sweet, and floats in water.',
      icon: 'starter',
    });
  }

  steps.push({
    type: 'active',
    time: mixStart,
    timeStr: fmtTime(mixStart),
    durationMin: budget.mixStyle === 'short_intensive' ? 12 : 8,
    title: 'Mix the dough',
    description: buildMixDescription(formula, budget, arch),
    cue: 'Dough should hold together as a shaggy mass with no dry flour visible.',
    icon: 'mix',
  });

  // Folds
  const actualFoldCount = foldTimes.length;
  foldTimes.forEach((ft, i) => {
    const isLast = i === actualFoldCount - 1;
    const nextGapMin = isLast
      ? Math.round((bulkStart.getTime() + bulkHours * 60 * 60 * 1000 - ft.getTime()) / 60000)
      : Math.round((foldTimes[i + 1].getTime() - ft.getTime()) / 60000);

    const beforeCue = i === 0
      ? 'Dough still feels slack. Folds will tighten it.'
      : isLast
      ? 'Dough should now feel smooth, jiggly, and resist your hand slightly.'
      : 'You should feel the dough getting stronger with each fold.';

    const afterCue = isLast
      ? `Cover and let it rest undisturbed for the remaining ${fmtDuration(nextGapMin)} of bulk. The dough should develop body, gas pockets, and a domed top.`
      : `In about ${fmtDuration(nextGapMin)} the dough should feel ${i === 0 ? 'noticeably tighter and a touch jigglier' : 'smoother, more elastic, with small bubbles showing on the surface'}. That's your signal it's ready for the next fold.`;

    steps.push({
      type: 'active',
      time: ft,
      timeStr: fmtTime(ft),
      durationMin: 3,
      title: `Coil fold #${i + 1} of ${actualFoldCount}`,
      description: 'With wet hands, lift the underside of the dough and let it fold under itself. Rotate the bowl 90° and repeat 3 more times. Cover and rest.',
      cue: beforeCue,
      afterCue,
      icon: 'fold',
    });
  });

  // Bulk fermentation passive marker
  const bulkEndTime = addHours(bulkStart, bulkHours);
  steps.push({
    type: 'passive',
    time: bulkStart,
    timeStr: fmtTime(bulkStart),
    durationMin: bulkHours * 60,
    title: `Bulk fermentation (${bulkHours.toFixed(1)} hours total)`,
    description: `Cover and leave at room temperature (${tempInfo.label}). Predicted ferment time: ~${bulkHours.toFixed(1)} hours based on your inoculation (${formula.inocPct}%) and kitchen temp.`,
    cue: `Look for a ~${CONFIG.fermentation.bulkRiseTargetPct[skillLevel]}% rise, smooth domed surface, gas bubbles visible at the edges, and a slight jiggle when you tap the bowl.`,
    icon: 'bulk',
    endTime: bulkEndTime,
  });

  // Shaping
  steps.push({
    type: 'active',
    time: shapeTime,
    timeStr: fmtTime(shapeTime),
    durationMin: skillLevel === 'beginner' ? 10 : 8,
    title: useColdRetard ? 'Pre-shape, rest, shape & into the fridge' : 'Pre-shape, rest, shape & bench-proof',
    description: buildShapeDescription(arch, skillLevel),
    cue: useColdRetard
      ? 'Once shaped, place seam-up in a floured banneton, cover, and refrigerate.'
      : 'Once shaped, leave at room temp seam-up in a floured banneton or proofing basket.',
    icon: 'shape',
  });

  // Retard / proof passive
  if (useColdRetard) {
    steps.push({
      type: 'passive',
      time: shapeTime,
      timeStr: fmtTime(shapeTime),
      durationMin: retardHours * 60,
      title: `Cold retard (${retardHours.toFixed(1)} hours)`,
      description: 'Dough rests in the fridge. This builds flavor, makes scoring easier, and gives you scheduling flexibility.',
      cue: 'Dough should feel firm and slightly puffy when you press it. A gentle finger poke springs back slowly.',
      icon: 'retard',
      endTime: bakeStart,
    });
  } else {
    steps.push({
      type: 'passive',
      time: shapeTime,
      timeStr: fmtTime(shapeTime),
      durationMin: 60,
      title: 'Bench proof (1 hour)',
      description: `Final rise at room temp (${tempInfo.label}).`,
      cue: 'Poke test: a gentle finger poke should spring back slowly, leaving a slight indent.',
      icon: 'proof',
      endTime: bakeStart,
    });
  }

  // Preheat — passive (oven does the work; flag the start as 2 min hands-on)
  steps.push({
    type: 'passive',
    time: preheatStart,
    timeStr: fmtTime(preheatStart),
    durationMin: 45,
    title: `Preheat oven to ${arch.bakeTempC}°C (${Math.round(arch.bakeTempC * 9/5 + 32)}°F)`,
    description: arch.bakeStyle === 'dutch_oven'
      ? 'Place your Dutch oven inside while the oven preheats. Give it a full 45 minutes to get screaming hot.'
      : arch.bakeStyle === 'tray'
      ? 'No special preheat needed beyond the oven.'
      : 'Place a baking stone or steel inside while the oven preheats.',
    cue: 'A roaring hot oven (and Dutch oven) is essential for oven spring.',
    icon: 'preheat',
  });

  // Score & load — active (5 min of hands-on at start of bake window)
  steps.push({
    type: 'active',
    time: bakeStart,
    timeStr: fmtTime(bakeStart),
    durationMin: 5,
    title: `Score and load into oven`,
    description: buildBakeDescription(arch, skillLevel),
    cue: 'Score with confidence. One decisive cut. Hesitation makes ragged scores.',
    icon: 'bake',
  });

  // Bake — passive
  steps.push({
    type: 'passive',
    time: addMinutes(bakeStart, 5),
    timeStr: fmtTime(addMinutes(bakeStart, 5)),
    durationMin: arch.bakeTimeMin - 5,
    title: `Bake (${arch.bakeTimeMin} minutes total)`,
    description: arch.bakeStyle === 'dutch_oven'
      ? `${Math.round(arch.bakeTimeMin * 0.4)} min covered, then ${Math.round(arch.bakeTimeMin * 0.6)} min uncovered for crust development. Don't peek before removing the lid.`
      : `Bake until deep golden-brown all over. Rotate the tray halfway if your oven runs uneven.`,
    cue: 'Listen for the crackling "song" of the crust as it cools. That\'s the sound of success.',
    icon: 'bake',
  });

  // Out
  steps.push({
    type: 'active',
    time: finishAt,
    timeStr: fmtTime(finishAt),
    durationMin: 1,
    title: 'Out of the oven',
    description: 'Transfer to a wire rack. Wait at least 1 hour before slicing, while the crumb is still setting.',
    cue: 'Internal temp should read ~96–99°C (205–210°F).',
    icon: 'done',
  });

  // Sort steps chronologically. Without this, passive markers (e.g. bulk
  // fermentation) end up after the folds even though they start before them,
  // because folds are pushed onto the array first.
  steps.sort((a, b) => a.time - b.time);

  // Total active time used
  const activeMinutesUsed = steps
    .filter((s) => s.type === 'active')
    .reduce((sum, s) => sum + s.durationMin, 0);

  // Sanity warnings
  const warnings = [];
  if (activeMinutesUsed > activeMinutes + 10) {
    warnings.push({
      severity: 'high',
      suggestion: true,
      text: `This plan needs ~${activeMinutesUsed} minutes of active time, but you said you only have ${activeMinutes}. Consider switching to a lower-touch profile or extending the timeline.`,
    });
  }
  if (totalHours < 10 && tempBand === 'cold') {
    warnings.push({
      severity: 'medium',
      text: 'Short timeline + cold kitchen is tricky. Consider warming a spot for the dough (top of fridge, oven with light on) or extending the schedule.',
    });
  }
  if (totalHours > 36 && formula.inocPct > 15) {
    warnings.push({
      severity: 'medium',
      text: 'Long schedule with high inoculation. Risk of over-fermentation. Consider lowering starter % or starting later.',
    });
  }
  if (formula.hydration > 80 && skillLevel === 'beginner') {
    warnings.push({
      severity: 'medium',
      text: 'High hydration is harder to handle. Make sure your hands are wet when folding, and use a bench scraper for shaping.',
    });
  }

  // Quiet hours warnings
  if (quietHours) {
    const qStart = parseHHMM(quietHours.start);
    const qEnd = parseHHMM(quietHours.end);
    const qLabel = (qStart != null && qEnd != null)
      ? `${fmtHHMM(qStart)} to ${fmtHHMM(qEnd)}`
      : 'your quiet hours';

    if (foldShifts.length) {
      const kept = foldShifts.filter((f) => f.index < foldTimes.length);
      const dropped = foldShifts.filter((f) => f.index >= foldTimes.length);
      if (kept.length) {
        const which = kept.map((f) => `#${f.index + 1}`).join(', ');
        warnings.push({
          severity: 'low',
          text: `Coil fold ${which} would have landed inside your quiet hours (${qLabel}), so it's been nudged to just after you wake up. The dough is forgiving, this is fine.`,
        });
      }
      if (dropped.length) {
        warnings.push({
          severity: 'medium',
          text: `${dropped.length} ${dropped.length === 1 ? 'fold was' : 'folds were'} dropped because there wasn't room before shaping. The remaining folds plus a vigorous initial mix should still build enough strength.`,
        });
      }
    }

    const majorChecks = [
      { label: 'Mixing the dough', date: mixStart },
      { label: useColdRetard ? 'Shaping and into the fridge' : 'Shaping', date: shapeTime },
      { label: 'Preheat / loading the oven', date: preheatStart },
      { label: 'Out of the oven', date: finishAt },
    ];
    if (!hasLevain) majorChecks.push({ label: 'Feeding your starter', date: levainStart });

    const conflicts = majorChecks.filter((c) => inQuietWindow(c.date, quietHours));
    if (conflicts.length) {
      const list = conflicts.map((c) => `${c.label} at ${fmtTime(c.date)}`).join('; ');
      warnings.push({
        severity: 'high',
        suggestion: true,
        text: `These steps fall inside your quiet hours (${qLabel}): ${list}. Try shifting your bake-out time, or disable quiet hours if you can stay up for this one.`,
      });
    }
  }

  return {
    steps,
    formula,
    bulkHours,
    retardHours,
    useColdRetard,
    activeMinutesUsed,
    activeBudget: budget,
    warnings,
    timeline: {
      levainStart,
      mixStart,
      bulkStart,
      bulkEndTime,
      shapeTime,
      bakeStart,
      finishAt,
    },
  };
}

// =============================================================
// DESCRIPTION BUILDERS
// =============================================================

function buildMixDescription(formula, budget, arch) {
  const f = formula;
  const baseIngredients = `Combine ${f.mainFlour}g main flour${f.wholeWheat ? ` + ${f.wholeWheat}g whole wheat` : ''}, ${f.water}g water${f.milk ? ` + ${f.milk}g milk` : ''}, ${f.starter}g active starter, ${f.salt}g salt`;
  const enrich = [];
  if (f.butter) enrich.push(`${f.butter}g softened butter`);
  if (f.oil) enrich.push(`${f.oil}g oil`);
  if (f.sugar) enrich.push(`${f.sugar}g sugar`);
  const enrichStr = enrich.length ? `, ${enrich.join(', ')}` : '';

  if (budget.mixStyle === 'short_intensive') {
    return `${baseIngredients}${enrichStr}. Mix vigorously by hand for 8–10 minutes. This is your only structure-building step today, so be thorough. The dough should feel smooth and slightly tacky.`;
  } else if (budget.mixStyle === 'rubaud_or_slap') {
    return `${baseIngredients}${enrichStr}. Mix until just combined, rest 20 min (autolyse), then perform 5 minutes of slap-and-folds (or Rubaud mixing) for strong gluten development.`;
  } else {
    return `${baseIngredients}${enrichStr}. Mix until no dry flour remains, about 3–5 minutes. The dough will look shaggy; that's correct.`;
  }
}

function buildShapeDescription(arch, skillLevel) {
  const beginner = skillLevel === 'beginner';
  switch (arch.shaping) {
    case 'tin':
      return beginner
        ? 'Turn dough onto a lightly floured surface. Pat into a rectangle, fold like a letter (thirds), then roll up tightly into a log. Place seam-down in a greased loaf tin.'
        : 'Pre-shape into a rough log. Rest 20 min. Final-shape into a tight cylinder, place seam-down in a greased loaf tin.';
    case 'tin_or_batard':
      return 'Pre-shape into a round, rest 20 min, then shape into a batard (oval) or place in a loaf tin. Cover with a tea towel.';
    case 'boule_or_batard':
      return beginner
        ? 'Turn out gently, preserve the gas. Pre-shape into a loose round and rest 20 min. Then shape into a boule (round) by folding the dough over itself and rolling it tight against the bench. Place seam-up in a floured banneton.'
        : 'Pre-shape into a round, rest 20–30 min on the bench. Final-shape into a boule or batard with tension, taking care to seal the seam. Place seam-up in a floured banneton.';
    case 'rolls':
      return 'Divide dough into equal portions (8 for standard rolls). Shape each into a tight ball. Place close together in a greased pan or tray.';
    case 'balls':
      return 'Divide into 250–300g portions for individual pizzas. Shape each into a tight ball. Place in oiled containers, seam-down.';
    case 'pan_pour':
      return 'Pour dough into a well-oiled pan or tray. No shaping needed, let gravity do the work. Drizzle with oil on top.';
    case 'baguette':
      return 'Divide into 250–300g pieces. Pre-shape into rough logs, rest 20 min. Final-shape by rolling out into long baguettes (~40cm). Place on a floured couche or parchment.';
    default:
      return 'Pre-shape, rest 20 minutes, then final-shape with tension.';
  }
}

function buildBakeDescription(arch, skillLevel) {
  switch (arch.bakeStyle) {
    case 'dutch_oven':
      return `Score the top with a sharp blade or razor (one bold slash for beginners; an "ear" cut for advanced). Lower into the screaming-hot Dutch oven, cover, and bake covered for ${Math.round(arch.bakeTimeMin * 0.55)} min. Remove lid, drop oven to ${arch.bakeTempC - 15}°C, and bake another ${Math.round(arch.bakeTimeMin * 0.45)} min until deep amber.`;
    case 'covered_then_uncovered':
      return `Cover the loaf tin with foil for the first ${Math.round(arch.bakeTimeMin * 0.6)} min. Remove foil and bake ${Math.round(arch.bakeTimeMin * 0.4)} min more until golden.`;
    case 'tray':
      return `Brush with milk or egg wash if desired. Bake on a tray until golden and the bottom sounds hollow when tapped (~${arch.bakeTimeMin} min).`;
    case 'pizza_oven_or_steel':
      return 'Stretch dough to size, top, and slide onto a hot stone/steel. Bake until the crust is blistered and cheese is bubbling.';
    case 'oven_pan':
      return 'Dimple the surface with oiled fingers, sprinkle with flaky salt and herbs. Bake until deeply golden and crisp on the bottom.';
    case 'steam_oven':
      return 'Score with diagonal slashes. Add steam (a tray of boiling water below, or ice cubes onto a hot tray). Bake until the crust is crisp and dark amber.';
    default:
      return `Bake until golden brown, about ${arch.bakeTimeMin} minutes.`;
  }
}

// =============================================================
// MAIN ENTRY POINT
// =============================================================

/**
 * Compute physical minimum time required to bake an archetype, given temperature
 * and skill. This is the absolute floor: maximum inoculation, no cold retard,
 * minimum bench proof, fastest bulk possible at the dough's temperature.
 */
function computeMinHours(archetypeKey, skillLevel, tempBand, hasLevain) {
  const arch = CONFIG.archetypes[archetypeKey];
  const tempInfo = CONFIG.tempBands[tempBand];
  const doughTempC = tempInfo.tempC + tempInfo.doughOffset;

  // Use the highest reasonable inoculation for fastest bulk
  const maxInoc = CONFIG.inoculation.veryShort[skillLevel] || 25;
  const hasEnrichments = !!(arch.enrichments && Object.keys(arch.enrichments).length);
  const minBulk = computeBulkHours(maxInoc, doughTempC, hasEnrichments);

  // Levain build (5h) — required unless user has fed starter ready
  const levain = hasLevain ? 0 : 5;
  const mix = 10 / 60;          // 10 min
  const benchProof = 0.5;        // 30 min minimum
  const shape = 15 / 60;
  const preheat = 45 / 60;       // overlap allowed but include
  const bake = arch.bakeTimeMin / 60;

  // Mix and bulk overlap with preheat partially, but be conservative
  return levain + mix + minBulk + shape + benchProof + preheat + bake;
}

/**
 * Choose the ideal totalHours for an archetype if there were no time pressure.
 */
function idealTotalHours(archetypeKey, skillLevel, activeMinutes, hasLevain) {
  let h;
  switch (archetypeKey) {
    case 'pizza': h = 28; break;
    case 'focaccia': h = 22; break;
    case 'rolls': h = 18; break;
    case 'baguette': h = 22; break;
    default: h = skillLevel === 'beginner' ? 22 : 24;
  }
  if (activeMinutes <= 20) h = Math.max(h, 24);
  // If the levain is already ripe and ready, drop the ~4h levain wait from the ideal span.
  if (hasLevain) h = Math.max(h - 4, 8);
  return h;
}

/**
 * Fit a plan into the available window [now, finishAt].
 * Returns { totalHours, feasible, earliestFinishAt, compressed, compressionNotes }.
 *
 * Strategy when the ideal schedule doesn't fit:
 *   1. Shrink cold retard (most flexibility, 0–24h)
 *   2. Use a shorter inoculation regime (higher starter %) to speed bulk
 *   3. If still infeasible: report earliest finish.
 */
function fitToWindow({ now, finishAt, archetypeKey, skillLevel, tempBand, activeMinutes, hasLevain }) {
  const availableHours = Math.max(0, (finishAt - now) / 3600000);
  const ideal = idealTotalHours(archetypeKey, skillLevel, activeMinutes, hasLevain);
  const minHours = computeMinHours(archetypeKey, skillLevel, tempBand, hasLevain);

  if (availableHours >= ideal - 0.25) {
    // Plenty of time — use ideal
    return {
      totalHours: ideal,
      idealHours: ideal,
      minHours,
      availableHours,
      feasible: true,
      compressed: false,
      compressionNotes: [],
    };
  }

  if (availableHours < minHours) {
    // Not feasible — bake can't physically happen in the window.
    // Round the earliest finish up to the next 5-minute boundary and add a
    // small buffer so the levain feed comfortably starts after "now".
    const bufferMs = 15 * 60 * 1000;
    const rawEarliest = now.getTime() + minHours * 3600 * 1000 + bufferMs;
    const fiveMin = 5 * 60 * 1000;
    const earliestFinishAt = new Date(Math.ceil(rawEarliest / fiveMin) * fiveMin);
    const totalHoursActual = (earliestFinishAt - now) / 3600000;
    return {
      totalHours: totalHoursActual,
      idealHours: ideal,
      minHours,
      availableHours,
      feasible: false,
      earliestFinishAt,
      compressed: true,
      compressionNotes: [
        `You need at least ${minHours.toFixed(1)} hours from now to bake ${aOrAn(CONFIG.archetypes[archetypeKey].label)} ${CONFIG.archetypes[archetypeKey].label.toLowerCase()} at this temperature. The earliest you can pull bread from the oven is ${fmtTime(earliestFinishAt)}.`,
      ],
    };
  }

  // Feasible but compressed — use availableHours, schedule will use a higher
  // inoculation (shorter regime) and minimal/no cold retard.
  const compressionNotes = [];
  const tightnessHours = ideal - availableHours;
  if (tightnessHours > 6) {
    compressionNotes.push(`Compressed plan: you have ${availableHours.toFixed(1)} hours, but a relaxed schedule for this loaf would normally use ~${ideal} hours. We're using a higher starter percentage and skipping (or shortening) the cold retard to fit your window.`);
  } else {
    compressionNotes.push(`Tight schedule: you have ${availableHours.toFixed(1)} hours. We're shortening the cold retard to fit, but the dough still has plenty of time to develop flavor.`);
  }

  return {
    totalHours: availableHours,
    idealHours: ideal,
    minHours,
    availableHours,
    feasible: true,
    compressed: true,
    compressionNotes,
  };
}

/**
 * Suggest the most realistic active-time budget for an archetype, given the
 * user's declared minutes. Returns { suggestedKey, suggestedMinutes, reason }
 * if a different bucket would be more realistic; otherwise null.
 */
function suggestActiveBudget(activeMinutes, archetypeKey, skillLevel) {
  const arch = CONFIG.archetypes[archetypeKey];

  // Some archetypes have inherent active-time floors (focaccia is hands-off,
  // baguettes need shaping work, open-crumb wants folds at any skill).
  const archMin = {
    sandwich: 18,
    toast: 18,
    open_crumb: 28,        // needs at least some folds
    rolls: 25,             // shaping each roll takes time
    pizza: 20,
    focaccia: 15,
    baguette: 35,          // long shaping + scoring
  };
  const floor = archMin[archetypeKey] || 20;

  if (activeMinutes < floor) {
    // User asked for less than the archetype realistically needs
    let suggestedKey = 'standard';
    if (floor <= 20) suggestedKey = 'very_low';
    else if (floor <= 30) suggestedKey = 'low';
    else if (floor <= 45) suggestedKey = 'standard';
    else suggestedKey = 'high';

    return {
      suggestedKey,
      suggestedMinutes: floor,
      currentMinutes: activeMinutes,
      reason: `${arch.label} realistically needs at least ~${floor} minutes of active handling (mixing, shaping, scoring). The closest fit is the "${CONFIG.activeBudgets[suggestedKey].label}" budget.`,
    };
  }

  // If the user picked "high engagement" but the archetype is genuinely simple,
  // don't override — the extra folds won't hurt. Only escalate, never downsell.
  return null;
}

/**
 * Take user inputs and return the full plan.
 */
export function generatePlan(userInputs) {
  // Anchor the plan to a reference "now". Defaults to the current moment so
  // the schedule always starts in the future relative to the planning time.
  const now = userInputs.now ? new Date(userInputs.now) : new Date();
  const finishAt = new Date(userInputs.finishAt);

  // Normalize inputs
  const inputs = {
    archetypeKey: userInputs.archetype,
    skillLevel: userInputs.skill,
    tempBand: userInputs.tempBand,
    flourType: userInputs.flourType || 'bread_flour',
    wholeWheatPct: userInputs.wholeWheatPct || 0,
    totalDoughGrams: userInputs.doughPerLoafGrams || 900,
    loaves: userInputs.loaves || 1,
    activeMinutes: userInputs.activeMinutes,
    hasLevain: !!userInputs.hasLevain,
    finishAt,
    now,
    customHydration: userInputs.customHydration,
    quietHours: userInputs.quietHours || null,
  };

  // Active-time realism check
  const activeSuggestion = suggestActiveBudget(
    inputs.activeMinutes,
    inputs.archetypeKey,
    inputs.skillLevel,
  );

  // Fit the plan into [now, finishAt]
  const fit = fitToWindow({
    now,
    finishAt,
    archetypeKey: inputs.archetypeKey,
    skillLevel: inputs.skillLevel,
    tempBand: inputs.tempBand,
    activeMinutes: inputs.activeMinutes,
    hasLevain: inputs.hasLevain,
  });

  // If the user's requested finishAt is physically impossible, build the
  // schedule backwards from the earliest feasible finish instead. We surface
  // both the original target and the achievable target in the plan output
  // so the user sees exactly what changed.
  if (!fit.feasible) {
    inputs.requestedFinishAt = finishAt;
    inputs.finishAt = fit.earliestFinishAt;
  }

  inputs.totalHours = fit.totalHours;

  // Build formula (uses totalHours to pick inoculation regime)
  const formula = buildFormula(inputs);

  // Build schedule (works backwards from finishAt, anchored to now)
  const plan = buildSchedule(inputs, formula);

  // Attach window/feasibility info
  plan.now = now;
  plan.windowFit = fit;
  plan.activeSuggestion = activeSuggestion;
  plan.requestedFinishAt = inputs.requestedFinishAt || null;

  // Fold compression notes into the warnings stream so they're visible to the user.
  if (fit.compressionNotes && fit.compressionNotes.length) {
    fit.compressionNotes.forEach((text) => {
      plan.warnings.unshift({ severity: fit.feasible ? 'medium' : 'high', text });
    });
  }

  // Active-budget mismatch — surface a clear, actionable suggestion.
  if (activeSuggestion) {
    plan.warnings.unshift({
      severity: 'medium',
      text: activeSuggestion.reason,
      suggestion: activeSuggestion,
    });
  }

  // Final guardrail: if the schedule still starts in the past after fitting
  // (shouldn't happen, but defensive), report the earliest feasible finish.
  if (plan.timeline.levainStart < now) {
    const offsetMin = Math.round((now - plan.timeline.levainStart) / 60000);
    plan.warnings.unshift({
      severity: 'high',
      text: `This plan would have started ${offsetMin >= 60 ? Math.round(offsetMin/60) + ' hours' : offsetMin + ' minutes'} ago. The earliest you can finish from a fresh start now is ${fmtTime(new Date(now.getTime() + fit.minHours * 3600000))}.`,
    });
  }

  // Annotate the plan with explanation strings (transparent reasoning)
  plan.reasoning = buildReasoning(inputs, formula, plan);

  return plan;
}

function buildReasoning(inputs, formula, plan) {
  const arch = CONFIG.archetypes[inputs.archetypeKey];
  const tempInfo = CONFIG.tempBands[inputs.tempBand];
  return [
    `**Hydration ${formula.hydration}%**: chosen for ${aOrAn(arch.label)} ${arch.label.toLowerCase()} at ${inputs.skillLevel} skill level. The dataset shows scores drop sharply above 75% hydration, so we stay in a forgiving range.`,
    `**Inoculation ${formula.inocPct}%**: for a ${inputs.totalHours.toFixed(1)}-hour timeline (${plan.formula.inocRegime} regime), this gives controlled fermentation without rushing.`,
    `**Salt ${formula.saltPct}%**: dataset standard for reliable structure and flavor.`,
    `**Bulk ${plan.bulkHours.toFixed(1)} hours @ ${tempInfo.label}**: predicted from inoculation × dough temperature. The 207-recipe analysis shows ~5.5h is the sweet spot at room temperature.`,
    plan.useColdRetard
      ? `**Cold retard ${plan.retardHours.toFixed(1)} hours**: 12–14h is the dataset sweet spot. It builds flavor, makes scoring easier, and gives you scheduling flexibility.`
      : `**Bench proof 1 hour**: short timeline means we skip the fridge. The poke test is your guide.`,
    `**${plan.activeBudget.foldCount} folds**: matched to your ${plan.activeBudget.label.toLowerCase()} budget. ${plan.activeBudget.foldCount === 0 ? 'No folds, strength comes from a vigorous initial mix and the long fermentation.' : 'Spread through the first 60% of bulk for even gluten development.'}`,
  ];
}
