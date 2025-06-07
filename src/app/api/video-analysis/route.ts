import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/config/env";
import { YoutubeTranscript } from "youtube-transcript";


export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log(body);
   

const genAI = new GoogleGenerativeAI(env.REACT_APP_GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const transcript = await YoutubeTranscript.fetchTranscript(body.videoUrl);
const prompt = `
  Summarize the following video transcript:
  <VideoTranscript>
  ${transcript.map((txt) => `[${txt.offset}] ${txt.text}).join(" ")`)}
  </VideoTranscript>
  Please provide a concise summary of the video's content and the breakdown the main points discussed in the video with timestamp of the each content.
`;
console.log(prompt)
const result = await model.generateContent([
  prompt
]);
console.log(result.response.text);

    // TODO: Add input validation here
    // Example: validate required fields like video file, analysis type, etc.
    if (!body) {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    // TODO: Add video analysis logic here
    // This could include:
    // - File upload handling
    // - Video processing
    // - AI/ML analysis
    // - Database operations

    // Placeholder response


    return NextResponse.json(result.response.text(), { status: 200 });
  } catch (error) {
    console.error("Video analysis error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
