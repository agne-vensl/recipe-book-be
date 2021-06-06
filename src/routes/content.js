const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const middleware = require("../middleware");

const { mysqlConfig, jwtSecret } = require("../config");

router.get("/recipes", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT id, image, title FROM recipes ORDER BY id DESC LIMIT 30`
    );
    con.end();

    res.send(data);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Database error. Please try again later." });
  }
});

router.get("/recipes/:idfrom", async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT id, image, title FROM recipes WHERE id BETWEEN 1 AND ${mysql.escape(
        Number(req.params.idfrom) - 1
      )}  ORDER BY id DESC LIMIT 30`
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

  // custom token validation used for determining whether user has recipe added to favourites
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, jwtSecret);
    userId = decodedToken.id;
  } catch (err) {
    // don't need anything here, if validation fails, userId should stay 0
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);

    const [data] = await con.execute(
      `SELECT recipes.id, image, title, description, owner_id as ownerId, name, surname, recipes.timestamp, 
      COUNT((SELECT 1 FROM favourites WHERE ${userId} = favourites.user_id AND recipes.id = favourites.recipe_id LIMIT 1)) as favourite 
      FROM recipes JOIN users ON (users.id = owner_id) WHERE recipes.id = ${mysql.escape(
        req.params.id
      )}`
    );

    const [comments] = await con.execute(
      `SELECT comments.id, user_id as userId, name, surname, comment, timestamp FROM comments JOIN users ON (comments.user_id = users.id) WHERE recipe_id = ${mysql.escape(
        req.params.id
      )}`
    );
    con.end();

    res.send({ data, comments });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Database error. Please try again later." });
  }
});

router.post("/addrecipe", middleware.loggedIn, async (req, res) => {
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

    res.send({ message: "Successfully added to database" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

router.get("/searchrecipes/:search", async (req, res) => {
  const words = req.params.search.toLowerCase().split(/-| /);
  const search = words.reduce((a, v) => {
    return (
      a + `${a ? " AND " : ""}LOWER(title) LIKE ${mysql.escape("%" + v + "%")}`
    );
  }, "");

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT id, image, title FROM recipes WHERE ${search} ORDER BY id DESC`
    );
    con.end();

    res.send(data);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

router.post("/addcomment", middleware.loggedIn, async (req, res) => {
  if (!req.body.recipeId || !req.body.comment) {
    return res.status(400).send({ error: "Incorrect data" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [result] = await con.execute(
      `INSERT INTO comments (recipe_id, user_id, comment) VALUES(${mysql.escape(
        req.body.recipeId
      )}, '${req.userData.id}', ${mysql.escape(req.body.comment)})`
    );
    con.end();

    if (result.affectedRows != 1) {
      return res
        .status(500)
        .send({ error: "Could not add your comment. Please try again later" });
    }

    res.send({ message: "Comment added successfully" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

router.get("/getfavourites", middleware.loggedIn, async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT recipes.id, image, title FROM recipes JOIN favourites ON (${req.userData.id} = user_id AND recipes.id = recipe_id)`
    );
    con.end();

    res.send(data);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

router.post("/addfavourite", middleware.loggedIn, async (req, res) => {
  if (!req.body.recipeId) {
    return res.status(500).send({ error: "Incorrect data" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [result] = await con.execute(
      `INSERT INTO favourites (user_id, recipe_id) VALUES ('${
        req.userData.id
      }', ${mysql.escape(req.body.recipeId)})`
    );
    con.end();

    if (result.affectedRows != 1) {
      return res
        .status(500)
        .send({ error: "Unexpected error occured. Please try again later" });
    }

    res.send({ message: "Successfully added to favourites" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error occured. Please contact an admin" });
  }
});

router.delete("/removefavourite", middleware.loggedIn, async (req, res) => {
  if (!req.body.recipeId) {
    return res.status(500).send({ error: "Incorrect data" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [result] = await con.execute(
      `DELETE FROM favourites WHERE user_id = '${
        req.userData.id
      }' AND recipe_id = ${mysql.escape(req.body.recipeId)}`
    );
    con.end();

    if (result.affectedRows != 1) {
      return res
        .status(500)
        .send({ error: "Unexpected error occured. Please try again later" });
    }

    res.send({ message: "Successfully removed from favourites" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error occured. Please contact an admin" });
  }
});

module.exports = router;
