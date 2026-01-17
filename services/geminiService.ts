
import { GoogleGenAI } from "@google/genai";

export const aiService = {
    async analyzeNotebook(projectName: string, subject: string, pageCount: number) {
        // Correct initialization with named parameter
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `Analyze this PDF Notebook titled "${projectName}" (Subject: ${subject}). It contains ${pageCount} pages. 
        Please provide: 
        1. A high-level summary of what this notebook likely covers. 
        2. A list of 3 key learning objectives. 
        3. Suggest one missing topic that would be helpful to add for a student.`;

        // Use correct model 'gemini-3-flash-preview' and extract text property
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are a world-class academic advisor and study assistant. Provide concise, encouraging, and structured feedback.",
                tools: [{ googleSearch: {} }]
            }
        });

        // Use response.text property
        return response.text;
    },

    async explainPage(imageBase64: string) {
        // Correct initialization with named parameter
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const imagePart = {
            inlineData: {
                mimeType: 'image/png',
                data: imageBase64.split(',')[1],
            },
        };
        const textPart = {
            text: "Explain the core academic concept shown in this page. If there are formulas or diagrams, break them down simply for a student."
        };

        // Use correct model 'gemini-3-flash-preview' and extract text property
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [imagePart, textPart] },
        });

        // Use response.text property
        return response.text;
    }
};
