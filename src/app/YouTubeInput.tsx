"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function YouTubeInput() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const router = useRouter();

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/video-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error analyzing video:", error);
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
      {analysisResult && (
        <div className="mt-4 bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <h2 className="text-lg font-medium text-zinc-300 mb-2">Summary of the video</h2>
          <p className="text-sm text-zinc-400">{analysisResult}</p>
        </div>
      )}
      
    </div>
  );
}

export default YouTubeInput;
