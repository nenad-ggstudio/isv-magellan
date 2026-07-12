# ISV Magellan

ISV Magellan is an early prototype for a narrative-heavy deep-space game. The
current build explores the technical and mechanical foundation: a
server-authoritative game session, real-time ship state, navigation maps, and
interactive gravity and electromagnetic scanners. Crew interaction and story
content are planned but are not part of the prototype yet.

## Architecture

- `src/core/Magellan.Core` — .NET 10 ASP.NET Core backend, game state, mechanics,
  diagnostic event logging, and the SignalR hub.
- `src/client` — React 19, TypeScript, Vite, Tailwind CSS, and Zustand client.
- `tests/core/Magellan.Core.Tests` — xUnit tests for game behavior and backend
  infrastructure.
- `docs` — game concept, story, history, and mechanic notes.

The backend owns the authoritative state. Commands arrive through SignalR,
`GameManager` serializes state transitions, domain events describe changes, and
the client receives projected state that omits hidden world data. SignalR method
and event names are shared through
`src/client/src/gameHubContract.json` and verified by backend tests.

The prototype currently supports one active game shared by all connected
clients. It does not yet implement save games, authentication, or independent
multiplayer sessions.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Node.js 24 and npm

## Development

Restore dependencies once:

```sh
dotnet restore Magellan.slnx
cd src/client
npm ci
```

Run the backend from the repository root:

```sh
dotnet run --project src/core/Magellan.Core
```

In a second terminal, run the client:

```sh
cd src/client
npm run dev
```

Open `http://localhost:5273`. Vite proxies `/hubs` to the backend at
`http://localhost:5304`.

## Validation

```sh
dotnet test Magellan.slnx
cd src/client
npm test
npm run lint
npm run build
```

Client unit tests currently cover pure navigation and EM-signal calculations.
The production client build is written to
`src/core/Magellan.Core/wwwroot`, where ASP.NET Core can serve it.

## Production-style local run

Build the client before starting or publishing the backend:

```sh
cd src/client
npm ci
npm run build
cd ../..
dotnet run --project src/core/Magellan.Core
```

Then open the backend URL from `src/core/Magellan.Core/Properties/launchSettings.json`.

## Diagnostic event logs

`FileGameEventStore` is a diagnostic log, not a save-game implementation.
Non-tick events are appended as JSON Lines to
`src/core/Magellan.Core/App_Data/game-events.jsonl`. Tick logging is disabled by
default and can be enabled with `GameEventStore:LogTickEvents`; enabled ticks are
written in a compact TSV format.

The store retains a bounded replay window only for event-bus subscribers in the
current process. Restarting the backend does not restore a previous game. The
window size is controlled by `GameEventStore:ReplayBufferCapacity`.

## Near-term extension points

New mechanics and narrative systems should be added as vertical features inside
the existing projects before introducing additional assemblies. Narrative
content should use stable IDs and data files, while requirements and effects
flow through typed commands/events and authoritative game-state facts such as
knowledge, relationships, promises, injuries, and completed story beats.
