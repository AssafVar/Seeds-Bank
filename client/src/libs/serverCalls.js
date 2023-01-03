import axios from 'axios';

const api = axios.create({
    baseURL:'http://localhost:8080/',
    withCredentials:true,
});

export const confirmUser = async(email,password,method) =>{
    try{
        const results = await api.post(`/user/${method}`,{email,password});
        return results;
    }catch(err){
        return err
    }
}