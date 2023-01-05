import {signup, login} from "../models/authModel.js";

async function signupUser(req,res,next){
  try{
    const { userId, email, password } = req.body;
    const user = await signup(userId, email, password);
    res.status(200).send(user);
  }catch(err){
    res.status(500).send(err.message)
  }
}
async function loginUser(req, res, next){
  console.log("loginUser")
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).send("email or password missing");
        return;
      }
      const user = await login(email, password);
      if (!user) {
        res.status(401).send("invalid username or password");
        return;
      }
      //delete user.password;
/*       const token = jwt.sign(Object.assign({}, user), process.env.JWT_SECRET);
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production" ? true : false,
      }); */
      console.log(`user is ${user}`)

      res.send(user);
    } catch (err) {
      res.send(err);
      //next(err);
    }
  }
  export {loginUser, signupUser}