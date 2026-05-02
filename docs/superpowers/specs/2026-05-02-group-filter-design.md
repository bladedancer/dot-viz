---
title: Group Filter (rename from includes)
date: 2026-05-02
status: approved
---

## Overview

Rename the existing "includes filter" to "group filter" and extend it so it applies server-side on both the `load-path` and `generate-path` endpoints. The goal is to avoid rendering thousands of nodes when the caller only wants a specific subset of Maven groups.

## Changes

### UI — `client/src/panels/PomPanel.jsx`

- Rename local state `includes` → `groupFilter`, `includesEnabled` → `groupFilterEnabled`
- Rename checkbox label from "Includes filter" to "Group filter"
- Update placeholder text to `com.example,org.other`
- Send `groupFilter` (instead of `includes`) in the POST body for both `/api/load-path` and `/api/generate-path`

### Backend — `src/index.js`

- `/api/load-path`: read `groupFilter` from request body; after reading the `.dot` file from disk, call a filter function before returning
- `/api/generate-path`: read `groupFilter` instead of `includes`; pass it through to `generateDotFromPath`

### Backend — `src/generate.js`

- Rename parameter `includes` → `groupFilter` in `generateDot`, `generateDotFromPath`, and `buildMvnArgs`
- Add a `filterDotByGroup(dotText, groupFilter)` function:
  - Parse `groupFilter` as a comma-separated list of group prefixes (trimmed, empty strings dropped)
  - If the list is empty, return `dotText` unchanged
  - Node IDs in the DOT format are `group:artifact`; extract the group by splitting on `:`
  - Collect the set of node IDs whose group matches at least one entry in the list (prefix match: `nodeGroup.startsWith(prefix)`)
  - Emit only node lines and edge lines where all referenced node IDs are in the allowed set
  - Preserve the graph header (`digraph { ... }`) and closing brace intact
- Call `filterDotByGroup` in `load-path` after reading the file, and in `generateDotFromPath` / `generateDot` after running Maven

## Behavior

- Comma-separated list, e.g. `com.example,org.other`
- Each entry is a prefix match against the Maven group ID
- An empty or disabled group filter passes all nodes through unchanged
- Filtering happens server-side so large graphs are trimmed before transmission

## Out of Scope

- No changes to `FilterPanel`, `store`, `parseDot`, or `buildGraph`
- No client-side group filtering
