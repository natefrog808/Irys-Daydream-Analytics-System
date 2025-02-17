// verifiable-computations.ts

import { AgentNode, TransactionId, ComputationProof } from './nexus-agent-network';
import { ValidationResults } from './types/analysis';
import { ProcessingMetrics } from './types/processing';
import { IrysUploader } from '@irys/sdk';

/**
 * Types of AI computations
 */
export type ComputationType = 
  | 'inference'
  | 'training'
  | 'optimization'
  | 'validation'
  | 'analysis'
  | 'transformation'
  | 'custom';

/**
 * Verification levels
 */
export type VerificationLevel = 
  | 'basic'      // Input/output verification
  | 'standard'   // Step-by-step verification
  | 'enhanced'   // Cross-agent validation
  | 'full';      // Consensus-based verification

/**
 * Core computation interface
 */
export interface Computation {
  id: string;
  type: ComputationType;
  timestamp: number;
  agent: AgentNode;
  input: any;
  config: ComputationConfig;
  steps: ComputationStep[];
  output: any;
  proof: ComputationProof;
  verification: VerificationInfo;
  storage?: StorageInfo;
}

/**
 * Configuration for computations
 */
export interface ComputationConfig {
  verificationLevel: VerificationLevel;
  consensus: {
    required: boolean;
    threshold: number;
    minValidators: number;
  };
  resources: {
    maxMemory: number;
    maxCpu: number;
    timeout: number;
  };
  reproducibility: {
    saveState: boolean;
    saveSeed: boolean;
    saveEnvironment: boolean;
  };
}

/**
 * Individual computation step
 */
export interface ComputationStep {
  id: string;
  type: string;
  timestamp: number;
  input: any;
  operation: string;
  parameters: Map<string, any>;
  output: any;
  metrics: StepMetrics;
  verification?: StepVerification;
}

/**
 * Metrics for computation steps
 */
export interface StepMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  inputSize: number;
  outputSize: number;
}

/**
 * Verification information for steps
 */
export interface StepVerification {
  verified: boolean;
  verifier: AgentId;
  timestamp: number;
  proof: any;
}

/**
 * Storage information
 */
export interface StorageInfo {
  txId: TransactionId;
  timestamp: number;
  verified: boolean;
  metadata: {
    size: number;
    checksum: string;
    compression: boolean;
    encryption: boolean;
  };
}

/**
 * Main Verifiable Computation class
 */
export class VerifiableComputation {
  private agent: AgentNode;
  private irys: IrysUploader;
  private validators: Map<AgentId, AgentNode>;
  private computations: Map<string, Computation>;
  private metrics: ComputationMetrics;

  constructor(
    agent: AgentNode,
    irys: IrysUploader,
    validators: Map<AgentId, AgentNode>
  ) {
    this.agent = agent;
    this.irys = irys;
    this.validators = validators;
    this.computations = new Map();
    this.metrics = new ComputationMetrics();
  }

  /**
   * Execute and prove a computation
   */
  async executeAndProve(
    type: ComputationType,
    input: any,
    config: Partial<ComputationConfig> = {}
  ): Promise<Computation> {
    // Initialize computation
    const computation = await this.initializeComputation(type, input, config);

    try {
      // Execute computation with tracking
      const output = await this.executeComputation(computation);
      computation.output = output;

      // Generate and verify proof
      const proof = await this.generateProof(computation);
      computation.proof = proof;

      // Verify computation
      const verification = await this.verifyComputation(computation);
      computation.verification = verification;

      // Store on blockchain if verified
      if (verification.verified) {
        const storage = await this.storeComputation(computation);
        computation.storage = storage;
      }

      // Update metrics
      this.metrics.recordComputation(computation);

      // Store computation
      this.computations.set(computation.id, computation);

      return computation;
    } catch (error) {
      await this.handleComputationError(computation, error);
      throw error;
    }
  }

  /**
   * Verify an existing computation
   */
  async verifyExistingComputation(
    computationId: string
  ): Promise<VerificationInfo> {
    const computation = this.computations.get(computationId);
    if (!computation) {
      throw new Error(`Computation ${computationId} not found`);
    }

    return this.verifyComputation(computation);
  }

