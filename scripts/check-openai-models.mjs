/**
 * Check available OpenAI models for the current API key
 * Run with: node scripts/check-openai-models.mjs
 */

import OpenAI from 'openai';

async function checkAvailableModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔍 Checking available OpenAI models...\n');

  const openai = new OpenAI({ apiKey });

  try {
    // List all available models
    const models = await openai.models.list();
    
    // Filter for GPT models
    const gptModels = models.data
      .filter(model => model.id.includes('gpt') || model.id.includes('o1') || model.id.includes('chatgpt'))
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log(`✅ Found ${gptModels.length} GPT models:\n`);
    
    gptModels.forEach(model => {
      console.log(`  • ${model.id}`);
    });

    // Check for specific flagship models
    console.log('\n🎯 Flagship Model Availability:');
    
    const flagshipModels = [
      'gpt-5.1',
      'gpt-5',
      'o1',
      'o1-preview',
      'o1-mini',
      'chatgpt-4o-latest',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4',
    ];

    flagshipModels.forEach(modelName => {
      const available = gptModels.some(m => m.id === modelName || m.id.startsWith(modelName));
      console.log(`  ${available ? '✅' : '❌'} ${modelName} ${available ? '(AVAILABLE)' : '(NOT AVAILABLE)'}`);
    });

    // Check for vision-capable models
    console.log('\n👁️ Vision-Capable Models (for component recognition):');
    const visionModels = gptModels.filter(m => 
      m.id.includes('vision') || 
      m.id.includes('gpt-4o') || 
      m.id === 'gpt-4-turbo' ||
      m.id.includes('chatgpt-4o')
    );
    
    if (visionModels.length > 0) {
      visionModels.forEach(model => {
        console.log(`  ✅ ${model.id}`);
      });
    } else {
      console.log('  ℹ️ Vision capability available in: gpt-4-turbo, gpt-4o');
    }

    console.log('\n💡 RECOMMENDATION:');
    if (gptModels.some(m => m.id === 'o1-preview')) {
      console.log('  🌟 Use "o1-preview" for complex reasoning (slower but most accurate)');
    }
    if (gptModels.some(m => m.id === 'chatgpt-4o-latest')) {
      console.log('  🌟 Use "chatgpt-4o-latest" for latest features');
    }
    if (gptModels.some(m => m.id === 'gpt-4-turbo')) {
      console.log('  🌟 Use "gpt-4-turbo" for component recognition (best vision + accuracy)');
    }
    if (gptModels.some(m => m.id === 'gpt-4o')) {
      console.log('  ⚠️ "gpt-4o" is older - upgrade to gpt-4-turbo for better accuracy');
    }

  } catch (error) {
    console.error('\n❌ Error checking models:');
    console.error(`  Status: ${error.status}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.status === 401) {
      console.error('\n💡 Tip: Check if your API key is valid at https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.error('\n💡 Tip: Add credits at https://platform.openai.com/settings/organization/billing/overview');
    }
  }
}

checkAvailableModels();
