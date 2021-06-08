const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const { mysqlConfig, jwtSecret } = require("../config");

router.post("/register", async (req, res) => {
  if (
    !req.body.name ||
    !req.body.surname ||
    !req.body.email ||
    !req.body.password ||
    req.body.password.length < 8
  ) {
    return res.status(400).send({ error: "Incorrect data" });
  }

  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 12);

    const con = await mysql.createConnection(mysqlConfig);

    const [user] = await con.execute(
      `SELECT id FROM users WHERE email = ${mysql.escape(req.body.email)}`
    );

    if (user.length) {
      return res
        .status(400)
        .send({ error: "User with that email already exists" });
    }

    const [data] = await con.execute(
      `INSERT INTO users (name, surname, email, password) VALUES (${mysql.escape(
        req.body.name
      )}, ${mysql.escape(req.body.surname)}, ${mysql.escape(
        req.body.email
      )}, '${hashedPassword}')`
    );
    con.end();

    if (data.affectedRows != 1) {
      return res.status(500).send({
        error: "Failed to register an account. Please contact an admin",
      });
    }

    const token = jwt.sign(
      {
        id: data.insertId,
        email: req.body.email,
      },
      jwtSecret
    );

    res.send({ message: "Account successfully registered", token });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Error in database. Please contact an admin" });
  }
});

router.post("/login", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ error: "Incorrect data" });
  }

  try {
    const con = await mysql.createConnection(mysqlConfig);
    const [data] = await con.execute(
      `SELECT id, email, password FROM users WHERE email = ${mysql.escape(
        req.body.email
      )}`
    );
    con.end();

    if (data.length !== 1) {
      return res.status(400).send({ error: "Incorrect email or password" });
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      data[0].password
    );

    if (!passwordIsValid) {
      return res.status(400).send({ error: "Incorrect email or password" });
    }

    const token = jwt.sign(
      {
        id: data[0].id,
        email: data[0].email,
      },
      jwtSecret
    );

    return res.send({ message: "Successfully logged in", token });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ error: "Error in database. Please contact an admin" });
  }
});

module.exports = router;
