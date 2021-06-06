const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const middleware = require("../middleware");

const { mysqlConfig } = require("../config");

router.get("/addrecipe", middleware.loggedIn, async (req, res) => {
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

module.exports = router;