  /**
   * Initialize a new computation
   */
  private async initializeComputation(
    type: ComputationType,
    input: any,
    configOverride: Partial<ComputationConfig>
  ): Promise<Computation> {
    const timestamp = Date.now();
    const id = `comp_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    const defaultConfig: ComputationConfig = {
      verificationLevel: 'standard',
      consensus: {
        required: true,
        threshold: 0.66,
        minValidators: 3
      },
      resources: {
        maxMemory: 1024 * 1024 * 1024, // 1GB
        maxCpu: 80, // 80% CPU usage
        timeout: 300000 // 5 minutes
      },
      reproducibility: {
        saveState: true,
        saveSeed: true,
        saveEnvironment: true
      }
    };

    return {
      id,
      type,
      timestamp,
      agent: this.agent,
      input,
      config: { ...defaultConfig, ...configOverride },
      steps: [],
      output: null,
      proof: null,
      verification: {
        verified: false,
        verificationLevel: defaultConfig.verificationLevel,
        verifiers: [],
        consensus: 0,
        timestamp: null
      }
    };
  }

  /**
   * Execute a computation with step tracking
   */
  private async executeComputation(
    computation: Computation
  ): Promise<any> {
    const startTime = Date.now();
    const steps: ComputationStep[] = [];

    // Track computation state
    let currentState = computation.input;
    
    // Execute each operation
    for (const operation of this.getOperations(computation.type)) {
      const step = await this.executeStep(
        operation,
        currentState,
        computation.config
      );
      
      steps.push(step);
      currentState = step.output;

      // Verify step if required
      if (computation.config.verificationLevel !== 'basic') {
        const verification = await this.verifyStep(step);
        step.verification = verification;
      }
    }

    computation.steps = steps;
    
    return currentState;
  }

  /**
   * Execute a single computation step
   */
  private async executeStep(
    operation: string,
    input: any,
    config: ComputationConfig
  ): Promise<ComputationStep> {
    const startTime = Date.now();
    
    try {
      // Execute operation
      const output = await this.agent.experts.compute({
        operation,
        input,
        parameters: this.getOperationParameters(operation)
      });

      // Calculate metrics
      const metrics = {
        duration: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0, // Would need system-specific implementation
        inputSize: JSON.stringify(input).length,
        outputSize: JSON.stringify(output).length
      };

      return {
        id: `step_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
        type: operation,
        timestamp: startTime,
        input,
        operation,
        parameters: this.getOperationParameters(operation),
        output,
        metrics
      };
    } catch (error) {
      throw new Error(`Step execution failed: ${error.message}`);
    }
  }

  /**
   * Generate proof for a computation
   */
  private async generateProof(
    computation: Computation
  ): Promise<ComputationProof> {
    return {
      id: computation.id,
      type: computation.type,
      timestamp: Date.now(),
      input: computation.input,
      steps: computation.steps.map(step => ({
        id: step.id,
        operation: step.operation,
        inputHash: this.hashData(step.input),
        outputHash: this.hashData(step.output),
        parameters: step.parameters
      })),
      output: computation.output,
      verification: {
        level: computation.config.verificationLevel,
        validators: Array.from(this.validators.keys())
      }
    };
  }

  /**
   * Verify a computation
   */
  private async verifyComputation(
    computation: Computation
  ): Promise<VerificationInfo> {
    const verificationStart = Date.now();
    
    // Basic verification
    if (!this.verifyBasics(computation)) {
      return this.createFailedVerification('Basic verification failed');
    }

    // Step verification
    if (computation.config.verificationLevel !== 'basic') {
      if (!await this.verifySteps(computation)) {
        return this.createFailedVerification('Step verification failed');
      }
    }

    // Consensus verification
    if (computation.config.consensus.required) {
      const consensusResult = await this.achieveConsensus(computation);
      if (!consensusResult.achieved) {
        return this.createFailedVerification(
          'Failed to achieve consensus',
          consensusResult.verifiers
        );
      }
    }

    return {
      verified: true,
      verificationLevel: computation.config.verificationLevel,
      verifiers: Array.from(this.validators.keys()),
      consensus: 1,
      timestamp: Date.now(),
      duration: Date.now() - verificationStart
    };
  }

  /**
   * Store computation on blockchain
   */
  private async storeComputation(
    computation: Computation
  ): Promise<StorageInfo> {
    const timestamp = Date.now();
    
    // Prepare storage data
    const storageData = {
      computation: {
        id: computation.id,
        type: computation.type,
        timestamp: computation.timestamp,
        input: computation.input,
        output: computation.output,
        proof: computation.proof
      },
      metadata: {
        timestamp,
        version: '1.0.0',
        agent: this.agent.id
      }
    };

    // Store on Irys
    const txId = await this.irys.upload(storageData);

    // Verify storage
    const verified = await this.verifyStorage(txId);

    return {
      txId,
      timestamp,
      verified,
      metadata: {
        size: JSON.stringify(storageData).length,
        checksum: this.hashData(storageData),
        compression: false,
        encryption: false
      }
    };
  }

  /**
   * Verify individual computation steps
   */
  private async verifySteps(
    computation: Computation
  ): Promise<boolean> {
    for (const step of computation.steps) {
      if (!await this.verifyStep(step)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Verify a single step
   */
  private async verifyStep(
    step: ComputationStep
  ): Promise<StepVerification> {
    const verifier = this.selectVerifier();
    
    try {
      // Re-execute step
      const verificationOutput = await verifier.experts.compute({
        operation: step.operation,
        input: step.input,
        parameters: step.parameters
      });

      // Compare outputs
      const verified = this.compareOutputs(step.output, verificationOutput);

      return {
        verified,
        verifier: verifier.id,
        timestamp: Date.now(),
        proof: {
          originalHash: this.hashData(step.output),
          verificationHash: this.hashData(verificationOutput)
        }
      };
    } catch (error) {
      return {
        verified: false,
        verifier: verifier.id,
        timestamp: Date.now(),
        proof: null
      };
    }
  }

  /**
   * Achieve consensus on computation verification
   */
  private async achieveConsensus(
    computation: Computation
  ): Promise<{
    achieved: boolean;
    verifiers: AgentId[];
  }> {
    const verifiers = Array.from(this.validators.values())
      .slice(0, computation.config.consensus.minValidators);

    const verifications = await Promise.all(
      verifiers.map(validator => 
        this.verifyWithValidator(computation, validator)
      )
    );

    const successfulVerifications = verifications.filter(v => v.success);
    const consensusAchieved = 
      successfulVerifications.length / verifications.length >= 
      computation.config.consensus.threshold;

    return {
      achieved: consensusAchieved,
      verifiers: verifications.map(v => v.validatorId)
    };
  }

  /**
   * Verify computation with a specific validator
   */
  private async verifyWithValidator(
    computation: Computation,
    validator: AgentNode
  ): Promise<{
    success: boolean;
    validatorId: AgentId;
  }> {
    try {
      const result = await validator.experts.compute({
        type: 'verification',
        computation: {
          input: computation.input,
          steps: computation.steps,
          output: computation.output
        }
      });

      return {
        success: result.verified,
        validatorId: validator.id
      };
    } catch (error) {
      return {
        success: false,
        validatorId: validator.id
      };
    }
  }

  /**
   * Handle computation errors
   */
  private async handleComputationError(
    computation: Computation,
    error: Error
  ): Promise<void> {
    // Log error
    console.error(
      `Computation ${computation.id} failed:`,
      error.message
    );

    // Store error information
    await this.irys.upload({
      type: 'computation_error',
      computationId: computation.id,
      error: error.message,
      timestamp: Date.now()
    });

    // Update metrics
    this.metrics.recordError(computation.id, error);
  }

  /**
   * Utility method to hash data
   */
  private hashData(data: any): string {
    // Implement secure hashing
    return 'hash';
  }

  /**
   * Compare computation outputs
   */
  private compareOutputs(
    original: any,
    verification: any
  ): boolean {
    return JSON.stringify(original) === JSON.stringify(verification);
  }

  /**
   * Select a verifier for step verification
   */
  private selectVerifier(): AgentNode {
    const validators = Array.from(this.validators.values());
    const index = Math.floor(Math.random() * validators.length);
    return validators[index];
  }

  /**
   * Create failed verification result
   */
  private createFailedVerification(
    reason: string,
    verifiers: AgentId[] = []
  ): VerificationInfo {
    return {
      verified: false,
      verificationLevel: 'basic',
      verifiers,
      consensus: 0,
      timestamp: Date.now(),
      duration: 0,
      reason
    };
  }

  /**
   * Verify storage on Irys
   */
  private async verifyStorage(
    txId: TransactionId
  ): Promise<boolean> {
    try {
      return await this.irys.verify(txId);
    } catch (error) {
      console.error(`Storage verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get operations for computation type
   */
  private getOperations(type: ComputationType): string[] {
    const operationMap = {
      inference: ['preprocess', 'infer', 'postprocess'],
      training: ['preprocess', 'train', 'validate', 'save'],
      optimization: ['analyze', 'optimize', 'validate'],
      validation: ['validate', 'verify', 'report'],
      analysis: ['collect', 'analyze', 'summarize'],
      transformation: ['parse', 'transform', 'validate'],
      custom: ['execute']
    };
    return operationMap[type] || ['execute'];
  }

  /**
   * Get parameters for operation
   */
  private getOperationParameters(operation: string): Map<string, any> {
    // Define default parameters for each operation type
    const parameterMap = new Map<string, any>([
      ['preprocess', { normalize: true, validate: true }],
      ['infer', { batchSize: 32, threshold: 0.5 }],
      ['train', { epochs: 10, learningRate: 0.001 }],
      ['validate', { metrics: ['accuracy', 'loss'] }],
      ['analyze', { depth: 'full', metrics: true }],
      ['transform', { validate: true, preserve: true }]
    ]);
    return parameterMap.get(operation) || new Map();
  }

  /**
   * Verify basic computation properties
   */
  private verifyBasics(computation: Computation): boolean {
    return (
      computation.id != null &&
      computation.type != null &&
      computation.input != null &&
      computation.output != null &&
      computation.steps.length > 0
    );
  }
}

/**
 * Metrics tracking for computations
 */
class ComputationMetrics {
  private metrics: Map<string, any>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Record a computation
   */
  recordComputation(computation: Computation): void {
    const metrics = {
      type: computation.type,
      timestamp: computation.timestamp,
      duration: this.calculateDuration(computation),
      steps: computation.steps.length,
      verified: computation.verification.verified,
      resourceUsage: this.calculateResourceUsage(computation)
    };

    this.metrics.set(computation.id, metrics);
  }

  /**
   * Record a computation error
   */
  recordError(computationId: string, error: Error): void {
    const existing = this.metrics.get(computationId) || {};
    this.metrics.set(computationId, {
      ...existing,
      error: error.message,
      errorTimestamp: Date.now()
    });
  }

  /**
   * Calculate computation duration
   */
  private calculateDuration(computation: Computation): number {
    const start = computation.timestamp;
    const end = computation.steps[computation.steps.length - 1].timestamp;
    return end - start;
  }

  /**
   * Calculate resource usage
   */
  private calculateResourceUsage(computation: Computation): {
    memory: number;
    cpu: number;
    storage: number;
  } {
    return {
      memory: computation.steps.reduce(
        (sum, step) => sum + step.metrics.memoryUsage,
        0
      ),
      cpu: computation.steps.reduce(
        (sum, step) => sum + step.metrics.cpuUsage,
        0
      ),
      storage: computation.steps.reduce(
        (sum, step) => sum + step.metrics.outputSize,
        0
      )
    };
  }

  /**
   * Get metrics for a computation
   */
  getMetrics(computationId: string): any {
    return this.metrics.get(computationId);
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): any {
    const allMetrics = Array.from(this.metrics.values());
    return {
      total: allMetrics.length,
      successful: allMetrics.filter(m => !m.error).length,
      averageDuration: this.calculateAverageDuration(allMetrics),
      resourceUsage: this.calculateAverageResourceUsage(allMetrics),
      verificationRate: this.calculateVerificationRate(allMetrics)
    };
  }

  /**
   * Calculate average duration
   */
  private calculateAverageDuration(metrics: any[]): number {
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  }

  /**
   * Calculate average resource usage
   */
  private calculateAverageResourceUsage(metrics: any[]): any {
    const total = metrics.reduce(
      (sum, m) => ({
        memory: sum.memory + m.resourceUsage.memory,
        cpu: sum.cpu + m.resourceUsage.cpu,
        storage: sum.storage + m.resourceUsage.storage
      }),
      { memory: 0, cpu: 0, storage: 0 }
    );

    return {
      memory: total.memory / metrics.length,
      cpu: total.cpu / metrics.length,
      storage: total.storage / metrics.length
    };
  }

  /**
   * Calculate verification success rate
   */
  private calculateVerificationRate(metrics: any[]): number {
    const verified = metrics.filter(m => m.verified).length;
    return verified / metrics.length;
  }
}

export default VerifiableComputation;
