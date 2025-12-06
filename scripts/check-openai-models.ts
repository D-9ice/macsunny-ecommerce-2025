/**
 * Check available OpenAI models for the current API key
 * Run with: npx tsx scripts/check-openai-models.ts
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
      .filter(model => model.id.includes('gpt') || model.id.includes('o1'))
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
      'o1-preview',
      'o1-mini',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4',
      'chatgpt-4o-latest'
    ];

    flagshipModels.forEach(modelName => {
      const available = gptModels.some(m => m.id === modelName);
      console.log(`  ${available ? '✅' : '❌'} ${modelName} ${available ? '(AVAILABLE)' : '(NOT AVAILABLE)'}`);
    });

    // Check for vision-capable models
    console.log('\n👁️ Vision-Capable Models:');
    const visionModels = gptModels.filter(m => 
      m.id.includes('vision') || 
      m.id.includes('gpt-4o') || 
      m.id === 'gpt-4-turbo'
    );
    
    if (visionModels.length > 0) {
      visionModels.forEach(model => {
        console.log(`  ✅ ${model.id}`);
      });
    } else {
      console.log('  ℹ️ Vision capability available in: gpt-4-turbo, gpt-4o');
    }

  } catch (error: any) {
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
