import axios from "axios";
import { nanoid } from "nanoid";
import { converToCitiesList } from "../libs/cities";

export const SERVER_BASE_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: `${SERVER_BASE_URL}/`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const isOwnServerRequest = !/^https?:\/\//i.test(config.url);
  const activeUser = localStorage.activeUser && JSON.parse(localStorage.activeUser);
  if (isOwnServerRequest && activeUser?.token) {
    config.headers.Authorization = `Bearer ${activeUser.token}`;
  }
  return config;
});

const AUTH_ENDPOINTS = ["/users/login", "/users/signup"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.endsWith(path));
    if (error.response?.status === 401 && !isAuthEndpoint) {
      delete localStorage.activeUser;
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Extracts a human-readable message from the various error body shapes the
// server can return: a plain string (BadRequest/Unauthorized), a {message}
// object (Conflict), or ASP.NET Core's automatic ValidationProblemDetails
// ({title, errors}) from DataAnnotations validation failures.
export const extractErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.message) return data.message;
  if (data.errors) {
    const firstError = Object.values(data.errors)[0];
    return Array.isArray(firstError) ? firstError[0] : data.title || fallback;
  }
  return data.title || fallback;
};

export const confirmUser = async (email, password, register) => {
  const userId = nanoid();
  const results = await api.post(`/users/${register}`, {
    email,
    password,
    userId,
  });
  return results;
};

export const updateProfile = async (userName) => {
  const response = await api.put("/users/profile", { userName });
  return response.data;
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

export const getFields = async (userId, projectId) => {
  try {
    const results = await api.get(`/projects/${userId}/${projectId}/fields`);
    return results.data;
  } catch (err) {
    console.log(err);
  }
};

export const createField = async (userId, projectId, field) => {
  try {
    const response = await api.post(`/projects/${userId}/${projectId}/fields`, field);
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const updateFieldGeometry = async (userId, projectId, fieldId, geoVertices) => {
  try {
    const response = await api.put(`/projects/${userId}/${projectId}/fields/${fieldId}/geometry`, { geoVertices });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const deleteField = async (userId, projectId, fieldId) => {
  try {
    const response = await api.delete(`/projects/${userId}/${projectId}/fields/${fieldId}`);
    return response.status === 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getSiteContent = async () => {
  try {
    const results = await api.get("/site-content");
    return results.data;
  } catch (err) {
    console.log(err);
  }
};

export const updateSiteContent = async (content) => {
  try {
    const response = await api.put("/site-content", content);
    return response.status === 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const uploadGalleryImage = async (file, caption) => {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) {
    formData.append("caption", caption);
  }
  try {
    const response = await api.post("/site-content/gallery", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const deleteGalleryImage = async (imageId) => {
  try {
    const response = await api.delete(`/site-content/gallery/${imageId}`);
    return response.status === 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getNews = async () => {
  try {
    const results = await api.get("/news");
    return results.data;
  } catch (err) {
    console.log(err);
  }
};

export const createNewsPost = async (title, body) => {
  try {
    const response = await api.post("/news", { title, body });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

export const updateNewsPost = async (id, title, body) => {
  try {
    const response = await api.put(`/news/${id}`, { title, body });
    return response.status === 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const deleteNewsPost = async (id) => {
  try {
    const response = await api.delete(`/news/${id}`);
    return response.status === 200;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const fetchCities = async (city) => {
  if (!city) {
    return [];
  }
  try {
    // The teleport.org city-search API this used to call has gone dark
    // (its domain now just serves a placeholder page). Nominatim's own
    // search endpoint - already used below in getCoords - covers the same
    // "type a place, get suggestions" need.
    const response = await api.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=jsonv2&addressdetails=1&limit=8`
    );
    return converToCitiesList(response.data);
  } catch (err) {
    console.log(err);
    return [];
  }
}

export const getCoords = async(location) => {
  let country = location.country.indexOf('(') === -1 ?
   location.country :
   location.country.slice(0,location.country.indexOf('('));
  if (country === "UnitedStates"){
    country = "usa";
  };
  const locationinfo = await api.get(`https://nominatim.openstreetmap.org/search?q=${location.city}+${location.state}+${country}&format=json`);
  if (locationinfo.data.length !== 0){
    const {lat, lon} = locationinfo.data[0];
    return {lat,lon};
  }else{
    const locationinfo2 = await api.get(`https://nominatim.openstreetmap.org/search?q=${location.state}+${country}&format=json`);
    if (locationinfo2.data.length !== 0){
      const {lat, lon} = locationinfo2.data[0];
      return {lat,lon};
    }else{
      const final = await api.get(`https://nominatim.openstreetmap.org/search?q=${country}&format=json`);
      const {lat, lon} = final.data[0];
      return {lat,lon};
    }
  }
}