# Attune iOS app

React Native, and the decisions behind it. Read this before adding anything.

## Bootstrap: run these yourself, do not let me hand-write them

```bash
# from the repo root, on the Mac
npx create-expo-app@latest attune-app --template default
cd attune-app
npx expo install expo-router expo-secure-store expo-image \
  @tanstack/react-query zustand react-native-mmkv
```

**Why you run this and not me.** Bootstrapping is a solved problem with mature
tooling, and the failure mode of an AI hand-writing a project skeleton is well
documented: wrong file layout, a mismatched dependency tree, and corrupted
`node_modules` that takes longer to unpick than the scaffold saved. I cannot run
`npm install` against a React Native tree here, so anything I hand-wrote would
be unverified guesses at versions.

The division that works: **the CLI creates the project, I write the code that
goes in it.** Everything in `app/` here is source that drops into `attune-app/src`
once it exists.

## Decisions, and why

**Expo, not bare React Native.** Expo is the recommended default for new
projects in 2026; the gap to bare has effectively closed, development builds
give full native module access, and it brings EAS Build and Submit, which is
what actually gets a build onto your phone and into review. Going bare only pays
off for a native integration Expo's plugin system cannot handle, and we have
none.

**Expo Router, file-based.** Routes are files, the way Next.js works. It matters
here because we already made results sections URL-addressable: a notification
deep link and a route become the same thing rather than two systems to keep in
step.

**TanStack Query for server state, Zustand for UI state.** The "Redux for
everything" pattern has been replaced by this split. Query handles fetching,
caching and background refresh, which is exactly the behaviour we want from
`/api/home` and `/api/results`; Zustand holds the small amount of local UI state
without ceremony.

**MMKV for persistence, not AsyncStorage.** Synchronous, and much faster on cold
start. Startup time is not a detail: apps taking over three seconds see roughly a
third higher abandonment.

**Screens never call `fetch`.** Every read goes through a typed function in
`api/`. Mock data and inline fetches are how prototype decisions survive into
production and start lying to you.

**Every screen handles five states, not two.** Loading, empty, error, stale, and
permission-denied. "It works when the data is there" is the most common way an
app feels broken.

## Structure

Feature-based, shallow. Group by what the thing is for, not by what kind of file
it is, and keep the tree under four levels deep.

```
src/
  api/          typed client, one function per endpoint, no fetch elsewhere
  theme/        tokens: colour, type, spacing. Nothing hardcodes a hex value.
  features/
    home/       landing screen: greeting, primary action, secondary cards
    toolbox/    exercises, resources, add-ons
    insights/   results, locked until both partners finish
    practice/   In Practice posts
    notes/      notes, folders, tags, annotations
  components/   shared primitives only. If one feature uses it, it lives there.
```

## What the app must not do

**No scoring.** The ten dimensions, the axis weights, the visibility blend and
the question weights live in JavaScript on the server. The app asks
`/api/results` what the results are and renders the answer. A second
implementation in the app is the thing we chose React Native to avoid.

**No copy of its own for anything Carolina reviews.** Prose comes from the API
so approved copy has one home.

## State of play

Backend ready: URL-addressable sections, `/api/results` (cached via
`couple_results`), `/api/home` (greeting, primary action, badges), notification
rules, and the tested priority engine behind the home screen.

Not started: the Expo project itself, which needs the Apple Developer account
for anything to reach a phone, and the notes data model, which needs the
annotation-anchoring decision made first.
