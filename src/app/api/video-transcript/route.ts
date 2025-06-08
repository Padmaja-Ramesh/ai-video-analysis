import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/config/env";
import { YoutubeTranscript } from "youtube-transcript";
import connectDB from "@/lib/mongodb";
import VideoAnalysis from "@/models/VideoAnalysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.videoUrl) {
      return NextResponse.json({
        success: false,
        message: "Video URL is required"
      }, { status: 400 });
    }

    // Connect to MongoDB
    await connectDB();

    // Check if analysis already exists
    const existingAnalysis = await VideoAnalysis.findOne({ videoUrl: body.videoUrl });
    if (existingAnalysis?.transcript && existingAnalysis?.topics) {
      return NextResponse.json({
        success: true,
        data: {
          transcript: existingAnalysis.transcript,
          topics: existingAnalysis.topics
        }
      }, { status: 200 });
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(body.videoUrl);
    const formattedTranscript = transcript.map(txt => ({
      timestamp: formatTimestamp(txt.offset),
      text: txt.text
    }));

    // Analyze topics using Gemini
    const genAI = new GoogleGenerativeAI(env.REACT_APP_GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Analyze the following video transcript and identify the main topics discussed.
    IMPORTANT: You must respond with a valid JSON object in the exact format specified below, with no additional text or explanation.

    <VideoTranscript>
    ${transcript.map(txt => `[${formatTimestamp(txt.offset)}] ${txt.text}`).join("\n")}
    </VideoTranscript>

    Required JSON format:
    {
      "topics": [
        {
          "name": "Topic name",
          "description": "Brief description of the topic",
          "mentions": [
            {
              "timestamp": "MM:SS",
              "context": "Brief context of when this topic was mentioned"
            }
          ]
        }
      ]
    }

    Rules:
    1. The response must be a valid JSON object
    2. Identify 3-5 main topics
    3. For each topic, include 2-3 key mentions with timestamps
    4. Use MM:SS format for timestamps
    5. Keep descriptions and context concise
    6. Do not include any text outside the JSON object
    `;

    const result = await model.generateContent([prompt]);
    const analysisText = result.response.text();

    // Clean and parse the response
    const cleanedText = analysisText.trim().replace(/^```json\n?|\n?```$/g, '');
    let parsedAnalysis;
    
    try {
      parsedAnalysis = JSON.parse(cleanedText);
      if (!Array.isArray(parsedAnalysis.topics)) {
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

    // Update or create the document in MongoDB
    const updateData = {
      transcript: formattedTranscript,
      topics: parsedAnalysis.topics
    };

    if (existingAnalysis) {
      await VideoAnalysis.findByIdAndUpdate(existingAnalysis._id, updateData);
    } else {
      await VideoAnalysis.create({
        videoUrl: body.videoUrl,
        ...updateData
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        transcript: formattedTranscript,
        topics: parsedAnalysis.topics
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Transcript analysis error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}

// Helper function to format timestamp
function formatTimestamp(offset: number): string {
  const minutes = Math.floor(offset / 60000);
  const seconds = Math.floor((offset % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
} 