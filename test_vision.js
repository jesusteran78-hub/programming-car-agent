require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testVision() {
  const imageUrl =
    'https://s3.eu-central-1.wasabisys.com/in-files/17864782531/jpeg-2a433b09198f3bcb51a9-80b60429068f0a.jpeg';

  console.log('🧪 Testing GPT-4o Vision with URL:', imageUrl);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the VIN from this image. If found, just print the VIN.',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log('🤖 Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

testVision();
