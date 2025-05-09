import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs'; 
import './Resume.css';
import leftImage from '../assets/left-image_interview_Image.jpg';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../constants/config';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const Resume = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const extractTextFromPDF = async (file) => {
    const fileReader = new FileReader();
    
    return new Promise((resolve, reject) => {
      fileReader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let extractedText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          extractedText += pageText + '\n';
        }

        resolve(extractedText);
      };

      fileReader.onerror = () => reject('Error reading the file');
      fileReader.readAsArrayBuffer(file);
    });
  };

  const generateInterviewQuestions = async (resumeText) => {
    try {
      const groqClient = new Groq({ 
        apiKey: GROQ_API_KEY, 
        dangerouslyAllowBrowser: true 
      });
  
      const prompt = `Analyze this resume carefully and generate 10 unique technical interview questions. 
  Resume: ${resumeText}
  -If they gave resume asks different questions each time,like if they provide a resume,asking 10 questions me if they are giving the same resume to you ask some other 10 different questions.Dont repeat the same questions.
  -Asks medium level of questions ,ask small questions.
  REQUIREMENTS:
  1. Question Difficulty:
     - Start with fundamental concepts (first 4 questions)
     - Progress to moderate complexity (next 4 questions)
     - End with 2 scenario-based questions
  
  2. Question Types:
     - Technical concepts from their listed skills
     - Tools and technologies they've actually used
     - Basic problem-solving scenarios from their work experience
     - Real-world applications of their knowledge
  
  3. Question Structure:
     - Must be clearly worded and specific
     - Should require explanatory answers (not just yes/no)
     - Should relate directly to their background
     - Avoid theoretical concepts they haven't encountered
  
  4. Focus Areas:
     - Primary technical skills (mentioned multiple times or in recent roles)
     - Core technologies in their industry
     - Common challenges in their domain
     - Best practices they should know
  
  5. Exclude:
     - Complex coding challenges
     - System design questions
     - Framework-specific implementation details
     - Questions about technologies not in their resume
  
  EXAMPLES (adjust based on their actual skills):
  If they know JavaScript:
    "Explain the difference between let, const, and var in JavaScript."
  If they know databases:
    "What are the main differences between NoSQL and SQL databases?"
  If they know cloud services:
    "How do you approach securing sensitive data in cloud applications?"
  
  FORMAT:
  Return exactly 10 questions in this format:
  1. [Basic concept question]
  2. [Tool-specific question]
  3. [Technology question]
  ...etc.
  
  Each question must:
  - Start with a number
  - Be a complete sentence
  - End with a question mark
  - Be separated by a blank line
  
  Make each question unique and ensure it flows logically from their experience.
  Prioritize questions about technologies and concepts they've actively used.`;
  
      const response = await groqClient.chat.completions.create({
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3
      });
  
      let questions = response.choices[0].message.content.split(/\d+\.\s+/).filter(q => q.trim());
      if (questions.length > 10) questions = questions.slice(1, 11);
      return questions;
  
    } catch (error) {
      console.error("Error generating interview questions:", error);
      return [];
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setLoading(true);
    const file = acceptedFiles[0];

    if (file && file.type === 'application/pdf') {
      try {
        const resumeText = await extractTextFromPDF(file);
        const questions = await generateInterviewQuestions(resumeText);

        navigate('/interview', { state: { questions } });
      } catch (error) {
        console.error('Error processing resume:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [navigate]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  return (
    <div className="resume-container">
      <div className="left-section">
        <div className="title-page">AI Interview</div>
        <img src={leftImage} alt="Interview" className="interview-image" />
      </div>

      <div className="right-section">
        <h2 className="upload-title">Upload Resume</h2>

        <div {...getRootProps()} className="upload-container">
          <input {...getInputProps()} />
          <div className="upload-content">
            {loading ? <div className="loading-spinner"></div> : (
              <>
                <p className="upload-subtitle">Drag & Drop or</p>
                <button className="browse-button">Browse File</button>
                <p className="file-type">Only PDF</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resume;
