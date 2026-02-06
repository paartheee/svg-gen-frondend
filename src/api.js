import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
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

export const editSvg = async (svgCode, instruction, selectedElementId = null) => {
    const response = await api.post('/edit', {
        svg_code: svgCode,
        instruction,
        selected_element_id: selectedElementId
    });
    return response.data;
};
