import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Groq from 'groq-sdk';
import './HRInterview.css';
import { GROQ_API_KEY } from '../constants/config';

const HRInterview = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(Array(10).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const videoRef = useRef(null);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Initialize speech synthesis
  const speechSynthesis = window.speechSynthesis;
  
  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAnswers(prev => {
          const newAnswers = [...prev];
          newAnswers[currentQuestionIndexRef.current] = transcript;
          return newAnswers;
        });
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speakQuestion = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
    
    utterance.onerror = () => {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };

    speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      if (recognition) {
        recognition.stop();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [recognition]);

  useEffect(() => {
    const generateHRQuestions = async () => {
      const groqClient = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
      try {
        const response = await groqClient.chat.completions.create({
          messages: [{
            role: "user",
            content: `Generate 10 unique HR interview questions focusing on cultural fit, teamwork, problem-solving, and non-technical skills.
              - Ensure the questions are of easy difficulty, avoiding overly tough or tricky phrasing
              - Make each question distinct and practical for real interview settings
              - Phrase them as direct questions ending with question marks
              - Exclude any numbering or introductory text
              - Provide each question on a separate line without any extra formatting
              `
              
              
          }],
          model: "llama3-70b-8192",
          temperature: 0.8
        });

        const questionsText = response.choices[0]?.message?.content;
        const generatedQuestions = questionsText.split('\n')
          .filter(q => q.trim().length > 0)
          .slice(0, 10)
          .map(q => q.replace(/^[^a-zA-Z0-9]+/, '').trim())
          .filter(q => q.length > 0);

        setQuestions(generatedQuestions);
        
        if (generatedQuestions.length > 0) {
          speakQuestion(generatedQuestions[0]);
        }
      } catch (error) {
        console.error("Error generating questions:", error);
        setQuestions([]);
      }
    };

    generateHRQuestions();
  }, [speakQuestion]);

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
            content: `Analyze this HR interview response based on cultural fit, communication, and problem-solving skills.
              Question: ${questions[i]}
              Answer: ${answers[i]}
              Provide a score between 0-10. Return ONLY the numeric score.`
          }],
          model: "llama3-70b-8192",
          temperature: 0.1
        });

        const scoreText = response.choices[0]?.message?.content || '0';
        const score = extractScoreFromResponse(scoreText);
        scores.push(score);
      }

      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      navigate('/hr-results', {
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

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      stopListening();
      setCurrentQuestionIndex(prev => prev + 1);
      speakQuestion(questions[currentQuestionIndex + 1]);
    } else {
      evaluateAnswers();
    }
  };

  const handleReplayQuestion = () => {
    if (questions[currentQuestionIndex]) {
      speakQuestion(questions[currentQuestionIndex]);
    }
  };

  return (
    <div className="interview-root">
      <div className="video-wrapper">
      <video
          ref={videoRef}
          className="interviewer-video"
          src="The AI Video Interview(720P_HD)_1.mp4"
          muted
          playsInline
        />
      </div>
      
      <div className="interview-interface">
        <div className="question-container">
          {questions.length > 0 && (
            <div className="question-box">
              <div className="question-content">
                <h3>Q{currentQuestionIndex + 1}: {questions[currentQuestionIndex]}</h3>
                <button 
                  onClick={handleReplayQuestion}
                  className="replay-button"
                  disabled={isPlaying}
                  title="Replay question"
                >
                  🔊
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="response-area">
          <div className="input-wrapper">
            <textarea
              value={answers[currentQuestionIndex]}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[currentQuestionIndex] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder="Type your answer here or click the microphone to speak..."
              className="response-input"
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className={`mic-button ${isListening ? 'listening' : ''}`}
              title={isListening ? 'Stop recording' : 'Start recording'}
            >
              {isListening ? '🎙️' : '🎤'}
            </button>
          </div>
          <div className="new">
          <button
            onClick={handleNextQuestion}
            className={`next-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting || !questions.length}
          >
            {isSubmitting ? 'Evaluating...' : 
              currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Submit Answers'}
          </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HRInterview;