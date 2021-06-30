const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const middleware = require("../middleware");

const { mysqlConfig, jwtSecret } = require("../config");

router.get("/", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      'SELECT recipes.id, image, title, name, surname, timestamp FROM recipes JOIN users ON (recipes.owner_id = users.id) ORDER BY recipes.id DESC LIMIT 4'
    );
    con.end();

    res.send(data);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Database error. Please try again later." });
  }
});

router.get("/all", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      'SELECT recipes.id, image, title, name, surname, timestamp FROM recipes JOIN users ON (recipes.owner_id = users.id) ORDER BY recipes.id DESC'
    );
    con.end();

    res.send(data);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Database error. Please try again later." });
  }
});

router.get("/recipe/:id", async (req, res) => {
  let userId = 0;

  // custom token validation used for determining whether user has recipe added to favourites if they are logged in
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, jwtSecret);
    userId = decodedToken.id;
  } catch (err) {
    // don't need anything here, if validation fails, userId should stay 0
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [[data]] = await con.execute(
      `SELECT recipes.id, image, title, description, owner_id as ownerId, name, surname, recipes.timestamp, 
      COUNT((SELECT 1 FROM favourites WHERE ${userId} = favourites.user_id AND recipes.id = favourites.recipe_id LIMIT 1)) as favourite 
      FROM recipes JOIN users ON (users.id = owner_id) WHERE recipes.id = ${mysql.escape(
        req.params.id
      )}`
    );

    const [comments] = await con.execute(
      `SELECT comments.id, user_id as userId, name, surname, comment, timestamp FROM comments JOIN users ON (comments.user_id = users.id) 
      WHERE recipe_id = ${mysql.escape(req.params.id)}`
    );
    con.end();

    res.send({ data, comments });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Database error. Please try again later." });
  }
});

router.post("/add", middleware.loggedIn, async (req, res) => {
  if (!req.body.image || !req.body.title || !req.body.description) {
    res.status(400).send({ error: "Incorrect data" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `INSERT INTO recipes (image, title, owner_id, description) VALUES (${mysql.escape(
        req.body.image
      )}, ${mysql.escape(req.body.title)}, ${mysql.escape(
        req.userData.id
      )}, ${mysql.escape(req.body.description)})`
    );
    con.end();

    if (data.affectedRows != 1) {
      res.status(500).send({ error: "Database error. Please try again later" });
    }

    res.send({ message: "Successfully added to database", id: data.insertId });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

module.exports = router;
