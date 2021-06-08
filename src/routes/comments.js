const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const middleware = require("../middleware");

const { mysqlConfig } = require("../config");

router.post("/add", middleware.loggedIn, async (req, res) => {
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

    if (result.affectedRows != 1) {
      return res
        .status(500)
        .send({ error: "Could not add your comment. Please try again later" });
    }

    const [[comment]] = await con.execute(
      `SELECT comments.id, user_id as userId, name, surname, comment, timestamp FROM comments JOIN users ON (comments.user_id = users.id) WHERE comments.id = ${mysql.escape(
        result.insertId
      )}`
    );
    con.end();

    res.send({ message: "Comment added successfully", comment });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Unexpected error. Please contact an admin" });
  }
});

module.exports = router;
