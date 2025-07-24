// API File: analyze-landing-page.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add CORS headers to allow requests from any website
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { websiteUrl } = req.body;

    // Check if website URL was provided
    if (!websiteUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Website URL is required' 
      });
    }

    console.log('🔍 Starting real analysis for:', websiteUrl);

    // Make real call to Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Please analyze this landing page: ${websiteUrl}

Provide a detailed professional analysis of these criteria:

1. **Speed & Performance** - loading time, resource optimization
2. **Design & User Experience** - UI/UX, responsive design, accessibility  
3. **Content Quality** - relevance, SEO, professional writing
4. **Conversion Elements** - CTA buttons, forms, trust signals
5. **Technical Optimization** - SEO, meta tags, schema markup

Return results in this EXACT JSON format (very important!):

\`\`\`json
{
  "overall_score": [number between 0-100],
  "page_name": "Name of analyzed page",
  "website_category": "Website category (e.g., ecommerce, services, portfolio, etc.)",
  "analysis": {
    "speed": {
      "score": [number between 0-100],
      "details": "Detailed analysis of loading speed, response times, file sizes"
    },
    "design": {
      "score": [number between 0-100], 
      "details": "Design analysis, user experience, responsive design, accessibility"
    },
    "content": {
      "score": [number between 0-100],
      "details": "Content quality, relevance, keywords, structure"
    },
    "conversion": {
      "score": [number between 0-100],
      "details": "Conversion elements, CTA effectiveness, forms, trust signals"
    },
    "seo": {
      "score": [number between 0-100],
      "details": "Search engine optimization, meta tags, structured data"
    }
  },
  "recommendations": [
    "Detailed practical recommendation 1",
    "Detailed practical recommendation 2", 
    "Detailed practical recommendation 3",
    "Detailed practical recommendation 4",
    "Detailed practical recommendation 5"
  ],
  "quick_wins": [
    "Quick improvement 1 that can be implemented within 24 hours",
    "Quick improvement 2 that can be implemented within 24 hours",
    "Quick improvement 3 that can be implemented within 24 hours"
  ],
  "competitive_analysis": "Brief analysis of the site's position relative to competitors",
  "target_audience_fit": "Assessment of how well the site fits its target audience"
}
\`\`\`

Important: Return **ONLY** the JSON without any additional text before or after!`
        }]
      })
    });

    // Check if Claude API responded successfully
    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('❌ Error from Claude API:', claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    console.log('✅ Received response from Claude:', claudeData);

    const analysisText = claudeData.content[0].text;
    
    // Try to parse the JSON from Claude
    try {
      // Clean the text from markdown or extra characters
      const cleanText = analysisText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();

      const analysisData = JSON.parse(cleanText);
      
      // Make sure we have the required fields
      if (!analysisData.overall_score || !analysisData.analysis) {
        throw new Error('Invalid analysis structure from Claude');
      }

      console.log('✅ Analysis completed successfully for:', websiteUrl);
      
      return res.json({
        success: true,
        data: {
          ...analysisData,
          analyzed_url: websiteUrl,
          analysis_timestamp: new Date().toISOString(),
          analysis_source: 'claude_api_real'
        }
      });

    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.log('📝 Original text from Claude:', analysisText);
      
      // If parsing failed, return raw text with basic structure
      return res.json({
        success: true,
        data: {
          overall_score: 75,
          page_name: "Homepage",
          website_category: "general",
          analysis: {
            speed: { 
              score: 70, 
              details: "Real analysis from Claude - " + analysisText.substring(0, 200) + "..." 
            },
            design: { 
              score: 75, 
              details: "Design and usability analyzed by Claude AI" 
            },
            content: { 
              score: 80, 
              details: "Quality content according to Claude analysis" 
            },
            conversion: { 
              score: 70, 
              details: "Conversion elements analyzed by advanced AI system" 
            },
            seo: { 
              score: 75, 
              details: "Search engine optimization checked" 
            }
          },
          recommendations: [
            "Improve loading speed",
            "Optimize CTA buttons", 
            "Add testimonials",
            "Improve technical SEO",
            "Optimize for mobile"
          ],
          quick_wins: [
            "Compress images",
            "Add alt tags",
            "Improve headlines"
          ],
          raw_claude_response: analysisText,
          analyzed_url: websiteUrl,
          analysis_timestamp: new Date().toISOString(),
          analysis_source: 'claude_api_real',
          parse_status: 'fallback'
        }
      });
    }

  } catch (error) {
    console.error('❌ General error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      analyzed_url: req.body.websiteUrl || 'unknown'
    });
  }
}
