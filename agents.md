# Project Agents

## Mission Overview
Deliver a React 19 dashboard that transforms the `public/podcast-metrics.csv` dataset into actionable podcast intelligence. The site combines D3-driven visuals with narrative insights so future episode planning is backed by metrics.

## Toolchain Installed
- React 19 (release candidate) and ReactDOM for the component tree.
- Vite 5 build tool with SWC-based React plugin (`@vitejs/plugin-react-swc`) supporting `npm run dev`, `npm run build`, and `npm run preview`.
- D3 v7 for data ingest, statistical helpers, scales, shapes, and SVG rendering.
- CSV asset staged in `public/podcast-metrics.csv`, shipped with Vite's static asset pipeline.

## Agent Roster & Responsibilities
- Engineering AI: bootstraps the Vite workspace (`vite.config.js`, `index.html`, `src/main.jsx`), integrates the React 19 runtime, and keeps builds reproducible.
- Data Analyst AI: implements `usePodcastData.js` to parse the CSV, normalize durations, compute rolling means, cumulative metrics, and correlation stats powering each chart insight.
- UX Strategist AI: defines the six dashboard narratives (downloads momentum, completion discipline, listener mix, subscriber trajectory, social conversion, duration impact), designs the dark theme in `src/index.css`, and ensures chart annotations translate data into next steps.
