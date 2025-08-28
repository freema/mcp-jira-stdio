Testy – rychlý přehled

- Spuštění: `task test` (nebo `npm test`) spustí Vitest.
- Rychlý běh: `task test:fast` spustí testy bez coverage a s jedním vláknem (rychlejší lokálně).
- Pouze změny: `task test:changed` spustí testy související se změněnými soubory.
- Watch mód: `task test:watch` pro průběžné spouštění během vývoje.
- Coverage: `task test:coverage` vygeneruje V8 coverage report.

Zásady psaní testů

- Jednoduchost: preferovat přímé unit testy s minimem mocků. Testy by měly ověřovat chování veřejných funkcí bez nadbytečné infrastruktury.
- Sdílené fixture: používejte `tests/mocks/jira-responses.ts` (ostatní fixture jsme odstranili jako nevyužité).
- Stabilita: neblokujte testy na konkrétních osobních/produkčních datech. Používejte generické klíče (např. `PROJECT-123`).
- Selektivnost: testujte to, co se změnilo (např. přes `test:changed`) a rozšiřujte záběr postupně.

Tipy

- Spouštějte `task fmt:check` a `task lint` před `task test:coverage` pro rychlejší feedback.
- Pro zaměření na konkrétní test soubor: `npx vitest run tests/unit/path/to/file.test.ts`.
