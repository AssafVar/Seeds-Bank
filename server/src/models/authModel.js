import {db} from "../data/db.js";
import bcrypt from "bcrypt";

const signup = async (userId, email, password) => {
    console.log(userId);
    const encryptPass = await bcrypt.hash(password,7);
    console.log(encryptPass);
    db.query("INSERT INTO users (userId,email,password) VALUES (?,?,?)",[userId, email, encryptPass],
    (error, response)=>{
        if (error) throw error;
        else console.log(response); 
    });
}
const login = async (email, password) => {
    const user = db.query("SELECT * FROM users WHERE email =?", [email], 
        (error,response)=>{
            if (error) throw error;
            else {
                console.log(response)
            }
        })
    if (user && (await bcrypt.compare(password, user.password))) {
    return user;
    } else {
    return false;
}
}

export {login, signup}