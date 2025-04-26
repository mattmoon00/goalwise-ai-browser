// server/index.mts
import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import insightsRouter from "./routes/insights.mts";
import plaidRoutes from "./routes/plaid.ts";
import billingRoutes from "./routes/billing.ts";
import webhookRoute from "./routes/webhook.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// ⛔ DO NOT use express.json() before webhook route
// Stripe requires raw body for signature verification
app.use("/api/webhook", bodyParser.raw({ type: "application/json" }));

// ✅ Now use express.json() for the rest of the app
app.use(express.json());

// Register all other routes
app.use("/api/plaid", plaidRoutes);
app.use("/api/insights", insightsRouter);
app.use("/api/billing", billingRoutes);
app.use("/api/webhook", webhookRoute);

app.get("/", (_req: Request, res: Response) => {
  res.send("Server is running.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
