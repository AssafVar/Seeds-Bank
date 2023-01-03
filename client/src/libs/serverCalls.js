import axios from 'axios';

const api = axios.create({
    baseURL:'http://localhost:8080/',
    withCredentials:true,
});

export const loginUser = async(email,password) =>{
    const results = await api.post('/user',{email,password});
    return results;
}