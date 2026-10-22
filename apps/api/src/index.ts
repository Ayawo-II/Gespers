import { app } from "./app.js";
import { env } from "./config/env.js";
import { startAvancementsScheduler } from "./services/avancements-scheduler.js";

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  startAvancementsScheduler();
});
