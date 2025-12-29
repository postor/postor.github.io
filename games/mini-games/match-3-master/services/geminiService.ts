
import { GoogleGenAI, Type } from "@google/genai";
import { LevelConfig, DEFAULT_CONFIG } from "../types";

// Must use process.env.API_KEY directly in the constructor as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLevelConfig = async (userPrompt: string): Promise<LevelConfig> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found in environment, returning default config.");
    return DEFAULT_CONFIG;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a JSON configuration for a Match-3 game based on this request: "${userPrompt}". 
      
      The available colors are: ['🍎', '💎', '🍃', '⭐', '🍇', '🟠']. Pick a subset if requested.
      Constraint: Rows and Cols should be between 5 and 10.
      
      Advanced features: 
      - You can specify 'initialGrid' if the user asks for a specific layout.
      - Grid codes: '0'-'5' (indices of colors array), 'R' (Rocket), 'B' (Bomb), 'M' (Magic), '-' (Random).
      - Suffix 'L' to any code to LOCK it (e.g., '0L' is locked color 0). Locked tiles don't fall and block tiles above.
      - Suffix 'A' or 'B' for Jelly (e.g., '0A' or '1B').

      Return ONLY the JSON object matching the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: { type: Type.INTEGER },
            cols: { type: Type.INTEGER },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            moves: { type: Type.INTEGER },
            targetScore: { type: Type.INTEGER },
            iceCount: { type: Type.INTEGER },
            initialGrid: { 
                type: Type.ARRAY, 
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: "Optional fixed grid. Use '0'-'5', 'R', 'B', 'M', '-'. Add 'L' for locked (e.g. '0L')."
            }
          },
          required: ["rows", "cols", "colors", "moves", "targetScore", "iceCount"]
        }
      }
    });

    if (response.text) {
      const config = JSON.parse(response.text) as LevelConfig;
      // Sanity check
      config.rows = Math.max(5, Math.min(10, config.rows));
      config.cols = Math.max(5, Math.min(10, config.cols));
      return config;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Gemini Level Generation Error:", error);
    return DEFAULT_CONFIG;
  }
};
