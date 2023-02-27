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
