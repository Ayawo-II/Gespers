import { runAutomaticEchelonAdvancements } from "./avancements.service.js";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

function millisecondsUntilNextLomeMidnight(now = new Date()): number {
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.min(nextMidnight.getTime() - now.getTime(), MAX_TIMEOUT_MS);
}

export function startAvancementsScheduler() {
  const scheduleNextRun = () => {
    setTimeout(async () => {
      try {
        const result = await runAutomaticEchelonAdvancements();
        console.info(
          `[avancements] traitement automatique terminé : ${result.processed} avancement(s)`,
        );
      } catch (error) {
        console.error("[avancements] échec du traitement automatique", error);
      } finally {
        setTimeout(scheduleNextRun, DAILY_INTERVAL_MS).unref();
      }
    }, millisecondsUntilNextLomeMidnight()).unref();
  };

  scheduleNextRun();
}
