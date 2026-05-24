# Methodology

Crumb is based on a private analysis of 207 sourdough recipes, methods, and community signals. The goal was not to reproduce any single recipe. The goal was to identify the ranges that make a sourdough bake more forgiving for home bakers, then turn those ranges into an interactive planning engine.

The raw dataset is intentionally excluded from this repository. It contains derived observations from public recipe pages, videos, books, and community discussions. Publishing the app logic and aggregate methodology gives reviewers enough context to evaluate the project without redistributing third-party content.

## Research Question

The core question was:

> What combination of hydration, inoculation, fermentation timing, temperature, handling effort, and cold retard produces a high-probability sourdough outcome for a home baker?

Crumb defines "failproof" as:

- Forgiving for beginner or intermediate handling.
- Resilient to common home-kitchen temperature variation.
- Clear enough to execute without expert intuition.
- Able to fit around real schedules.
- Likely to produce good structure, flavor, and bake quality on the first attempt.

## Source Categories

The private analysis reviewed public examples across several source types:

- Established baking blogs and recipe sites.
- YouTube sourdough methods.
- Bakery-style country loaf methods.
- Beginner-focused sourdough guides.
- Community forum posts and bake reports.
- Comment sections and user feedback signals where available.

The app references source categories and selected public names in the page, but does not publish copied recipe text or raw community comments.

## Extracted Variables

Each recipe or method was normalized into comparable fields where available:

- Bread type or use case.
- Hydration percentage.
- Starter/inoculation percentage.
- Salt percentage.
- Flour mix and whole-grain percentage.
- Bulk fermentation time.
- Ambient or dough temperature.
- Cold retard duration.
- Fold count and handling style.
- Total timeline.
- Active handling burden.
- Skill level implied by the method.
- Reported user friction, failures, or positive outcomes.

Not every source contained every field. Missing values were handled by excluding that field from the relevant aggregate rather than inventing precision.

## Failproof Score

The analysis used a composite "failproof score" to compare methods. It was designed as a practical product heuristic, not as a scientific claim.

The score favored recipes that showed:

- Repeatable results across home bakers.
- Moderate hydration rather than extreme open-crumb hydration.
- Clear fermentation cues.
- Realistic handling requirements.
- Temperature-aware guidance.
- A cold retard window that improved flavor and scheduling flexibility.
- Positive user sentiment and fewer reported failure modes.

The score penalized recipes that depended heavily on expert shaping, very high hydration, vague fermentation timing, hot uncontrolled fermentation, or demanding active handling.

## Aggregate Findings

The engine uses these aggregate findings as defaults and guardrails:

- Around 69% hydration performed strongly across reliable beginner and intermediate formulas.
- Hydration above roughly 75% became less forgiving for beginners, especially with weak flour or warm kitchens.
- Around 20% inoculation worked well for a room-temperature schedule in the 22-24 hour range.
- Around 5.5 hours of bulk fermentation at roughly 23-24 C was a useful room-temperature reference point.
- A 12-14 hour cold retard improved scheduling flexibility, scoring ease, and flavor for many loaf styles.
- Salt clustered around 2% for most lean sourdough formulas.
- Simpler, lower-touch recipes often performed better for beginners than advanced open-crumb methods.

These findings are encoded as ranges and heuristics, not as one fixed recipe.

## Planning Model

Crumb turns user inputs into a bake plan in four stages.

### 1. Select a Bread Archetype

Each archetype defines its target dough character:

- Hydration range by skill level.
- Salt percentage.
- Flour guidance.
- Enrichment rules where relevant.
- Shaping style.
- Bake style, temperature, and duration.
- Sensory cues.

This lets Crumb adapt the formula for a sandwich loaf, country loaf, focaccia, pizza dough, rolls, toast loaf, or baguette without pretending they share one ideal formula.

### 2. Build the Formula

The formula is generated from baker's percentages:

- Total dough weight is derived from loaf count and dough-per-loaf target.
- Starter is modeled as 100% hydration.
- Flour, water, starter, salt, and optional enrichments are balanced to hit the target dough weight.
- Whole wheat and flour type adjust hydration recommendations.
- Skill level applies a hydration cap to avoid giving beginners a dough that is unnecessarily hard to handle.

### 3. Estimate Fermentation

Bulk fermentation starts from a reference case:

```text
reference bulk = 5.5 hours
reference inoculation = 20%
reference dough temperature = 24 C
```

The engine adjusts bulk time using:

```text
bulk hours = 5.5 * (20 / inoculation_pct) * 2 ^ ((24 - dough_temp_c) / 10)
```

This approximates the common Q10 fermentation rule: a 10 C increase roughly doubles fermentation rate, while a 10 C decrease roughly halves it. Enriched doughs receive an additional slowdown factor.

The result is clamped to avoid obviously unrealistic bulk estimates.

### 4. Fit the Schedule

The schedule is generated backwards from the requested finish time. Crumb estimates minimum and ideal windows, then fits:

- Levain build or ready-levain start.
- Mixing.
- Folds.
- Bulk fermentation.
- Pre-shape and bench rest.
- Final shaping.
- Cold retard or bench proof.
- Bake.

If the requested finish time is not physically plausible, the app surfaces the earliest feasible finish time rather than silently producing a schedule that starts in the past.

Quiet hours are applied to active steps so folds and shaping can be shifted away from sleep or work windows where possible.

## Warning System

Crumb adds warnings when a plan becomes risky:

- Too little active handling time for the chosen bread style.
- Very short timeline in a cold kitchen.
- Hot kitchen with a long schedule.
- High hydration for beginner skill level.
- Excessively long schedule with too much inoculation.
- Requested finish time earlier than the feasible bake window.

Warnings are meant to explain tradeoffs, not block the user.

## What Is Public In This Repo

This repository includes:

- The static app.
- The formula and scheduling engine.
- Aggregate methodology.
- Public-facing source categories and assumptions.

This repository does not include:

- Raw recipe rows.
- Scraped recipe content.
- Scraped comments.
- Private notes.
- Any third-party content copied from source pages.

## Limitations

Crumb is a planning assistant, not a lab fermentation model. It does not measure starter strength, flour protein, exact dough temperature, humidity, water hardness, shaping quality, oven spring, or user technique.

The fermentation model is intentionally simple and explainable. It is useful for generating practical schedules, but sensory cues still matter: dough rise, bubbles, elasticity, smell, poke test response, and surface tension should override the timer when they conflict.

## Future Improvements

Potential next steps:

- Add unit tests around formula balancing and schedule fitting.
- Add persisted user profiles for common kitchen temperature, flour, and loaf size.
- Add a calibration flow where users report actual bulk timing and Crumb adapts future plans.
- Add screenshots and a short product walkthrough GIF to the repository.
- Add anonymized aggregate charts without exposing the private dataset.

