import axios from "axios";
import { nanoid } from "nanoid";
import { converToCitiesList } from "../libs/cities";

const api = axios.create({
  baseURL: "http://localhost:8080/",
  withCredentials: false,
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
export const getTempDataAPI = async (lat, log) => {
  try {
 const results = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${log}&hourly=temperature_2m,precipitation,vapor_pressure_deficit`
    );
    return results;
  } catch (err) {
    console.log(err);
  }
};

export const fetchCurrentProject = async (userId, projectId) => {
  try {
    const results = await api.get(`/projects/${userId}/${projectId}`);
    return results;
  } catch (err) {
    console.log(err);
  }
};

export const createNewProject = async (userId, projectName, plantType) => {
  const projectId = nanoid();
  try {
    const results = await api.post(`/projects/${userId}`, {
      projectId,
      projectName,
      plantType,
    });
    return results;
  } catch (err) {
    console.log(err);
  }
};

export const getUserProjectsList = async (userId) => {
  try {
    const results = await api.get(`/projects/${userId}`);
    return results;
  } catch (err) {
    console.log(err);
  }
};

export const saveProject = async (projectHeaders, projectDetails) => {
  const { project_id, user_id } = projectHeaders;
  try {
    const response = await api.post(
      `projects/${user_id}/${project_id}`,
      projectDetails
    );
    return response.status === 200 ? true : false;
  } catch (err) {
    console.log(err);
  }
};

export const deletePlant = async (user_id, plantIdToDelete) => {
  const { project_id, plant_id } = plantIdToDelete;
  try {
    const response = await api.delete(
      `projects/${user_id}/${project_id}/${plant_id}`
    );
    return response;
  } catch (err) {
    console.log(err);
  }
};

export const fetchCities = async (city) => {
  const response = await api.get(`https://api.teleport.org/api/cities/?search=${city}`);
  const citiesResults = response.data._embedded["city:search-results"];
  const citiesList = converToCitiesList(citiesResults);
  return citiesList; 
}

export const getCoords = async(location) => {
  const country = location.country.indexOf('(')===-1?location.country:location.country.slice(0,location.country.indexOf('('));
  const locationinfo = await api.get(`https://nominatim.openstreetmap.org/search?q=${location.city}+${location.state}+${country}&format=json&`);
  if (locationinfo.data.length != 0){
    const {lat, lon} = locationinfo.data[0];
    return {lat,lon};
  }else{
    const locationinfo2 = await api.get(`https://nominatim.openstreetmap.org/search?q=${location.city}+${country}&format=json&`);
    if (locationinfo2.data.length != 0){
      const {lat, lon} = locationinfo2.data[0];
      return {lat,lon};
    }else{
      const final = await api.get(`https://nominatim.openstreetmap.org/search?q=${country}&format=json&`);
      const {lat, lon} = final.data[0];
      return {lat,lon};
    }
  }
}