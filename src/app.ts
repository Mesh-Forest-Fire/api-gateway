import express from "express";
import routes from "./routes";

const app = express();

app.use(express.json());
app.use("/", routes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  // Minimal startup log
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});

export default app;
