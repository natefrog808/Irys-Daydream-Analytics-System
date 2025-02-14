import { createGroq } from "@ai-sdk/groq";
import { createDreams, action, memory, extension } from "@daydreamsai/core/v1";
import { Uploader } from "@irys/upload";
import { z } from "zod";

// Constants and Types
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_MEMORY_ITEMS = 1000;
const BATCH_SIZE_LIMIT = 50;

type ChainType = "ethereum" | "solana" | "arweave" | "polkadot";

interface IrysUpload {
  id: string;
  data: string;
  timestamp: number;
  chain: ChainType;
  tags: Array<{ name: string; value: string }>;
  status: 'success' | 'failed';
  retries?: number;
  error?: string;
  compressionEnabled?: boolean;
  originalSize?: number;
  compressedSize?: number;
}

interface IrysMemory {
  uploads: IrysUpload[];
  lastPruned: number;
  batchJobs: Array<{
    id: string;
    timestamp: number;
    totalFiles: number;
    successCount: number;
    failureCount: number;
  }>;
}

// Utility Functions
const generateBatchId = () => `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

class DataProcessor {
  static validateContent(data: string): boolean {
    // Basic content validation
    if (!data || data.length === 0) return false;
    if (data.length > 1000000) return false; // 1MB limit
    return true;
  }

  static async compressData(data: string): Promise<{ compressed: string; ratio: number }> {
    // Simple compression simulation - in practice, use a real compression library
    const compressed = Buffer.from(data).toString('base64');
    const ratio = compressed.length / data.length;
    return { compressed, ratio };
  }

  static generateCommonTags(data: string, extraTags: Record<string, string> = {}) {
    const commonTags = [
      { name: "Content-Type", value: "text/plain" },
      { name: "Timestamp", value: new Date().toISOString() },
      { name: "Data-Length", value: data.length.toString() },
      { name: "Agent-Version", value: "1.0.0" },
    ];

    return [
      ...commonTags,
      ...Object.entries(extraTags).map(([name, value]) => ({ name, value })),
    ];
  }
}

// Enhanced Schemas
const chainSchema = z.enum(["ethereum", "solana", "arweave", "polkadot"])
  .describe("Blockchain network to use for Irys upload");

const tagsSchema = z.array(
  z.object({
    name: z.string(),
    value: z.string(),
  })
).optional();

const uploadSchema = z.object({
  data: z.string().describe("Content to upload to Irys"),
  chain: chainSchema.default("ethereum"),
  tags: tagsSchema,
  compress: z.boolean().default(false),
  validateContent: z.boolean().default(true),
});

const batchUploadSchema = z.object({
  files: z.array(z.object({
    data: z.string(),
    tags: tagsSchema,
    compress: z.boolean().default(false),
  })).max(BATCH_SIZE_LIMIT),
  chain: chainSchema.default("ethereum"),
});

// Memory Management
const irysMemory = memory<IrysMemory>({
  key: "irys",
  create() {
    return {
      uploads: [],
      lastPruned: Date.now(),
      batchJobs: [],
    };
  },
});

// Actions
const uploadToIrysAction = action({
  name: "upload-to-irys",
  schema: uploadSchema,
  memory: irysMemory,
  async handler(call, ctx, agent) {
    if (call.data.validateContent && !DataProcessor.validateContent(call.data.data)) {
      throw new Error("Content validation failed");
    }

    let processedData = call.data.data;
    let compressionInfo = null;

    if (call.data.compress) {
      const result = await DataProcessor.compressData(call.data.data);
      processedData = result.compressed;
      compressionInfo = {
        originalSize: call.data.data.length,
        compressedSize: processedData.length,
        ratio: result.ratio,
      };
    }

    let retries = MAX_RETRIES;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        const irysUploader = await Uploader.withPrivateKey(
          process.env.PRIVATE_KEY!,
          call.data.chain
        );

        const tags = DataProcessor.generateCommonTags(processedData, {
          ...(compressionInfo && { compression: 'enabled' }),
        });

        const receipt = await irysUploader.upload(processedData, {
          tags: [...tags, ...(call.data.tags || [])],
        });

        const upload: IrysUpload = {
          id: receipt.id,
          data: call.data.data,
          timestamp: Date.now(),
          chain: call.data.chain,
          tags: call.data.tags || [],
          status: 'success',
          retries: MAX_RETRIES - retries,
          ...(compressionInfo && {
            compressionEnabled: true,
            originalSize: compressionInfo.originalSize,
            compressedSize: compressionInfo.compressedSize,
          }),
        };

        ctx.data.uploads.push(upload);

        return {
          success: true,
          id: receipt.id,
          retries: MAX_RETRIES - retries,
          compression: compressionInfo,
          message: `Successfully uploaded data to Irys on ${call.data.chain}`,
        };
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  },
});

const batchUploadToIrysAction = action({
  name: "batch-upload-to-irys",
  schema: batchUploadSchema,
  memory: irysMemory,
  async handler(call, ctx, agent) {
    const batchId = generateBatchId();
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    const irysUploader = await Uploader.withPrivateKey(
      process.env.PRIVATE_KEY!,
      call.data.chain
    );

    for (const file of call.data.files) {
      try {
        if (file.compress) {
          const { compressed } = await DataProcessor.compressData(file.data);
          file.data = compressed;
        }

        const tags = DataProcessor.generateCommonTags(file.data, {
          batchId,
          index: results.length.toString(),
        });

        const receipt = await irysUploader.upload(file.data, {
          tags: [...tags, ...(file.tags || [])],
        });

        results.push({
          id: receipt.id,
          status: 'success',
          index: results.length,
        });

        successCount++;
      } catch (error) {
        results.push({
          status: 'failed',
          error: (error as Error).message,
          index: results.length,
        });

        failureCount++;
      }
    }

    ctx.data.batchJobs.push({
      id: batchId,
      timestamp: Date.now(),
      totalFiles: call.data.files.length,
      successCount,
      failureCount,
    });

    return {
      batchId,
      results,
      summary: {
        total: call.data.files.length,
        successful: successCount,
        failed: failureCount,
      },
    };
  },
});

// Extension Creation
const irysExtension = extension({
  name: "irys",
  actions: [uploadToIrysAction, batchUploadToIrysAction],
});

// Agent Creation
export function createIrysAgent(config: {
  groqApiKey: string;
  privateKey: string;
  defaultChain?: ChainType;
}) {
  const groq = createGroq({
    apiKey: config.groqApiKey,
  });

  const agent = createDreams({
    model: groq("deepseek-r1-distill-llama-70b"),
    extensions: [irysExtension],
  });

  return agent;
}

// Usage Example
async function main() {
  if (!process.env.GROQ_API_KEY || !process.env.PRIVATE_KEY) {
    throw new Error("Missing required environment variables");
  }

  const agent = createIrysAgent({
    groqApiKey: process.env.GROQ_API_KEY,
    privateKey: process.env.PRIVATE_KEY,
  });

  await agent.start();

  // Example batch upload
  try {
    const batchResult = await agent.run("batch-upload-to-irys", {
      files: [
        {
          data: "Hello, Irys! File 1",
          compress: true,
          tags: [{ name: "File-Index", value: "1" }],
        },
        {
          data: "Hello, Irys! File 2",
          compress: false,
          tags: [{ name: "File-Index", value: "2" }],
        },
      ],
      chain: "ethereum",
    });

    console.log("Batch upload result:", batchResult);
  } catch (error) {
    console.error("Error in batch upload:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
