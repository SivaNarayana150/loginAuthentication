const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "userData.db");
const app = express();

app.use(express.json());

const bcrypt = require("bcrypt");

let db = null;

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3001, () => {
      console.log(`Server Running Successfully at http://localhost:3001/`);
    });
  } catch (e) {
    console.log(`Database Error ${e.message}`);
    process.exit(1);
  }
};

initializeDatabaseAndServer();
const validPassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);
  const getUserExistsQuery = `SELECT * FROM user WHERE username='${username}';`;

  const dbUser = await db.get(getUserExistsQuery);
  if (dbUser === undefined) {
    const registerQuery = `
  INSERT INTO user 
  (username,name,password,gender,location)
  VALUES('${username}','${name}','${hashPassword}','${gender}','${location}');`;

    if (validPassword(password)) {
      await db.run(registerQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserExistsQuery = `SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await db.get(getUserExistsQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
    //user does not exist
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
    //compare password
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      if (validPassword(newPassword)) {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                 UPDATE user SET
                 password='${hashPassword}'
                 WHERE username='${username}';`;

        const user = await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
