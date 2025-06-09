import { YouTubeInput } from "./YouTubeInput";


export default async function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-zinc-900 to-black">
      <div className="mx-auto max-w-4xl px-3 py-8 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Multimodal Video Analysis
            </h1>
            <p className="mt-4 text-lg text-zinc-300">
              Analyze YouTube videos with AI. Simply paste a YouTube link below
              to extract insights, transcripts, and visual analysis from any
              video content.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-16 space-y-8">
          {/* Video Analysis Section */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 shadow-xl ring-1 ring-white/[0.1] backdrop-blur-sm">
            <div className="p-8">
              <YouTubeInput />
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-white/[0.1] px-5 py-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm hover:from-indigo-900/40 hover:to-purple-900/40 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-2">
                🎥 Video Analysis
              </h3>
              <p className="text-sm text-zinc-300">
                Extract key frames and analyze visual content from YouTube
                videos.
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.1] px-5 py-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm hover:from-purple-900/40 hover:to-pink-900/40 transition-all duration-300">
              <h3 className="text-lg font-semibold text-white mb-2">
                📝 Transcription
              </h3>
              <p className="text-sm text-zinc-300">
                Generate accurate transcripts and identify key topics discussed.
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.1] px-5 py-4 bg-gradient-to-br from-pink-900/30 to-rose-900/30 backdrop-blur-sm hover:from-pink-900/40 hover:to-rose-900/40 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                🤖 AI Insights
              </h3>
              <p className="text-sm text-zinc-300">
                Get intelligent summaries and insights powered by multimodal AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
