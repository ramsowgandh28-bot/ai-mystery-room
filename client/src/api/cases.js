import api from './axiosInstance.js';

/**
 * Generate a new case.
 * On success, persists the returned raw session token to localStorage.
 */
export const generateCase = async (premise, difficulty) => {
  const response = await api.post('/cases', { premise, difficulty });
  if (response.data?.sessionToken && response.data?._id) {
    localStorage.setItem(`mystery_token_${response.data._id}`, response.data.sessionToken);
  }
  return response.data;
};

/**
 * Fetch case details for investigation.
 */
export const getCase = async (caseId) => {
  const response = await api.get(`/cases/${caseId}`);
  return response.data;
};

/**
 * Discover a specific clue sequentially.
 */
export const discoverClue = async (caseId, clueId) => {
  const response = await api.post(`/cases/${caseId}/clues/${clueId}/discover`);
  return response.data;
};

/**
 * Request the next hint.
 */
export const requestHint = async (caseId) => {
  const response = await api.post(`/cases/${caseId}/hints`);
  return response.data;
};

/**
 * Submit suspect accusation.
 */
export const submitAccusation = async (caseId, suspectId) => {
  const response = await api.post(`/cases/${caseId}/accuse`, { suspectId });
  return response.data;
};

/**
 * Retrieve case results after accusation.
 */
export const getResult = async (caseId) => {
  const response = await api.get(`/cases/${caseId}/result`);
  return response.data;
};

export default {
  generateCase,
  getCase,
  discoverClue,
  requestHint,
  submitAccusation,
  getResult,
};
