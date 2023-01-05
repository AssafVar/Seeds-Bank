import axios from 'axios';
import {nanoid} from 'nanoid';

const api = axios.create({
    baseURL:'http://localhost:8080/',
    withCredentials:true,
});

export const confirmUser = async(email,password,register) =>{
    const userId = nanoid();
    try{
        const results = await api.post(`/users/${register}`,{email,password,userId}) 
        return results;
    }catch(err){
        return err
    }
}