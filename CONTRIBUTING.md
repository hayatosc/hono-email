# Contributing to hono-email

Thank you for your interest in contributing to `hono-email`! This document outlines the development workflow and instructions to set up your local development environment.

## Prerequisites

This project manages its toolchains and tasks using [mise](https://mise.jdx.dev/). Please ensure you have `mise` installed on your machine.

If you don't have `mise` installed, you can install it by following the instructions on [mise.jdx.dev](https://mise.jdx.dev/getting-started.html).

## Setup & Bootstrapping

Once you have `mise` installed, setting up the repository is as simple as running:

```sh
mise bootstrap
```

This task is defined in `mise.toml` and performs the following actions:

1. Installs the project dependencies via `bun install`.
2. Builds all packages in the monorepo via `bun run build`.

## Development Commands

We use `bun` as the package manager and test runner.

### Build

To compile all packages in the monorepo, run:

```sh
bun run build
```

### Run Tests

To run unit tests across all packages, run:

```sh
bun run test
```

> [!IMPORTANT]
> Always run `bun run test` instead of running `bun test` directly. This prevents picking up stale `_build/actrun/` workspaces in the monorepo.

### Linting & Formatting

To run code linting and styling checks, use the following commands:

```sh
# Run linter
bun run lint

# Run formatter
bun run format
```

### Typechecking

To typecheck all TypeScript packages, run:

```sh
bun run typecheck
```

### Local CI Validation

Before committing or pushing your changes, you can run the full CI check locally using:

```sh
mise run ci
```

This runs the same GitHub Actions CI workflow locally using [actrun](https://github.com/mizchi/actrun) based on the configuration in `actrun.toml`.
