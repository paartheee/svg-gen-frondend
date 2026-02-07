import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

export const generateSvg = async (prompt, imageFile = null) => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  if (imageFile) {
    formData.append('image', imageFile);
  }
  const response = await api.post('/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const editSvg = async (
  svgCode,
  instruction,
  selectedElementId = null,
  imageFile = null,
) => {
  const formData = new FormData();
  formData.append('svg_code', svgCode);
  formData.append('instruction', instruction);
  if (selectedElementId) {
    formData.append('selected_element_id', selectedElementId);
  }
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await api.post('/edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
