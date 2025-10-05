const axios = require('axios');
const fs = require('fs');

async function testGeminiApi() {
    try {
        // Read config to get API key and model
        const configRaw = fs.readFileSync('./.docaiConfig.json', 'utf-8');
        const config = JSON.parse(configRaw);

        const apiKey = config.gemini_api_key;
        const model = config.gemini_model;

        if (!apiKey) {
            console.error('Error: Gemini API key not found in .docaiConfig.json');
            return;
        }

        console.log(`Testing with model: ${model}...`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{
                    text: 'Hello, world!'
                }]
            }]
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 second timeout
        });

        console.log('✅ API call successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ API call failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testGeminiApi();
