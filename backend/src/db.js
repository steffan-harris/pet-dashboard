const { Pool } = require("pg");
const { databaseUrl } = require("./config");

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL client error", error);
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
};
