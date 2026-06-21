/**
 * scripts/prepare_finetuning.js
 * Compiles user queries and helpful AI responses into JSONL format for LLM fine-tuning.
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function compile() {
  console.log('🔄 Compiling dataset for fine-tuning from llm_logs...');
  try {
    // Select chatbot logs that had positive feedback or neutral feedback (filtering out negative ones)
    const [rows] = await db.query(
      `SELECT prompt, response FROM llm_logs 
       WHERE feature_name = 'chatbot' AND feedback >= 0
       ORDER BY created_at DESC 
       LIMIT 100`
    );

    if (rows.length === 0) {
      console.log('⚠️ No logs found in database. Generating a seed sample fine-tuning file...');
      const seedData = [
        {
          messages: [
            { role: "system", content: "You are BloodConnect AI Assistant, answering blood eligibility rules." },
            { role: "user", content: "Can I donate if I got a tattoo?" },
            { role: "assistant", content: "You must wait 6 months after getting a tattoo or body piercing before donating blood." }
          ]
        },
        {
          messages: [
            { role: "system", content: "You are BloodConnect AI Assistant, answering blood eligibility rules." },
            { role: "user", content: "Who can O+ receive blood from?" },
            { role: "assistant", content: "An O+ individual can receive blood from O- and O+ donors." }
          ]
        }
      ];

      const outPath = path.join(__dirname, '../data/finetune_dataset.jsonl');
      const lines = seedData.map(obj => JSON.stringify(obj)).join('\n');
      fs.writeFileSync(outPath, lines);
      console.log(`✅ Seed fine-tuning file created successfully at: ${outPath}`);
      process.exit(0);
    }

    const systemMsg = "You are BloodConnect AI Assistant, an expert virtual assistant answering blood eligibility rules and compatibility queries.";
    const jsonlLines = rows.map(r => {
      return JSON.stringify({
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: r.prompt },
          { role: "assistant", content: r.response }
        ]
      });
    });

    const outPath = path.join(__dirname, '../data/finetune_dataset.jsonl');
    fs.writeFileSync(outPath, jsonlLines.join('\n'));
    console.log(`✅ Fine-tuning dataset written successfully (${rows.length} lines) to: ${outPath}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to compile fine-tuning dataset:', err);
    process.exit(1);
  }
}

compile();
