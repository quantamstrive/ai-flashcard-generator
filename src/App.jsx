import React, { useState } from 'react';
import { Sparkles, Trash2, RotateCw, Upload, FileText } from 'lucide-react';

export default function App() {
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(5);
  const [flashcards, setFlashcards] = useState([]);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfContent, setPdfContent] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setError('');

    try {
      // For PDFs, we need to extract text content
      if (file.type === 'application/pdf') {
        // Convert to base64 for API
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Data = event.target.result.split(',')[1];
          setPdfContent(base64Data);
        };
        reader.readAsDataURL(file);
      } else {
        // For text files, read as text
        const reader = new FileReader();
        reader.onload = (event) => {
          setPdfContent(event.target.result);
        };
        reader.onerror = () => {
          setError('Failed to read file. Please try again.');
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError('Failed to read file. Please try again.');
      console.error(err);
    }
  };

  const generateFlashcards = async () => {
    if (!topic.trim() && !pdfContent) {
      setError('Please enter a topic or upload a PDF');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      let messages = [];
      
      if (pdfContent && uploadedFile?.type === 'application/pdf') {
        // For PDFs, send as document to Claude
        messages = [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfContent
                }
              },
              {
                type: 'text',
                text: `Read this PDF document carefully and generate ${numCards} flashcards based on the key concepts, facts, and information contained in it. Return ONLY a JSON array with no preamble or markdown formatting. Each flashcard should have "front" (question) and "back" (answer) fields. Format: [{"front":"question","back":"answer"}]`
              }
            ]
          }
        ];
      } else if (pdfContent) {
        // For text files
        messages = [
          {
            role: 'user',
            content: `Based on this document content, generate ${numCards} flashcards covering the main topics and concepts. Return ONLY a JSON array with no preamble or markdown formatting. Each flashcard should have "front" (question) and "back" (answer) fields. Format: [{"front":"question","back":"answer"}]\n\nDocument:\n${pdfContent.slice(0, 15000)}`
          }
        ];
      } else {
        // For topic input
        messages = [
          {
            role: 'user',
            content: `Generate ${numCards} flashcards about "${topic}". Return ONLY a JSON array with no preamble or markdown formatting. Each flashcard should have "front" (question) and "back" (answer) fields. Format: [{"front":"question","back":"answer"}]`
          }
        ];
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: messages
        }),
      });

      const data = await response.json();
      const content = data.content[0].text;
      
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const cards = JSON.parse(cleanedContent);
      
      setFlashcards(cards);
      setFlippedCards(new Set());
    } catch (err) {
      setError('Failed to generate flashcards. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFlip = (index) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  const deleteCard = (index) => {
    setFlashcards(flashcards.filter((_, i) => i !== index));
    const newFlipped = new Set(flippedCards);
    newFlipped.delete(index);
    setFlippedCards(newFlipped);
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6 md:p-10" style={{
      backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139, 92, 46, 0.03) 31px, rgba(139, 92, 46, 0.03) 32px)`
    }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-normal text-neutral-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            ✏️ Flashcard Maker
          </h1>
          <p className="text-neutral-600 text-sm">Create study cards from any topic or PDF</p>
        </div>

        {/* Input Section */}
        <div className="bg-white p-6 md:p-8 mb-8 border border-neutral-300 rounded-sm" style={{
          boxShadow: '3px 3px 0 rgba(0,0,0,0.08)'
        }}>
          <div className="space-y-5">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                📎 Upload PDF (optional)
              </label>
              <label className="relative cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-300 rounded hover:bg-amber-100 transition-colors">
                  <Upload className="w-5 h-5 text-amber-700" />
                  <span className="text-neutral-700 text-sm">
                    {uploadedFile ? uploadedFile.name : 'Click to upload PDF or text file'}
                  </span>
                </div>
              </label>
            </div>

            {/* Topic Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                ✍️ Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Type a topic (or upload PDF above)..."
                className="w-full px-4 py-3 border-2 border-neutral-300 rounded focus:outline-none focus:border-amber-400 bg-white transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && generateFlashcards()}
              />
            </div>

            {/* Number of Cards */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                🎯 Number of cards
              </label>
              <input
                type="number"
                value={numCards}
                onChange={(e) => setNumCards(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                min="1"
                max="20"
                className="w-28 px-4 py-3 border-2 border-neutral-300 rounded focus:outline-none focus:border-amber-400 bg-white transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <button
              onClick={generateFlashcards}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-amber-400 text-neutral-900 rounded hover:bg-amber-500 disabled:bg-neutral-300 disabled:text-neutral-500 transition-all font-medium shadow-sm hover:shadow"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  Creating cards...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate flashcards
                </>
              )}
            </button>
          </div>
        </div>

        {/* Flashcards Grid */}
        {flashcards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {flashcards.map((card, index) => (
              <div
                key={index}
                className="relative group perspective"
              >
                <div
                  onClick={() => toggleFlip(index)}
                  className={`bg-white border-2 border-neutral-300 p-6 min-h-[220px] cursor-pointer transition-all duration-300 rounded-sm ${
                    flippedCards.has(index) ? 'rotate-y-180' : ''
                  }`}
                  style={{
                    boxShadow: flippedCards.has(index) 
                      ? '2px 2px 0 rgba(0,0,0,0.1)' 
                      : '4px 4px 0 rgba(0,0,0,0.08)',
                    transform: flippedCards.has(index) ? 'rotateY(180deg)' : 'rotateY(0)',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.2s'
                  }}
                >
                  <div className="h-full flex flex-col justify-between" style={{
                    transform: flippedCards.has(index) ? 'rotateY(180deg)' : 'rotateY(0)'
                  }}>
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-center text-neutral-800 leading-relaxed text-base">
                        {flippedCards.has(index) ? card.back : card.front}
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t-2 border-dashed border-neutral-200 flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        flippedCards.has(index) 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {flippedCards.has(index) ? '✓ Answer' : '? Question'}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">
                        {index + 1} of {flashcards.length}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCard(index);
                  }}
                  className="absolute -top-2 -right-2 p-2 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-sm hover:scale-110"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {flashcards.length === 0 && !isGenerating && (
          <div className="text-center py-16">
            <div className="inline-block p-8 bg-white border-2 border-dashed border-neutral-300 rounded-lg">
              <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium mb-1">
                No flashcards yet
              </p>
              <p className="text-neutral-500 text-sm">
                Upload a PDF or enter a topic to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
