const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { z } = require("zod");
const { query } = require("./db");

const app = express();

const petSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  ageYears: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api/pets", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, species, age_years AS "ageYears", notes, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM pets
       ORDER BY id ASC`,
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/pets/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid pet id" });
    }

    const result = await query(
      `SELECT id, name, species, age_years AS "ageYears", notes, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM pets
       WHERE id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pet not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post("/api/pets", async (req, res, next) => {
  try {
    const payload = petSchema.parse(req.body);

    const result = await query(
      `INSERT INTO pets (name, species, age_years, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, species, age_years AS "ageYears", notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [payload.name, payload.species, payload.ageYears, payload.notes || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid payload", details: error.issues });
    }
    next(error);
  }
});

app.put("/api/pets/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid pet id" });
    }

    const payload = petSchema.parse(req.body);

    const result = await query(
      `UPDATE pets
       SET name = $1,
           species = $2,
           age_years = $3,
           notes = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, species, age_years AS "ageYears", notes, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        payload.name,
        payload.species,
        payload.ageYears,
        payload.notes || null,
        id,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pet not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid payload", details: error.issues });
    }
    next(error);
  }
});

app.delete("/api/pets/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid pet id" });
    }

    const result = await query("DELETE FROM pets WHERE id = $1 RETURNING id", [
      id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pet not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = { app };
