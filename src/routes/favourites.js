const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const middleware = require("../middleware");

const { mysqlConfig } = require("../config");

router.get("/getall", middleware.loggedIn, async (req, res) => {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT recipes.id, image, title, name, surname, timestamp FROM recipes JOIN users ON (recipes.owner_id = users.id) JOIN favourites ON (${req.userData.id} = user_id AND recipes.id = recipe_id)`
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

router.post("/add", middleware.loggedIn, async (req, res) => {
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

router.delete("/remove", middleware.loggedIn, async (req, res) => {
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
