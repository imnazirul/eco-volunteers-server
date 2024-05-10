const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.port || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Server in running...");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
