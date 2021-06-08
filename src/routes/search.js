const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");

const { mysqlConfig } = require("../config");

router.get("/:search", async (req, res) => {
  const words = req.params.search.toLowerCase().split(/-| /);
  const search = words.reduce((a, v) => {
    return (
      a + `${a ? " AND " : ""}LOWER(title) LIKE ${mysql.escape("%" + v + "%")}`
    );
  }, "");

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT recipes.id, image, title, name, surname, timestamp FROM recipes JOIN users ON (recipes.owner_id = users.id) WHERE ${search} ORDER BY id DESC`
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

module.exports = router;
