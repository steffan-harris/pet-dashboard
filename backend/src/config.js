const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/pet_dashboard",
};
