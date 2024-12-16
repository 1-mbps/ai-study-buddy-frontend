import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [currentScreen, setCurrentScreen] = useState('sessions');
  const [sessionQuestions, setSessionQuestions] = useState({});
  const [visibleAnswers, setVisibleAnswers] = useState({});
  const [userNotes, setUserNotes] = useState({});
  const [expandedAccordions, setExpandedAccordions] = useState({});

  const handleCreateSession = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = async event => {
      const file = event.target.files[0];
      if (file) {
        const base64 = await toBase64(file);
        const jsonFile = {
          filename: file.name,
          content_type: file.type,
          content: base64.split(',')[1],
        };

        const response = await fetch('http://localhost:8000/session', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: jsonFile }),
        });

        if (response.ok) {
          const result = await response.json();
          setSessions([...sessions, result]);
        } else {
          console.error('Failed to create session');
        }
      }
    };
    fileInput.click();
  };

  const handleGenerateQuestions = async () => {
    try {
      const response = await fetch('http://localhost:8000/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          start_page: startPage,
          end_page: endPage
        }),
      });

      const result = await response.json();

      // Update questions for this session
      setSessionQuestions(prev => ({
        ...prev,
        [currentSessionId]: [
          ...(prev[currentSessionId] || []),
          { 
            startPage, 
            endPage, 
            questions: result.qa_list 
          }
        ]
      }));

      setShowModal(false);
      setStartPage('');
      setEndPage('');
    } catch (error) {
      console.error('Error generating questions:', error);
    }
  };

  const handleViewQuestions = (sessionId) => {
    setCurrentSessionId(sessionId);
    setCurrentScreen('questions');
  };

  const toggleAnswerVisibility = (setIndex, qaIndex) => {
    const key = `${setIndex}-${qaIndex}`;
    setVisibleAnswers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNoteChange = (setIndex, qaIndex, note) => {
    const key = `${setIndex}-${qaIndex}`;
    setUserNotes(prev => ({
      ...prev,
      [key]: note
    }));
  };

  const toBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });

  const toggleAccordion = (setIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [setIndex]: !prev[setIndex]
    }));
  };

  // Render Sessions Screen (unchanged)
  const renderSessionsScreen = () => (
    <div className="app-container">
      <h1>AI Study Buddy</h1>
      
      <button 
        onClick={handleCreateSession} 
        className="upload-button"
      >
        Upload New Document
      </button>

      {sessions.length === 0 ? (
        <p className="no-sessions">No Current Sessions</p>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session, index) => (
            <div key={index} className="session-card">
              <div className="session-header">
                <h2>{session.session_name || 'Unnamed Document'}</h2>
              </div>
              <div className="session-content">
                <p><strong>Session ID:</strong> {session.session_id}</p>
              </div>
              <div className="session-footer">
                <button 
                  onClick={() => {
                    setCurrentSessionId(session.session_id);
                    setShowModal(true);
                  }}
                  className="generate-questions-button generate-button"
                >
                  Generate Questions
                </button>
                {sessionQuestions[session.session_id] && (
                  <button 
                    onClick={() => handleViewQuestions(session.session_id)}
                    className="generate-questions-button view-questions-button"
                  >
                    View Questions
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal remains unchanged */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Generate Questions</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="modal-close"
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <input 
                type="text"
                placeholder="Start Page"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
                className="modal-input"
              />
              <input 
                type="text"
                placeholder="End Page"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                className="modal-input"
              />
            </div>
            <div className="modal-footer">
              <button 
                onClick={handleGenerateQuestions}
                className="modal-generate-button"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Questions Screen
  const renderQuestionsScreen = () => {
    const currentSessionQuestions = sessionQuestions[currentSessionId] || [];

    return (
      <div className="app-container questions-view">
        <div className="questions-header">
          <button 
            onClick={() => setCurrentScreen('sessions')} 
            className="back-button"
          >
            &#8592;
          </button>
          <h1>Questions for Session</h1>
        </div>

        {currentSessionQuestions.map((questionSet, setIndex) => {
          const isExpanded = expandedAccordions[setIndex] || false;
          
          return (
            <div key={setIndex} className="accordion">
              <div 
                className="accordion-header" 
                onClick={() => toggleAccordion(setIndex)}
              >
                <h2>Page Range: {questionSet.startPage} - {questionSet.endPage}</h2>
                <span className="accordion-toggle">
                  {isExpanded ? '▼' : '►'}
                </span>
              </div>
              {isExpanded && (
                <div className="accordion-content">
                  {questionSet.questions.map((qa, qaIndex) => {
                    const key = `${setIndex}-${qaIndex}`;
                    const isAnswerVisible = visibleAnswers[key] || false;
                    
                    return (
                      <div key={qaIndex} className="qa-pair">
                        <div className="question">
                          <strong>Q: </strong>{qa.question}
                        </div>
                        <div className="answer-container">
                          <div className="answer-toggle">
                            <button 
                              onClick={() => toggleAnswerVisibility(setIndex, qaIndex)}
                              className="toggle-answer-button"
                            >
                              {isAnswerVisible ? 'Hide Answer' : 'Show Answer'}
                            </button>
                          </div>
                          <div 
                            className={`answer ${isAnswerVisible ? 'visible' : 'hidden'}`}
                          >
                            <strong>A: </strong>{qa.answer}
                          </div>
                          <textarea 
                            className="user-notes"
                            placeholder="Your notes..."
                            value={userNotes[key] || ''}
                            onChange={(e) => handleNoteChange(setIndex, qaIndex, e.target.value)}
                            rows="4"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {currentScreen === 'sessions' 
        ? renderSessionsScreen() 
        : renderQuestionsScreen()}
    </>
  );
};

export default App;