import { startFixtureSite } from "./fixture-site.ts";

// Serves the fixture site on a fixed port for manual runs: node test/serve-fixture.ts
const site = await startFixtureSite(Number(process.env.PORT) || 4555);
console.log(`fixture site: ${site.origin}`);
