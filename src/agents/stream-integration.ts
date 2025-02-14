import { createDreams, action, memory, extension } from "@daydreamsai/core/v1";
import { Uploader } from "@irys/upload";
import { z } from "zod";

// Stream data types
interface StreamData {
  streamId: number;
  timestamp: number;
  value: number;
  txId?: string;
}

interface StreamMetadata {
  id: number;
  type: 'financial' | 'analytics' | 'custom';
  name: string;
  description?: string;
  settings: {
    dataRate: number;
    retentionPeriod: number;
    storageEnabled: boolean;
  };
}

// Enhanced memory interface
interface StreamMemory extends EnhancedAnalyticsMemory {
  streams: {
    metadata: StreamMetadata;
    data: StreamData[];
  }[];
}

// Stream management schemas
const streamMetadataSchema = z.object({
  type: z.enum(['financial', 'analytics', 'custom']),
  name: z.string(),
  description: z.string().optional(),
  settings: z.object({
    dataRate: z.number().min(1).max(100),
    retentionPeriod: z.number().min(1),
    storageEnabled: z.boolean(),
  }),
});

const streamDataSchema = z.object({
  streamId: z.number(),
  timestamp: z.number(),
  value: z.number(),
});

// Stream data processor
class StreamProcessor {
  private static async storeDataPoint(
    data: StreamData,
    uploader: any
  ): Promise<string> {
    const receipt = await uploader.upload(JSON.stringify(data), {
      tags: [
        { name: 'type', value: 'stream-data' },
        { name: 'stream-id', value: data.streamId.toString() },
        { name: 'timestamp', value: data.timestamp.toString() },
      ],
    });

    return receipt.id;
  }

  static async processDataPoint(
    data: StreamData,
    metadata: StreamMetadata,
    uploader: any
  ): Promise<StreamData> {
    if (metadata.settings.storageEnabled) {
      const txId = await this.storeDataPoint(data, uploader);
      return { ...data, txId };
    }
    return data;
  }

  static pruneStreamData(
    data: StreamData[],
    retentionPeriod: number
  ): StreamData[] {
    const cutoffTime = Date.now() - retentionPeriod * 1000;
    return data.filter(point => point.timestamp >= cutoffTime);
  }
}

// Stream management actions
const createStreamAction = action({
  name: "create-stream",
  schema: streamMetadataSchema,
  memory: memory<StreamMemory>({
    key: "stream-memory",
    create: () => ({
      uploads: [],
      patterns: [],
      marketData: [],
      strategies: [],
      imageProcessing: [],
      streams: [],
      performance: {
        analysisTime: [],
        successRate: 0,
        lastUpdate: Date.now()
      },
      lastPruned: Date.now(),
      batchJobs: []
    })
  }),
  async handler(call, ctx, agent) {
    const streamId = ctx.data.streams.length;
    
    ctx.data.streams.push({
      metadata: {
        id: streamId,
        ...call.data
      },
      data: []
    });

    return {
      success: true,
      streamId,
      message: `Stream created: ${call.data.name}`
    };
  }
});

const addStreamDataAction = action({
  name: "add-stream-data",
  schema: streamDataSchema,
  memory: memory<StreamMemory>({
    key: "stream-memory",
    create: () => ({
      uploads: [],
      patterns: [],
      marketData: [],
      strategies: [],
      imageProcessing: [],
      streams: [],
      performance: {
        analysisTime: [],
        successRate: 0,
        lastUpdate: Date.now()
      },
      lastPruned: Date.now(),
      batchJobs: []
    })
  }),
  async handler(call, ctx, agent) {
    const stream = ctx.data.streams.find(s => s.metadata.id === call.data.streamId);
    if (!stream) {
      throw new Error(`Stream ${call.data.streamId} not found`);
    }

    const irysUploader = await Uploader.withPrivateKey(
      process.env.PRIVATE_KEY!,
      'ethereum'
    );

    const processedData = await StreamProcessor.processDataPoint(
      call.data,
      stream.metadata,
      irysUploader
    );

    stream.data.push(processedData);

    // Prune old data if needed
    stream.data = StreamProcessor.pruneStreamData(
      stream.data,
      stream.metadata.settings.retentionPeriod
    );

    return {
      success: true,
      dataPoint: processedData
    };
  }
});

// Create stream management extension
const streamManagementExtension = extension({
  name: "stream-management",
  actions: [createStreamAction, addStreamDataAction],
});

// Enhanced agent creation with stream support
export function createStreamEnabledAgent(config: {
  groqApiKey: string;
  privateKey: string;
  jwtSecret: string;
  defaultChain?: string;
}) {
  const groq = createGroq({
    apiKey: config.groqApiKey,
  });

  const agent = createDreams({
    model: groq("deepseek-r1-distill-llama-70b"),
    extensions: [
      enhancedAnalyticsExtension,
      streamManagementExtension
    ],
  });

  return agent;
}

// Usage example
async function main() {
  if (!process.env.GROQ_API_KEY || !process.env.PRIVATE_KEY || !process.env.JWT_SECRET) {
    throw new Error("Missing required environment variables");
  }

  const agent = createStreamEnabledAgent({
    groqApiKey: process.env.GROQ_API_KEY,
    privateKey: process.env.PRIVATE_KEY,
    jwtSecret: process.env.JWT_SECRET,
  });

  await agent.start();

  // Create a new stream
  try {
    const streamResult = await agent.run("create-stream", {
      type: 'financial',
      name: 'BTC Price Stream',
      description: 'Real-time BTC price data',
      settings: {
        dataRate: 10,
        retentionPeriod: 3600, // 1 hour
        storageEnabled: true,
      },
    });

    // Add data to the stream
    const dataResult = await agent.run("add-stream-data", {
      streamId: streamResult.streamId,
      timestamp: Date.now(),
      value: 50000,
    });

    console.log("Stream created and data added:", {
      stream: streamResult,
      data: dataResult,
    });
  } catch (error) {
    console.error("Error in stream operations:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
