import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLUB_SYSTEM_PROMPT = {
  type: 'text',
  text: `אתה עוזר AI חכם למועדון מצנחי רחיפה בישראל. אתה מומחה בטיסת מצנח רחיפה, תחזוקת ציוד, בטיחות טיסה ומטאורולוגיה.
ענה תמיד בעברית. היה מקצועי, מדויק ומועיל.
המועדון פעיל באתרי טיסה בישראל - הגלבוע, הכרמל, חרמון ואתרים נוספים.`,
  cache_control: { type: 'ephemeral' }
};

export async function analyzeMaintenanceForecast(equipment) {
  const prompt = `נתח את נתוני הציוד הבאים וספק תחזית תחזוקה מפורטת:

ציוד: ${equipment.name} (${equipment.brand} ${equipment.model})
סוג: ${equipment.type}
תאריך רכישה: ${equipment.purchase_date}
טיסות כולל: ${equipment.total_flights}
שעות טיסה כולל: ${equipment.total_hours}
מצב נוכחי: ${equipment.condition}
בדיקה אחרונה: ${equipment.last_inspection || 'לא ידוע'}
בדיקה הבאה מתוכננת: ${equipment.next_inspection || 'לא נקבעה'}

ספק תחזית מפורטת בפורמט JSON עם השדות הבאים:
{
  "immediate_actions": [{"action": "...", "priority": "high/medium/low", "estimated_cost": 0, "reason": "..."}],
  "upcoming_maintenance": [{"action": "...", "due_date": "YYYY-MM-DD", "estimated_cost": 0}],
  "replacement_forecast": {"item": "...", "expected_date": "YYYY-MM-DD", "estimated_cost": 0, "reason": "..."},
  "overall_health_score": 0-100,
  "safety_concerns": ["..."],
  "recommendations": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: [CLUB_SYSTEM_PROMPT],
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: text };
}

export async function analyzeWeatherSafety(weatherData) {
  const prompt = `נתח את נתוני מזג האוויר הבאים והערך את בטיחות הטיסה:

טמפרטורה: ${weatherData.temperature}°C
מהירות רוח: ${weatherData.windspeed_10m} קמ"ש
כיוון רוח: ${weatherData.winddirection_10m}°
מהירות רוח מקסימלית: ${weatherData.windgusts_10m || 'לא ידוע'} קמ"ש
משקעים: ${weatherData.precipitation} מ"מ
כיסוי עננים: ${weatherData.cloudcover}%
נראות: ${weatherData.visibility ? (weatherData.visibility / 1000).toFixed(1) + ' ק"מ' : 'לא ידוע'}
קוד מזג אוויר WMO: ${weatherData.weathercode}

בצע ניתוח בטיחות מפורט בפורמט JSON:
{
  "safety_rating": "safe/caution/dangerous",
  "flight_recommendation": "go/wait/no_fly",
  "overall_score": 0-100,
  "wind_assessment": {"status": "...", "details": "..."},
  "precipitation_assessment": {"status": "...", "details": "..."},
  "visibility_assessment": {"status": "...", "details": "..."},
  "thermal_conditions": "...",
  "best_flight_window": "...",
  "warnings": ["..."],
  "summary": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: [CLUB_SYSTEM_PROMPT],
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, safety_rating: 'caution' };
}

export async function analyzeStudentProgress(student, enrollments, testScores, lessonProgress) {
  const prompt = `נתח את נתוני ההתקדמות של התלמיד הבא וספק המלצות:

תלמיד: ${student.name}
רמה נוכחית: ${student.current_level}
מדריך: ${student.instructor}
תאריך הצטרפות: ${student.enrollment_date}

קורסים: ${JSON.stringify(enrollments)}
ציוני תיאוריה: ${JSON.stringify(testScores)}
התקדמות בשיעורים: ${JSON.stringify(lessonProgress)}

ספק ניתוח מפורט בפורמט JSON:
{
  "overall_progress": 0-100,
  "strengths": ["..."],
  "areas_for_improvement": ["..."],
  "next_milestones": [{"milestone": "...", "estimated_time": "..."}],
  "theory_readiness": "ready/needs_work/not_ready",
  "practical_readiness": "ready/needs_work/not_ready",
  "recommended_actions": ["..."],
  "instructor_notes": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: [CLUB_SYSTEM_PROMPT],
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { instructor_notes: text };
}

export async function analyzeMarketingInsights(campaigns, leads, customers) {
  const prompt = `נתח את נתוני השיווק הבאים וספק תובנות והמלצות:

קמפיינים: ${JSON.stringify(campaigns)}
לידים: ${JSON.stringify(leads)}
סטטיסטיקות לקוחות: ${JSON.stringify(customers)}

ספק ניתוח בפורמט JSON:
{
  "best_performing_channel": "...",
  "conversion_rate": 0-100,
  "cost_per_acquisition": 0,
  "insights": ["..."],
  "recommendations": ["..."],
  "growth_opportunities": ["..."],
  "budget_allocation_suggestion": {"channel": "allocation_percentage"}
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: [CLUB_SYSTEM_PROMPT],
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [text] };
}

export async function* streamChat(messages) {
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: [CLUB_SYSTEM_PROMPT],
    messages
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
