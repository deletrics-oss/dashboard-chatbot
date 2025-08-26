// patch-server.js - servidor Express separado

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import patchRouter from "./patch-routes.js";

// Ajuste para __dirname em ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Usa as rotas extras
app.use(patchRouter);

const PORT = 4000;

// Rota para servir o painel.html
app.get("/painel.html", (req, res) => {
  res.sendFile(path.join(__dirname, "painel.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Patch server rodando na porta ${PORT}`);
});
