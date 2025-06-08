"use client";

import { useState } from "react";

interface TranscriptEntry {
  timestamp: string;
  text: string;
}

interface TopicMention {
  timestamp: string;
  context: string;
}

interface Topic {
  name: string;
  description: string;
  mentions: TopicMention[];
}

interface TranscriptionData {
  transcript: TranscriptEntry[];
  topics: Topic[];
}

interface ApiResponse {
  success: boolean;
  data?: TranscriptionData;
  message?: string;
}

interface TranscriptionSectionProps {
  videoUrl: string;
}

export function TranscriptionSection({ videoUrl }: TranscriptionSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = async () => {
    if (!videoUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/video-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl }),
      });
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to get transcript");
      }
      
      if (!data.data) {
        throw new Error("No transcription data received");
      }
      
      setTranscriptionData(data.data);
    } catch (error) {
      console.error("Error getting transcript:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <button
          type="button"
          disabled={!videoUrl.trim()}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          onClick={handleTranscribe}
        >
          {isLoading ? "Transcribing..." : "Get Transcript"}
        </button>
        {isLoading && (
          <div className="mt-4 text-zinc-400">
            <p>This may take a few seconds...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {transcriptionData && (
        <div className="space-y-6">
          {/* Topics Section */}
          <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
            <h2 className="text-lg font-medium text-zinc-300 mb-4">📚 Key Topics</h2>
            <div className="space-y-6">
              {transcriptionData.topics.map((topic, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="text-md font-semibold text-zinc-300">{topic.name}</h3>
                  <p className="text-sm text-zinc-400">{topic.description}</p>
                  <div className="space-y-1">
                    {topic.mentions.map((mention, mIndex) => {
                      const match = mention.timestamp.match(/(\d+):(\d+)/);
                      const seconds = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
                      const href = `${videoUrl}&t=${seconds}s`;

                      return (
                        <div key={mIndex} className="text-sm text-zinc-400">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {mention.timestamp}
                          </a>
                          : {mention.context}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript Section */}
          <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
            <h2 className="text-lg font-medium text-zinc-300 mb-4">📝 Full Transcript</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transcriptionData.transcript.map((entry, index) => {
                const match = entry.timestamp.match(/(\d+):(\d+)/);
                const seconds = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
                const href = `${videoUrl}&t=${seconds}s`;

                return (
                  <div key={index} className="text-sm text-zinc-400">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {entry.timestamp}
                    </a>
                    : {entry.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 