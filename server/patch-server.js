// patch-server.js - servidor Express separado
import express from "express";
import bodyParser from "body-parser";
import patchRouter from "./patch-routes.js";

const app = express();
app.use(bodyParser.json());

// Usa as rotas extras
app.use(patchRouter);

const PORT = 4000;
const path = require("path");
app.get("/painel.html", (req, res) => {
  res.sendFile(path.join(__dirname, "painel.html"));
});
app.listen(PORT, () => {
  console.log(`Patch server rodando na porta ${PORT}`);
});
