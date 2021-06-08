const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const recipeRoutes = require("./routes/recipes");
const commentRoutes = require("./routes/comments");
const favouriteRoutes = require("./routes/favourites");
const searchRoutes = require("./routes/search");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/auth", authRoutes);
app.use("/recipes", recipeRoutes);
app.use("/comments", commentRoutes);
app.use("/favourites", favouriteRoutes);
app.use("/search", searchRoutes);

app.all("*", (req, res) => {
  res.status(404).send({ error: "Page not found" });
});

const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`Listening on port ${port}`));
