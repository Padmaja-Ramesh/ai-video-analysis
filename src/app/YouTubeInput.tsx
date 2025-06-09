"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TranscriptionSection } from "./components/TranscriptionSection";
import ModelSelector from "./components/ModelSelector";

interface MainPoint {
  timestamp: string;
  title: string;
  description: string;
}

interface AnalysisResult {
  summary: string;
  main_points: MainPoint[];
}

interface ApiResponse {
  success: boolean;
  data?: AnalysisResult;
  message?: string;
}

export function YouTubeInput() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/video-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl }),
      });
      const data: ApiResponse = await response.json();
      console.log(data)
      
      if (!data.success) {
        throw new Error(data.message || "Failed to analyze video");
      }
      
      if (!data.data) {
        throw new Error("No analysis data received");
      }
      
      setAnalysisResult(data.data);
    } catch (error) {
      console.error("Error analyzing video:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="youtube-url"
            className="block text-sm font-medium text-zinc-300 mb-2"
          >
            YouTube Video URL
          </label>
          <input
            id="youtube-url"
            type="url"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="button"
          disabled={!videoUrl.trim()}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          onClick={handleAnalyze}
        >
          {isLoading ? "Analyzing..." : "Analyze Video"}
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

      {analysisResult && (
        <div className="mt-4 bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <h2 className="text-lg font-medium text-zinc-300 mb-2">🎤 Video Summary</h2>
          <p className="text-sm text-zinc-400 mb-4">
            <strong>Summary:</strong> {analysisResult.summary}
          </p>

          <h3 className="text-md font-semibold text-zinc-300 mb-2">🧭 Main Points with Timestamps</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-zinc-400">
            {analysisResult.main_points.map((point, index) => {
              // Extract the first start timestamp in seconds
              const match = point.timestamp.match(/(\d+):(\d+)/);
              const seconds = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
              const href = `${videoUrl}&t=${seconds}s`;

              return (
                <li key={index}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    <strong>{point.timestamp}</strong>
                  </a>
                  <br />
                  <em>{point.title}:</em> {point.description}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Transcription Section */}
      <div className="mt-8">
        <TranscriptionSection videoUrl={videoUrl} />
      </div>
          <div className="mt-8">
          <ModelSelector videoUrl={ "gemini-2.0-flash" , videoUrl} />
        </div>
      </div>
  );
}

export default YouTubeInput;
