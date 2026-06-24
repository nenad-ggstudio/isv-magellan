# Repository Guidelines

## Project Structure & Module Organization

Magellan is split into a .NET backend and a Vite React client. Backend source lives in `src/core/Magellan.Core`. The ASP.NET Core entry point is `Program.cs`, and SignalR integration is in `GameHub.cs` plus related relay/client infrastructure. Backend tests live in `tests/core/Magellan.Core.Tests`. Client source is in `src/client/src`, with UI components under `components`, state in `stores`, shared types in `gameTypes.ts`, and static assets in `src/client/public`. World data assets are stored in `src/core/Magellan.Core/World/Data`.

## Build, Test, and Development Commands

- `dotnet restore Magellan.slnx`: restore backend and test dependencies.
- `dotnet build Magellan.slnx`: compile the .NET solution.
- `dotnet test Magellan.slnx`: run the xUnit test suite.
- `dotnet run --project src/core/Magellan.Core`: start the ASP.NET Core/SignalR backend.
- `cd src/client && npm ci`: install client dependencies from `package-lock.json`.
- `cd src/client && npm run dev`: start the Vite dev server on `http://localhost:5273`; run the backend first so `/hubs` proxies to `http://localhost:5304`.
- `cd src/client && npm run build`: type-check and build the client.
- `cd src/client && npm run lint`: run ESLint over TypeScript and React files.

You are allowed to run dev servers for internal testing, once you are done, STOP all the dev instances you used, DO NOT leave running dotnet or vite sessions.

## Coding Style & Naming Conventions

C# uses nullable reference types, implicit usings, four-space indentation, PascalCase for public types/members, and camelCase for locals and parameters. Keep domain models in their current feature folders and prefer small, explicit value objects over loosely typed dictionaries. TypeScript uses two-space indentation, single quotes, extensionless relative imports, PascalCase React components, and camelCase hooks/store members. Let ESLint and TypeScript be the source of truth for client style.

## Testing Guidelines

Backend tests use xUnit. Name test methods with the pattern `MethodName_expected_behavior`, as in `ConnectAsync_publishes_bootstrap_state_with_start_new_game_action`. Place new backend tests in the matching `tests/core/Magellan.Core.Tests` area. Run `dotnet test Magellan.slnx` before submitting backend changes. There is no client test runner configured yet, so use `npm run lint` and `npm run build` for client validation.

## Commit & Pull Request Guidelines

Recent commits use short, lower-case summaries such as `added Jump Area map` and `reworked long range map`. Keep commit messages concise and focused on one change. Pull requests should include a short description, test/build commands run, linked issue when available, and screenshots or clips for visible UI changes. Note any changes to ports, SignalR contracts, or world data files.
