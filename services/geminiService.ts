import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const getDashboardInsights = async (contextData: string): Promise<string> => {
  if (!API_KEY) {
    return "AI Insights Unavailable: API Key missing. Please configure your environment.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = 'gemini-3-flash-preview'; 

    const response = await ai.models.generateContent({
      model,
      contents: `
        Act as a senior business analyst for a B2B wholesale marketplace called Beparibd.
        Analyze the following daily snapshot data and provide 3 brief, high-impact strategic bullet points 
        for the Admin team. Focus on risk, opportunity, and operational efficiency.
        
        Data Context:
        ${contextData}
        
        Output format: 
        - [Insight 1]
        - [Insight 2]
        - [Insight 3]
        Keep it professional and concise.
      `,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};

export const editProductImage = async (imageBase64: string, prompt: string): Promise<string | null> => {
    if (!API_KEY) {
        console.error("API Key missing");
        return null;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        // Nano Banana model for image editing
        const model = 'gemini-2.5-flash-image'; 

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBase64
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        // Iterate through parts to find the image
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Gemini Image Edit Error:", error);
        return null;
    }
};

export const enhanceProductDetails = async (
    currentName: string, 
    currentDesc: string, 
    currentMaterial: string, 
    category: string, 
    imageBase64: string,
    language: 'English' | 'Bangla' = 'English'
): Promise<{ name: string; description: string; material: string } | null> => {
    if (!API_KEY) {
        console.error("API Key missing");
        return null;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const model = 'gemini-2.5-flash'; 

        const prompt = `
            You are an expert B2B Product Copywriter for a wholesale marketplace. 
            Analyze the provided product image and the current details.
            
            Current Name: ${currentName}
            Current Description: ${currentDesc}
            Current Material: ${currentMaterial}
            Category: ${category}
            Target Language: ${language}

            Task:
            1. Create a professional, SEO-friendly, and concise Product Name suitable for bulk buyers in ${language}.
            2. Write a compelling, professional description in ${language} highlighting quality, durability, and bulk appeal. 
               IMPORTANT: Use bullet points (•) to list key features and benefits. Keep it brief and easy to scan.
            3. Refine or estimate the Material/Specification field based on the image and context in ${language}.

            Output strictly as a valid JSON object with keys: "name", "description", "material".
            Do not add markdown formatting like \`\`\`json.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBase64
                        }
                    },
                    { text: prompt }
                ]
            }
        });

        const text = response.text || '';
        // Clean markdown if present
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("Gemini Details Enhancement Error:", error);
        return null;
    }
};