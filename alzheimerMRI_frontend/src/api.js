const resolveApiBaseUrl = () => {
  if (import.meta.env.DEV) return '';
  return (import.meta.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
};

const postJsonWithMethodFallback = async (paths, payload) => {
  let lastResponse = null;

  for (const path of paths) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    lastResponse = response;
    if (response.status !== 405) return response;
  }

  return lastResponse;
};

export const postClinicalPrediction = async (payload) => {
  const apiBaseUrl = resolveApiBaseUrl();
  return postJsonWithMethodFallback(
    [
      `${apiBaseUrl}/predict/clinical`,
      `${apiBaseUrl}/predict/clinical/`
    ],
    payload
  );
};

export const postChatbotQuestion = async (question) => {
  const apiBaseUrl = resolveApiBaseUrl();
  return postJsonWithMethodFallback(
    [
      `${apiBaseUrl}/chatbot`,
      `${apiBaseUrl}/chatbot/`
    ],
    { question }
  );
};

export const postMriImage = async (mriFile) => {
  const apiBaseUrl = resolveApiBaseUrl();
  const endpoints = [
    `${apiBaseUrl}/predict/MRIImage`,
    `${apiBaseUrl}/predict/MRIImage/`
  ];

  const formData = new FormData();
  formData.append('file', mriFile);

  let lastResponse = null;

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    lastResponse = response;
    if (response.status !== 405) return response;
  }

  return lastResponse;
};

export { resolveApiBaseUrl };
