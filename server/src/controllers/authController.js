import {signup, login} from "../models/authModel.js";

async function signupUser(req,res,next){
  try{
    const { userId, email, password ,userName} = req.body;
    const user = await signup(userId, email, password, userName);
    user && res.status(200).send("Successfully signed");
  }catch(err){
    res.status(500).send(err.message)
  }
}
async function loginUser(req, res, next){
    try {
      const { userName, email, password } = req.body;
      if (!email || !password) {
        res.status(400).send("email or password missing");
        return;
      }
      const user = await login(userName, email, password);
      if (!user) {
        res.status(401).send("Wrong username or password!, please try again.");
      }
      //delete user.password;
/*       const token = jwt.sign(Object.assign({}, user), process.env.JWT_SECRET);
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production" ? true : false,
      }); */
      res.status(200).send(user);
    } catch (err) {
      res.send(err);
      //next(err);
    }
  }

  export {loginUser, signupUser}