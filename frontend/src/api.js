import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });


export const uploadPdf = (file, project_id = null) => {
  const data = new FormData();
  data.append("file", file);
  if (project_id) data.append("project_id", project_id);
  return api.post("/api/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
};

export const listProjects = () => api.get("/api/projects");
export const listRecords = (project_id) => api.get(`/api/records/${project_id}`);
export const patchRecord = (project_id, num, body) => api.patch(`/api/records/${project_id}/${num}`, body);
export const llmProcess = (project_id, opts) => api.post(`/api/llm/process/${project_id}`, opts);
export const llmProcessOne = (project_id, num, opts) => api.post(`/api/llm/process/${project_id}/${num}`, opts);
export const startLlm = (project_id, body) => api.post(`/api/llm/start/${project_id}`, body || {});
export const checkLlmStatus = (project_id) => api.get(`/api/llm/check_status/${project_id}`);
export const getLlmStatusRows = (project_id) => api.get(`/api/llm/status_rows/${project_id}`);
export const ttsAll = (project_id) => api.post(`/api/tts/all/${project_id}`);
export const startTtsAll = (project_id) => api.post(`/api/tts/start/${project_id}`);
export const checkTtsStatus = (project_id) => api.get(`/api/tts/check_status/${project_id}`);
export const getTtsStatusRows = (project_id) => api.get(`/api/tts/status_rows/${project_id}`);
export const ttsOne = (project_id, num, body) => api.post(`/api/tts/${project_id}/${num}`, body);
export const deleteAudio = (project_id, num, part) => api.delete(`/api/tts/${project_id}/${num}/${part}`);

export const getProjectInfo = (project_id) => api.get(`/api/projects/${project_id}/info`);
export const saveProjectInfo = (project_id, body) => api.post(`/api/projects/${project_id}/info`, body);
export const createProject = (body) => api.post(`/api/projects`, body);
// Delete a project (backend may not implement this; calling it will attempt to remove project dir on server)
export const deleteProject = (project_id) => api.delete(`/api/projects/${project_id}`);


