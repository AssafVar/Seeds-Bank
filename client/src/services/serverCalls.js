import axios from "axios";
import { nanoid } from "nanoid";

const api = axios.create({
  baseURL: "http://localhost:8080/",
  withCredentials: true,
});

export const confirmUser = async (userName, email, password, register) => {
  const userId = nanoid();
  try {
    const results = await api.post(`/users/${register}`, {
      userName,
      email,
      password,
      userId,
    });
    return results;
  } catch (err) {
    return err;
  }
};
export const getTempDataAPI = async (lat, lng) => {
  try {
    /*         `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation,direct_radiation`
     */ const results = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m`
    );
    return results;
  } catch (err) {
    console.log(err);
  }
};

export const fetchCurrentProject = async(projectId) => {
  try{
    const results = await api.get(`/projects/${projectId}`);
    return results;
  }catch(err){
    console.log(err);
  };
};
