# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.19.

## Branching workflow

Every new feature or change gets its own branch, so each one can be tracked from start to release. The API repo
(NB-Ecomm-API) follows the same rules (its README "Branching workflow" and HANDOFF.md §0).

| Branch | Purpose |
|---|---|
| `main` | Production. Vercel project `nb-ecom-ui` deploys it to www.narturebelle.com. Changes arrive only by pull request from `develop`. |
| `develop` | Integration. Every feature branch starts from it and merges back into it. |
| `feature/<short-name>` | One new feature or change, e.g. `feature/careers-page`. |
| `fix/<short-name>` | A bug fix. |
| `docs/<short-name>` | Documentation only. |

**Starting work:** always from the latest `develop` on GitHub, never from a local or older branch:

```
git fetch origin
git switch -c feature/<short-name> origin/develop
```

**Finishing work:**
1. The build passes (`npx ng build`), then push: `git push -u origin feature/<short-name>`.
2. Open a pull request **into `develop`** and merge it. Vercel builds a preview for the branch.
3. To release, open a pull request from **`develop` into `main`** and merge it. Vercel then deploys production.

Rules:
- Don't commit to `develop` or `main` directly, and don't reuse an old branch for a new feature.
- If `develop` moves on while a branch is open, bring it in with `git merge origin/develop` before the pull request.
- Use **lowercase** branch names. Windows can't tell `Feature/x` from `feature/x`, and GitHub then ends up with two branches.
- `Feature/phase-0-1`, `feature/phase-0-1`, `Feature/Added-OAuth2`, `Feature/Update-Signin-SignOut-MyProfile` and `initialProject` are history;
  don't start new work from them.
- Note each feature in `API_Integration.md` on its own branch, so the docs ship with the code.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
