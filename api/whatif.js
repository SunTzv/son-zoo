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

    const SYSTEM_PROMPT = `You are a chaotic, wildly creative alternate history engine.
The user gives you a "What If" premise. You must generate EXACTLY 5 events that cascade from it.

CRITICAL RULES:
1. CAUSAL CHAIN: Every event must be a direct consequence of the previous one. The reader should feel each event inevitably crashing into the next like dominoes. No random jumps.
2. TIME JUMPS: The time gaps between events must feel EARNED. If something takes decades to collapse, skip decades. If civilization ends overnight, jump centuries. Let the chaos dictate the clock — don't space events evenly.
3. ESCALATION: Each event must be bigger, stranger, and more unhinged than the last. Start grounded, end cosmic.
4. FINAL EVENT: The 5th event must be the ultimate, irreversible consequence of this specific timeline. The year must make narrative sense — it could be 5 years later or 5000 years later. Do NOT default to 3000. Ask yourself: when does this story truly END?
5. TONE: Hilarious, absurd, and deadpan. Write like a drunk historian who somehow nailed it.

Your response MUST be a valid JSON array of 5 objects. Raw JSON only — no markdown, no commentary.
Each object must have:
- "year": A string year that makes narrative sense for this specific event (e.g. "1962", "2041", "2847")
- "title": A short, casual title. NOT dramatic. Think newspaper headline written by a tired intern (e.g. "Pigeons, Apparently, Own a Bank Now", "Things Escalate Quickly in Ohio", "Scientists Confirm: Yep, That's a Problem")
- "desc": 2-3 sentences written like a funny friend telling you a story. Conversational, punchy, slightly unhinged. Each event must directly cause the next — the reader should feel the domino fall.
- "keyword": A SINGLE generic noun for a stock photo (e.g. "volcano", "robot", "penguin", "satellite")`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GEMMA_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: JSON.stringify({
                model: 'gemma-4-31b-it',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `What if ${prompt}` }
                ],
                temperature: 0.8,
                max_tokens: 2048  // Prevent truncated JSON!
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq API rejected the request: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        let jsonStr = data.choices[0].message.content.trim();
        jsonStr = jsonStr.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();

        // Strip markdown if necessary
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }

        // Robustly extract the JSON array just in case the model adds conversational text
        const match = jsonStr.match(/\[[\s\S]*\]/);
        if (match) jsonStr = match[0];

        // Sanitize common Unicode garbage that breaks JSON.parse
        jsonStr = jsonStr
            .replace(/[\u2010-\u2015]/g, '-')  // unicode dashes -> regular dash
            .replace(/[\u2018\u2019]/g, "'")    // unicode single quotes
            .replace(/[\u201C\u201D]/g, '"');   // unicode double quotes (outside of structure)

        // First parse attempt
        try {
            const events = JSON.parse(jsonStr);
            return res.status(200).json(events);
        } catch (firstParseError) {
            // Second AI check: ask the model to fix its own broken JSON
            console.warn('First parse failed, attempting AI repair...', firstParseError.message);

            const repairResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GEMMA_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gemma-4-31b-it',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a JSON repair bot. The user will give you broken or truncated JSON. You must return ONLY the fixed, complete, valid JSON array with exactly 5 objects. No markdown. No explanation. Just raw JSON.'
                        },
                        {
                            role: 'user',
                            content: `Fix this broken JSON and return only the complete valid array:\n${jsonStr}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 2048
                })
            });

            const repairData = await repairResponse.json();
            let repairedStr = repairData.choices[0].message.content.trim();
            repairedStr = repairedStr.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();

            if (repairedStr.startsWith('```')) {
                repairedStr = repairedStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
            }
            const repairMatch = repairedStr.match(/\[[\s\S]*\]/);
            if (repairMatch) repairedStr = repairMatch[0];

            try {
                const events = JSON.parse(repairedStr);
                return res.status(200).json(events);
            } catch (secondParseError) {
                throw new Error(`Both parse attempts failed. Final error: ${secondParseError.message}. Raw: ${repairedStr}`);
            }
        }
    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ error: 'Failed to generate timeline', details: error.message });
    }
}
