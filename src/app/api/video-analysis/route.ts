import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/config/env";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    if (!body || !body.videoUrl) {
      return NextResponse.json({
        success: false,
        message: "Video URL is required"
      }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(env.REACT_APP_GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const transcript = await YoutubeTranscript.fetchTranscript(body.videoUrl);
    
    const prompt = `
    You are a video analysis assistant. Analyze the following video transcript and provide a structured response.
    IMPORTANT: You must respond with a valid JSON object in the exact format specified below, with no additional text or explanation.

    <VideoTranscript>
    ${transcript.map(txt => `[${txt.offset}] ${txt.text}`).join(" ")}
    </VideoTranscript>

    Required JSON format:
    {
      "summary": "A concise 2-3 sentence summary of the video's overall content",
      "main_points": [
        {
          "timestamp": "MM:SS",
          "title": "Brief title of the section",
          "description": "One-sentence explanation of this point"
        }
      ]
    }

    Rules:
    1. The response must be a valid JSON object
    2. Include 3-5 main points
    3. Use MM:SS format for timestamps
    4. Keep descriptions concise
    5. Do not include any text outside the JSON object
    `;

    const result = await model.generateContent([prompt]);
    const analysisText = result.response.text();

    // Clean the response text to ensure it's valid JSON
    const cleanedText = analysisText.trim().replace(/^```json\n?|\n?```$/g, '');
    
    // Parse the response text as JSON
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanedText);
      
      // Validate the structure
      if (!parsedAnalysis.summary || !Array.isArray(parsedAnalysis.main_points)) {
        throw new Error("Invalid analysis structure");
      }
    } catch (error) {
      console.error("Failed to parse analysis as JSON:", error);
      console.error("Raw response:", analysisText);
      return NextResponse.json({
        success: false,
        message: "Failed to parse analysis result"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: parsedAnalysis
    }, { status: 200 });

  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}
