import { HordeGenerationRequest, HordeAsyncResponse, HordeStatusResponse, DEFAULT_HORDE_API_KEY } from '../types';

const BASE_URL = "https://aihorde.net/api/v2";

export const generateImage = async (
  request: HordeGenerationRequest,
  apiKey: string = DEFAULT_HORDE_API_KEY
): Promise<HordeAsyncResponse> => {
  const response = await fetch(`${BASE_URL}/generate/async`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'Client-Agent': 'HordeGen-SaaS-Demo:v1.0.0:admin@example.com',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to submit job: ${response.status} - ${errorBody}`);
  }

  return response.json();
};

export const checkGenerationStatus = async (
  id: string,
  apiKey: string = DEFAULT_HORDE_API_KEY
): Promise<HordeStatusResponse> => {
  const response = await fetch(`${BASE_URL}/generate/status/${id}`, {
    method: 'GET',
    headers: {
      'apikey': apiKey,
      'Client-Agent': 'HordeGen-SaaS-Demo:v1.0.0:admin@example.com',
    },
  });

  if (!response.ok) {
     const errorBody = await response.text();
    throw new Error(`Failed to check status: ${response.status} - ${errorBody}`);
  }

  return response.json();
};

export const getModels = async (apiKey: string = DEFAULT_HORDE_API_KEY): Promise<any[]> => {
    try {
        const response = await fetch(`${BASE_URL}/status/models?type=image`, {
             headers: {
                'apikey': apiKey,
                'Client-Agent': 'HordeGen-SaaS-Demo:v1.0.0:admin@example.com',
            }
        });
        if(response.ok) {
            return response.json();
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch models", e);
        return [];
    }
}
