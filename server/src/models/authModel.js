import { db } from "../data/db.js";
import bcrypt from "bcrypt";

const signup = async (userId, email, password, userName) => {
  const encryptPass = await bcrypt.hash(password, 7);
  const result = await new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO users (userName, email, password ,userId ) VALUES (?,?,?,?)",
      [userName, email, encryptPass, userId],
      (error, response) => {
        if (error) throw error;
        else resolve (response);
      }
    );
});
return result;
};
const login = async (userName, email, password) => {
  const user = await new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      (error, response) => {
        if (error) {
          reject(error);
          return;
        } else {
          resolve(response[0]);
        }
      }
    );
  });
  const passwordCompare = await bcrypt.compare(password, user.password);

  if (user && passwordCompare) {
    return user;
  } else {
    return false;
  }
};

export { login, signup };
