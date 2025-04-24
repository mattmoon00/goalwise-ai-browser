// server/index.mts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import insightsRouter from "./routes/insights.mts";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/insights", insightsRouter);

app.get("/", (_req: Request, res: Response) => {
  res.send("Server is running.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
