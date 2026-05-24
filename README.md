# Sourdough Intelligence

A data-driven sourdough baking framework and scheduling calculator. Built for bakers who want a schedule that fits their day, not the other way around.

Live app: [vividcrumb.netlify.app](https://vividcrumb.netlify.app)

---

## Background

This project started in 2018, before LLMs were part of anyone's toolkit.

The original goal was simple: figure out which sourdough recipe gave a first-time baker the highest probability of success on the first attempt. To do this, I built a two-stage model:

1. **Multiple linear regression** across key recipe variables: hydration, fermentation time, flour type, inoculation rate, fold count, and bulk temperature.
2. **Sentiment analysis on YouTube comments** (IBM Watson NLP) to cross-reference which recipes correlated most with beginner success, and which ones consistently produced frustration or failure.

The output was a ranked shortlist of top 3 beginner recipes. I picked one, baked it, and it worked first try.

No LLMs. No fancy stack. Just R, IBM Watson NLP, and a probably unhealthy amount of time reading bread forums.

---

## The Dataset

The framework is built on **207 sourdough recipes** sourced from YouTube creators, food blogs, cookbooks, and community forums including:

- The Perfect Loaf, Joshua Weissman, Bake with Jack, Tartine, King Arthur Baking
- The Bread Code, Brian Lagerstrom, Foodbod, Pantry Mama, Farmhouse on Boone
- Reddit r/Sourdough, The Fresh Loaf forums, and 200+ more

Each recipe is scored by sentiment analysis on user feedback. Key findings from the dataset:

| Variable | Optimal Value | Notes |
|---|---|---|
| Hydration | 69% | Scores drop sharply above 75% |
| Inoculation | 20% | Sweet spot for a 22-24h room temp schedule |
| Bulk ferment | 5.5 hrs | At ~23°C / 73°F |
| Cold retard | 12-14 hrs | Builds flavour, adds scheduling flexibility |
| Beginner recipe score | 93.0 | Simple recipes (≤20 min active) vs advanced (76.7) |
| Salt | 2.0% | Universal across the dataset |

**Median failproof score across the full dataset: 92.4**

---

## How the Calculator Works

Most recipes hand you a fixed schedule and hope it fits your day. This calculator does the opposite.

You input:
- What you want to bake and when you want it out of the oven
- How much active time you have to handle the dough
- Your kitchen temperature and flour type
- Your skill level

The calculator works backwards from your finish time, selecting hydration, fold count, inoculation rate, and fermentation length to maximise your chance of a successful loaf.

### The six-step logic

1. **Pick a process archetype** — Sandwich, open-crumb, focaccia, pizza: each has its own hydration window, salt level, and shaping style.
2. **Match folds to your time** — 20 minutes? No folds, vigorous initial mix. An hour? Classic 3-fold pattern. Never more touch points than you can actually do.
3. **Set inoculation by timeline** — Short schedule = more starter (faster ferment). Long retard = less starter (controlled ferment). Pulled from a regime table validated against the dataset.
4. **Predict bulk from temperature** — Q10 ≈ 2: every 10°C swing roughly doubles or halves fermentation rate. Bulk hours are computed from dough temperature and inoculation, not from a fixed timer.
5. **Stay in the failproof zone** — The dataset shows scores drop sharply above 75% hydration and below 18°C bulk temp. Hydration and timing are capped and adjusted based on your skill level.
6. **Render a real schedule** — Timestamped touch-points fitted to your actual day. Every step labelled active or passive, with sensory cues so you know what to look for.

---

## Recent Work

The framework was recently expanded using **NVIDIA Nemotron 3 Super** to process the broader recipe dataset and refine scoring logic. The core regression model and sentiment cross-reference methodology remain the same; the newer model accelerated analysis at scale.

---

## Tech Stack

| Layer | Tools |
|---|---|
| Original modelling (2018) | R, IBM Watson NLP |
| Dataset expansion | NVIDIA Nemotron 3 Super |
| Frontend calculator | JavaScript / Netlify |

---

## Repository Structure

```
sourdough-intelligence/
├── data/               # Recipe dataset and scoring outputs
├── model/              # Regression model and sentiment scoring scripts
├── calculator/         # Scheduling calculator source
└── README.md
```

---

## Contributing

If you have feedback on the calculator logic, edge cases in the dataset, or want to contribute recipes to score, open an issue or submit a pull request.

---

## License

MIT

---

Built with love for baking by [Vivid Sourdough](https://vividcrumb.netlify.app)
