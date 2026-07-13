import { onRequest } from "firebase-functions/v2/https";

// Lazy load the Nitro handler to minimize cold start times
let handlerPromise;
const getHandler = async () => {
  if (!handlerPromise) {
    // Relative path to compiled Nitro server inside .output
    const { handler } = await import("../.output/server/index.mjs");
    handlerPromise = handler;
  }
  return handlerPromise;
};

export const server = onRequest(
  {
    cors: true,
    region: "us-central1",
    // Keep cold starts low and cost at zero when idle
    minInstances: 0,
  },
  async (req, res) => {
    try {
      const handler = await getHandler();
      handler(req, res);
    } catch (err) {
      console.error("Nitro handler failed to execute request:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);
