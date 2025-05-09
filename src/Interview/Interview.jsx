import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Groq from 'groq-sdk';
import './Interview.css';
import { GROQ_API_KEY } from '../constants/config';


const Interview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [answers, setAnswers] = useState(Array(10).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (location.state?.questions) {
      setQuestions(location.state.questions);
    }
  }, [location]);

  const extractScoreFromResponse = (responseText) => {
    const match = responseText.match(/\b\d{1,2}\b/);
    return match ? Math.min(10, Math.max(0, parseInt(match[0]))) : 0;
  };

  const evaluateAnswers = async () => {
    setIsSubmitting(true);
    const groqClient = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
    const scores = [];

    try {
      for (let i = 0; i < questions.length; i++) {
        if (!answers[i].trim()) {
          scores.push(0);
          continue;
        }
        const response = await groqClient.chat.completions.create({
          messages: [{
            role: "user",
            content: `Analyze this Q&A for a technical interview. Consider technical accuracy, completeness, and clarity.
              Question: ${questions[i]}
              Answer: ${answers[i]}
              
              Provide a score between 0-10 where:
              -0:If they didn't provide any answers,and like I dont know,or som irrelevant answers
              - 0-3: Completely incorrect or missing
              - 4-6: Partially correct but incomplete
              - 7-8: Correct but could be improved
              - 9-10: Excellent, comprehensive answer
              Analyze properly and provide the mark accurately.
                  
              Return ONLY the numeric score without any explanation.`
          }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1
        });

        const scoreText = response.choices[0]?.message?.content || '0';
        const score = extractScoreFromResponse(scoreText);
        scores.push(score);
      }

      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      navigate('/results', { 
        state: { 
          scores,
          totalScore,
          passed: totalScore >= 60,
          questions, 
          answers 
        } 
      });
    } catch (error) {
      console.error("Evaluation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="interview-container" >
      <h1 className="interview-header">Technical Interview</h1>

      <div className="questions-container">
        {questions.map((question, index) => (
          <div key={index} className="question-card">
            <h3>Q{index + 1}: {question}</h3>
            <textarea
              value={answers[index]}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[index] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder="Type your answer here..."
              className="answer-input"
            />
          </div>
        ))}
      </div>

      <button 
        onClick={evaluateAnswers} 
        className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Evaluating...' : 'Submit Answers'}
      </button>
    </div>
  );
};

export default Interview;