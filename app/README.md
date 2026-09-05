# Attune iOS app

React Native, and the decisions behind it. Read this before adding anything.

## Account details, now that they exist

| | |
|---|---|
| Team ID | `HX5FX68K6L` |
| Bundle ID | `com.attunerelationships.app` |
| App Store name | Attune Relationships |
| Seller | Attune Relationships LLC |
| Associated Domains | enabled on the identifier |

`public/.well-known/apple-app-site-association` is already built and deploys
with the site. It claims `/setup`, `/join`, `/app` and `/results` for the app
and excludes everything else, checkout deliberately included in the exclusion.

---

# Bootstrap: explicit steps

Run these on the Mac. Do not let me hand-write the project skeleton: I cannot
run `npm install` against a React Native tree here, so anything I generated
would be unverified guesses at versions, and a wrong dependency tree takes
longer to unpick than the scaffold saved.

The division that works: **the CLI creates the project, I write the code that
goes in it.**

## Step 0: prerequisites

Open Terminal and check each. Install anything missing before continuing.

```bash
node --version     # need 20 or higher
git --version      # any recent version
xcode-select -p    # should print a path, not an error
```

If `node` is missing or old, install the LTS build from nodejs.org.

If `xcode-select` errors, run `xcode-select --install` and let it finish. That
is separate from having Xcode itself, and both are needed.

**Open Xcode once, manually, before continuing.** It installs extra components
on first launch and asks you to accept a licence. Skipping this causes
confusing build errors later that look like project problems.

## Step 1: create the project

```bash
cd ~/path/to/unison      # wherever you cloned the repo
npx create-expo-app@latest attune-app
```

It will ask you to confirm installing `create-expo-app`. Answer yes. Takes two
to five minutes. If it asks which template, pick **Default**, which already
includes Expo Router.

## Step 2: install the libraries we decided on

```bash
cd attune-app
npx expo install expo-secure-store expo-image @tanstack/react-query zustand react-native-mmkv
```

Use `npx expo install`, not `npm install`. It picks versions matched to your
Expo SDK; `npm install` grabs latest and produces a tree that builds locally
and fails on EAS.

## Step 3: configure the identifiers

Open `attune-app/app.json`. Inside the `"expo"` object, set or add:

```json
{
  "expo": {
    "name": "Attune Relationships",
    "slug": "attune-relationships",
    "scheme": "attune",
    "ios": {
      "bundleIdentifier": "com.attunerelationships.app",
      "supportsTablet": false,
      "associatedDomains": [
        "applinks:attune-relationships.com",
        "webcredentials:attune-relationships.com"
      ]
    }
  }
}
```

Keep whatever else is already in the file. `associatedDomains` is what pairs
with the file already on the site; without it the universal links silently open
the browser instead of the app.

## Step 4: check it runs

```bash
npx expo start --ios
```

First run is slow. It should open the iOS Simulator and show the starter
screen. Press `Ctrl+C` in Terminal to stop it.

**If the simulator does not open**, send me the error rather than working
around it. Usual causes are Xcode not having been opened once, or no simulator
runtime installed (Xcode, Settings, Platforms).

## Step 5: commit and push

From the repo root, not from inside `attune-app`:

```bash
cd ..
git status
```

**Check that `node_modules` is not listed.** `create-expo-app` writes a
`.gitignore`, but confirm before committing: it is hundreds of megabytes and
pushing it makes the repo painful for everyone. If it does appear, tell me
before committing and I will fix the ignore rules.

Then:

```bash
git add attune-app
git commit -m "Bootstrap Expo project for the iOS app"
git push
```

## Step 6: tell me

Send me:

- the Expo SDK version, from the `"expo"` line in `attune-app/package.json`
- whether the simulator ran
- any command that errored, with its output

That tells me which Expo version and file layout I am writing against.
Guessing it wrong wastes a session.

**EAS Build comes later**, when there is something worth putting on a phone. It
needs an Expo account and its own setup, and doing it now adds steps without
moving anything forward.

---

# Decisions, and why

**Expo, not bare React Native.** Development builds give full native module
access, and it brings EAS Build and Submit, which is what actually gets a build
into review. Going bare only pays off for a native integration Expo's plugin
system cannot handle, and we have none.

**Expo Router, file-based.** Routes are files. It matters here because results
sections are already URL-addressable: a notification deep link and a route
become the same thing rather than two systems to keep in step.

**TanStack Query for server state, Zustand for UI state.** Query handles
fetching, caching and background refresh, which is what `/api/home` and
`/api/results` need. Zustand holds the small amount of local UI state.

**MMKV for persistence, not AsyncStorage.** Synchronous and much faster on cold
start.

**Screens never call `fetch`.** Every read goes through a typed function in
`api/`. Inline fetches are how prototype decisions survive into production.

**Every screen handles five states.** Loading, empty, error, stale and
permission-denied. "It works when the data is there" is the most common way an
app feels broken.

# Structure

Feature-based, shallow. Group by what the thing is for, not what kind of file
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

# What the app must not do

**No scoring.** The ten dimensions, the axis weights, the visibility blend and
the question weights live on the server. The app asks `/api/results` and renders
the answer. A second implementation is the thing this architecture exists to
avoid.

**No copy of its own** for anything reviewed clinically. Prose comes from the
API so approved copy has one home, and results copy is version-pinned per
couple.

**No selling.** Get Started opens `/start` in the system browser. An app that
builds a cart and hands it to an external payment page is the pattern Apple
rejects for. See `ONBOARDING.md`.

# State of play

**Backend ready and tested:** `/api/home` with the 26-case priority engine,
`/api/results` with frozen results and content pinning, `/api/notes` with
annotations and sharing, `/api/posts` with an admin authoring surface,
`/api/notifications`, notification rules, and the typed client in
`app/src/api/client.ts`.

**Specs written:** `ONBOARDING.md` for get-started through first dashboard,
`SCREENS.md` for all four tabs screen by screen.

**Not started:** the Expo project itself, which is what the steps above create.
Nothing else blocks the build.
