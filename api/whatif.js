export default async function handler(req, res) {
    // Enable CORS to allow your GitHub Pages site to access this Vercel API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const SYSTEM_PROMPT = `You are a goofy, highly creative alternate history generator.
The user will give you a "What If" prompt.
You must generate exactly 5 historical events that branch off from this prompt.
The events must progress chronologically, and the 5th event MUST take place in the year 3000.
Make the events hilarious, absurd, and escalating in scale.

Your response MUST be a valid JSON array of 5 objects. Do not wrap it in markdown blockquotes. Just the raw JSON.
Each object must have:
- "year": A string representing the year (e.g. "1942", "2099", "3000")
- "title": A short catchy title for the event
- "desc": A 2-3 sentence description of the absurd event
- "keyword": A SINGLE generic keyword noun (e.g. "potato", "cyborg", "dinosaur", "laser") to fetch a stock photo.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHAT_IF_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b', // Restored your model!
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `What if ${prompt}` }
                ],
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq API rejected the request: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        let jsonStr = data.choices[0].message.content.trim();

        // Strip markdown if necessary
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }

        // Robustly extract the JSON array just in case the model adds conversational text
        const match = jsonStr.match(/\[[\s\S]*\]/);
        if (match) {
            jsonStr = match[0];
        }

        try {
            const events = JSON.parse(jsonStr);
            return res.status(200).json(events);
        } catch (parseError) {
            throw new Error(`LLM generated invalid JSON: ${parseError.message}. Raw Output: ${jsonStr}`);
        }
    } catch (error) {
        console.error('API Error:', error.message);
        // Return the exact error message so the frontend can see WHY it failed!
        return res.status(500).json({ error: 'Failed to generate timeline', details: error.message });
    }
}
