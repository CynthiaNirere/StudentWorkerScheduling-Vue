import apiClient from './services.js';

/**
 * Fetch class schedule for a user
 * @param {string} userId - User ID
 * @param {string} termCode - Term code (e.g., '2026SP')
 * @returns {Promise} - Schedule data
 */
export const getClassSchedule = async (userId, termCode) => {
  try {
    const response = await apiClient.get(`/class-schedule/${userId}/${termCode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    throw error;
  }
};

/**
 * Get available term codes
 * @returns {Promise} - List of available terms
 */
export const getAvailableTerms = async () => {
  try {
    const response = await apiClient.get('/class-schedule/terms');
    return response.data;
  } catch (error) {
    console.error('Error fetching available terms:', error);
    throw error;
  }
};