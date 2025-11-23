import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, User } from "../types";

export const analyzeAttendance = async (records: AttendanceRecord[], users: User[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API Key not configured. Unable to perform AI analysis.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Prepare data for the prompt
  const today = new Date().toISOString().split('T')[0];
  const todaysRecords = records.filter(r => r.date === today);
  
  const summaryData = users.map(user => {
    const userLogs = todaysRecords.filter(r => r.user_id === user.id);
    const checkIn = userLogs.find(r => r.type === 'حضور');
    const checkOut = userLogs.find(r => r.type === 'انصراف');
    return {
      name: user.full_name,
      checkIn: checkIn ? checkIn.timestamp.split('T')[1].substring(0, 5) : 'Missing',
      checkOut: checkOut ? checkOut.timestamp.split('T')[1].substring(0, 5) : 'Missing',
    };
  });

  const prompt = `
    Analyze the following attendance data for today (${today}).
    Identify who is absent (no records), who came late (assume 9:00 AM is start), and who left early (assume 5:00 PM is end).
    Provide a concise summary in Arabic.
    
    Data:
    ${JSON.stringify(summaryData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "لم يتمكن الذكاء الاصطناعي من تحليل البيانات.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي.";
  }
};