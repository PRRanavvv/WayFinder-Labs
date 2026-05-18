import cors from "cors";
import express from "express";
import { createDemoPlan, recordInteraction } from "./services/demoPlanner.js";

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "WayFinder Showcase API"
  });
});

app.post("/api/demo/plan", (req, res) => {
  const plan = createDemoPlan(req.body || {});
  res.json(plan);
});

app.post("/api/demo/interactions", (req, res) => {
  const profile = recordInteraction(req.body || {});
  res.json(profile);
});

app.listen(port, () => {
  console.log(`WayFinder showcase API running on http://localhost:${port}`);
});

