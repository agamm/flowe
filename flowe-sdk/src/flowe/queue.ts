export interface QueueItem {
  id: string;
  payload: any;
}

export interface QueueOptions {
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  logErrors?: boolean;
}

// This Queue utility is used for making sure that the flowe
// processes we are sending to the CLI server are sent in order.
// Before sending the next item we make sure the previous one 
// was ingested correctly.

export class Queue {
  private queue: QueueItem[] = [];
  private processing = false;
  private hasFailed = false;
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions) {
    this.options = {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      maxRetries: 3,
      retryDelay: 500,
      logErrors: true,
      ...options
    };
  }

  public enqueue(item: QueueItem): void {
    if (this.hasFailed) {
      if (this.options.logErrors) {
        console.warn(`Queue has failed permanently. Item ${item.id} not added.`);
      }
      return;
    }
    
    // Ensure stackTrace is included in the payload
    if (item.payload && !item.payload.stackTrace) {
      console.warn(`No stack trace found for item ${item.id}`);
    }
    
    this.queue.push(item);
    this.processQueue();
  }

  public clear(): void {
    this.queue = [];
    this.hasFailed = false;
  }

  public get length(): number {
    return this.queue.length;
  }

  public get failed(): boolean {
    return this.hasFailed;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.hasFailed) {
      return;
    }

    this.processing = true;

    try {
      const item = this.queue[0];
      await this.processItem(item);
      this.queue.shift();
    } catch (error) {
      if (this.options.logErrors) {
        console.error(`Error processing queue item: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Queue processing stopped. ${this.queue.length} items remaining in queue.`);
      }
      this.hasFailed = true;
    } finally {
      this.processing = false;
      
      if (this.queue.length > 0 && !this.hasFailed) {
        this.processQueue();
      }
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    let attempt = 0;
    const maxAttempts = this.options.maxRetries + 1;
    
    while (attempt < maxAttempts) {
      try {
        if (this.options.logErrors && attempt > 0) {
          console.log(`Attempt ${attempt+1}/${maxAttempts} for item ${item.id}`);
        }
        
        // Log request details
        console.log(`Sending request to ${this.options.endpoint} for item ${item.id}:`, 
          JSON.stringify(item.payload).substring(0, 200) + "...");
        
        const response = await fetch(this.options.endpoint, {
          method: this.options.method,
          headers: this.options.headers,
          body: JSON.stringify(item.payload),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server error (${response.status}):`, errorText);
          throw new Error(`Server responded with status ${response.status}: ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log(`Server response for ${item.id}:`, responseData);
        
        if (!responseData.success) {
          throw new Error(`Server did not confirm success for process ${item.payload.id}`);
        }
        
        if (this.options.logErrors) {
          console.log(`Successfully sent item ${item.id} to ${this.options.endpoint}`);
        }
        
        return;
      } catch (error) {
        attempt++;
        
        if (attempt >= maxAttempts) {
          if (this.options.logErrors) {
            console.error(`Failed to send item ${item.id} after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
          }
          throw error;
        }
        
        if (this.options.logErrors) {
          console.warn(`Retry ${attempt}/${this.options.maxRetries} for item ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
} 