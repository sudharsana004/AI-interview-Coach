import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../constants/config";

export const generateInterviewQuestions = async (resumeText) => {
  try {
    const groqClient = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Generate 10 specific technical interview questions based on this resume: ${resumeText}. Format as a numbered list.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3
    });

    return response.choices[0].message.content.split("\n");
  } catch (error) {
    console.error("Error generating interview questions:", error);
    return [];
  }
};
