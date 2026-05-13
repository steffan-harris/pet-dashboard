const { app } = require("./app");
const { port } = require("./config");

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
