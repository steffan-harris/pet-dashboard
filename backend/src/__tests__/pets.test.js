const request = require("supertest");
const { app } = require("../app");
const { setupTestDb, clearPets, closeDb } = require("./helpers/db");

beforeAll(() => setupTestDb());
afterAll(() => closeDb());
beforeEach(() => clearPets());

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
describe("GET /health", () => {
  test("returns 200 with database connected", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });
});

// ---------------------------------------------------------------------------
// GET /api/pets
// ---------------------------------------------------------------------------
describe("GET /api/pets", () => {
  test("returns an empty array when there are no pets", async () => {
    const res = await request(app).get("/api/pets").expect(200);
    expect(res.body).toEqual([]);
  });

  test("returns all pets ordered by id", async () => {
    await request(app)
      .post("/api/pets")
      .send({ name: "Milo", species: "cat", ageYears: 3 });
    await request(app)
      .post("/api/pets")
      .send({ name: "Buddy", species: "dog", ageYears: 5 });

    const res = await request(app).get("/api/pets").expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Milo");
    expect(res.body[1].name).toBe("Buddy");
  });
});

// ---------------------------------------------------------------------------
// GET /api/pets/:id
// ---------------------------------------------------------------------------
describe("GET /api/pets/:id", () => {
  test("returns the pet when found", async () => {
    const created = await request(app)
      .post("/api/pets")
      .send({ name: "Luna", species: "rabbit", ageYears: 2, notes: "Fluffy" });

    const res = await request(app)
      .get(`/api/pets/${created.body.id}`)
      .expect(200);

    expect(res.body.name).toBe("Luna");
    expect(res.body.species).toBe("rabbit");
    expect(res.body.ageYears).toBe(2);
    expect(res.body.notes).toBe("Fluffy");
  });

  test("returns 404 for an id that does not exist", async () => {
    const res = await request(app).get("/api/pets/99999").expect(404);
    expect(res.body.error).toBe("Pet not found");
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await request(app).get("/api/pets/abc").expect(400);
    expect(res.body.error).toBe("Invalid pet id");
  });
});

// ---------------------------------------------------------------------------
// POST /api/pets
// ---------------------------------------------------------------------------
describe("POST /api/pets", () => {
  test("creates a pet and returns 201 with the new record", async () => {
    const res = await request(app)
      .post("/api/pets")
      .send({ name: "Nemo", species: "fish", ageYears: 1 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("Nemo");
    expect(res.body.species).toBe("fish");
    expect(res.body.ageYears).toBe(1);
    expect(res.body.notes).toBeNull();
    expect(res.body.createdAt).toBeDefined();
  });

  test("creates a pet with optional notes", async () => {
    const res = await request(app)
      .post("/api/pets")
      .send({
        name: "Polly",
        species: "parrot",
        ageYears: 7,
        notes: "Talks a lot",
      })
      .expect(201);

    expect(res.body.notes).toBe("Talks a lot");
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/pets")
      .send({ species: "cat", ageYears: 2 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
  });

  test("returns 400 when species is missing", async () => {
    const res = await request(app)
      .post("/api/pets")
      .send({ name: "Ghost", ageYears: 2 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
  });

  test("returns 400 when ageYears is negative", async () => {
    const res = await request(app)
      .post("/api/pets")
      .send({ name: "Ghost", species: "cat", ageYears: -1 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
  });
});

// ---------------------------------------------------------------------------
// PUT /api/pets/:id
// ---------------------------------------------------------------------------
describe("PUT /api/pets/:id", () => {
  test("updates an existing pet and returns the updated record", async () => {
    const created = await request(app)
      .post("/api/pets")
      .send({ name: "Max", species: "dog", ageYears: 4 });

    const res = await request(app)
      .put(`/api/pets/${created.body.id}`)
      .send({ name: "Max", species: "dog", ageYears: 5, notes: "Good boy" })
      .expect(200);

    expect(res.body.ageYears).toBe(5);
    expect(res.body.notes).toBe("Good boy");
  });

  test("returns 404 for an id that does not exist", async () => {
    const res = await request(app)
      .put("/api/pets/99999")
      .send({ name: "Ghost", species: "cat", ageYears: 1 })
      .expect(404);

    expect(res.body.error).toBe("Pet not found");
  });

  test("returns 400 for invalid payload", async () => {
    const created = await request(app)
      .post("/api/pets")
      .send({ name: "Max", species: "dog", ageYears: 4 });

    const res = await request(app)
      .put(`/api/pets/${created.body.id}`)
      .send({ name: "", species: "dog", ageYears: 4 })
      .expect(400);

    expect(res.body.error).toBe("Invalid payload");
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await request(app)
      .put("/api/pets/abc")
      .send({ name: "Ghost", species: "cat", ageYears: 1 })
      .expect(400);

    expect(res.body.error).toBe("Invalid pet id");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/pets/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/pets/:id", () => {
  test("deletes an existing pet and returns 204", async () => {
    const created = await request(app)
      .post("/api/pets")
      .send({ name: "Spike", species: "dog", ageYears: 6 });

    await request(app).delete(`/api/pets/${created.body.id}`).expect(204);

    await request(app).get(`/api/pets/${created.body.id}`).expect(404);
  });

  test("returns 404 for an id that does not exist", async () => {
    const res = await request(app).delete("/api/pets/99999").expect(404);
    expect(res.body.error).toBe("Pet not found");
  });

  test("returns 400 for a non-integer id", async () => {
    const res = await request(app).delete("/api/pets/abc").expect(400);
    expect(res.body.error).toBe("Invalid pet id");
  });
});
