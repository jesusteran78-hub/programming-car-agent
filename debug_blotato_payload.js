const axios = require('axios');
require('dotenv').config();

const BLOTATO_API_URL = 'https://backend.blotato.com/v2/posts';
const VIDEO_URL = 'https://tempfile.aiquickdraw.com/sora2/1768541987616-i1rqz8g3n6r.mp4';
const ACCOUNT_ID = process.env.BLOTATO_ACCOUNT_ID;
const AUTH_HEADER = { Authorization: `Bearer ${process.env.BLOTATO_API_KEY}` };

async function testPayload(name, payload) {
  console.log(`\n🧪 TESTING: ${name}`);
  try {
    const response = await axios.post(BLOTATO_API_URL, { post: payload }, { headers: AUTH_HEADER });
    console.log(`✅ SUCCESS! Payload '${name}' worked.`);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log('Error:', JSON.stringify(error.response?.data || error.message, null, 2));
    return false;
  }
}

async function runTests() {
  console.log('🚀 STARTING BLOTATO PAYLOAD FINAL REFINEMENT...');

  const baseContent = {
    text: 'Automated test #ProgrammingCar 🛠️',
    mediaUrls: [VIDEO_URL],
    platform: 'tiktok',
  };

  // 1. TIKTOK FULL (Fixed Uppercase Enum)
  await testPayload('TIKTOK_FULL', {
    accountId: ACCOUNT_ID,
    content: baseContent,
    target: {
      targetType: 'tiktok',
      platform: 'tiktok',
      privacyLevel: 'PUBLIC_TO_EVERYONE', // CORRECT ENUM
      disabledComments: false,
      disabledDuet: false,
      disabledStitch: false,
      isYourBrand: false,
      isAiGenerated: true,
      isBrandedContent: false,
    },
  });

  // 2. INSTAGRAM PROBE (Confirmed Working)
  if (process.env.BLOTATO_INSTAGRAM_ID) {
    await testPayload('INSTAGRAM_PROBE', {
      accountId: process.env.BLOTATO_INSTAGRAM_ID,
      content: { ...baseContent, platform: 'instagram' },
      target: { targetType: 'instagram', platform: 'instagram' },
    });
  }

  // 3. YOUTUBE PROBE
  if (process.env.BLOTATO_YOUTUBE_ID) {
    await testPayload('YOUTUBE_PROBE', {
      accountId: process.env.BLOTATO_YOUTUBE_ID,
      content: { ...baseContent, title: 'Programming Car Test', platform: 'youtube' },
      target: {
        targetType: 'youtube',
        platform: 'youtube',
        title: 'Programming Car Test',
        privacyStatus: 'public',
        shouldNotifySubscribers: true,
      },
    });
  }

  // 4. FACEBOOK PROBE
  // 4. FACEBOOK PROBE (Hypothesis: 17257 is Blotato ID, 67739... is Page ID)
  await testPayload('FACEBOOK_HYPOTHESIS_1', {
    accountId: '17257', // The user provided ID (likely Blotato ID)
    content: { ...baseContent, platform: 'facebook' },
    target: {
      targetType: 'facebook',
      platform: 'facebook',
      pageId: '677393602122482', // The old long ID (likely FB Page ID)
    },
  });

  // 4.1 FACEBOOK PROBE (Hypothesis: 17257 is Page ID?)
  // We already tested Account=17257 + Page=17257 and it failed.
  // Let's try ignoring PageId if Blotato can deduce it?
  await testPayload('FACEBOOK_NO_PAGEID', {
    accountId: '17257',
    content: { ...baseContent, platform: 'facebook' },
    target: { targetType: 'facebook', platform: 'facebook' },
  });

  // 5. TWITTER PROBE
  if (process.env.BLOTATO_TWITTER_ID) {
    await testPayload('TWITTER_PROBE', {
      accountId: process.env.BLOTATO_TWITTER_ID,
      content: { ...baseContent, platform: 'twitter' },
      target: { targetType: 'twitter', platform: 'twitter' }, // Confirmed working
    });
  }
}

runTests();
