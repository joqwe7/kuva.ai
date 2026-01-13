import { InferenceClient } from "@huggingface/inference";
import { DEFAULT_HF_TOKEN } from "../types";

export const generateImageHF = async (
  prompt: string, 
  token: string = DEFAULT_HF_TOKEN
): Promise<string> => {
  const client = new InferenceClient(token);

  // Using black-forest-labs/FLUX.1-schnell as requested
  const blob = await client.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: prompt,
    provider: "auto", 
    parameters: { 
        num_inference_steps: 5 
    },
  });

  // Convert the blob to a URL that can be displayed in an <img> tag
  return URL.createObjectURL(blob);
};