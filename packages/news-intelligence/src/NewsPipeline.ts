import { CybersecCollector } from './CybersecCollector';
import { Deduplicator } from './Deduplicator';
import { EvidenceValidator } from './EvidenceValidator';
import { AIAnalyzer, AnalyzedNewsItem } from './AIAnalyzer';
import { NewsRepository } from './NewsRepository';
import { TelegramService } from './TelegramService';
import { logger } from './logger';

export interface PipelineResult {
  collected: number;
  deduplicated: number;
  validated: number;
  analyzed: number;
  persisted: number;
  notified: number;
  failures: Error[];
}

export class NewsPipeline {
  constructor(
    private collectors: any[],
    private deduplicator: Deduplicator,
    private validator: EvidenceValidator,
    private analyzer: AIAnalyzer,
    private repository: NewsRepository,
    private telegram: TelegramService
  ) {}

  public async run(): Promise<PipelineResult> {
    const result: PipelineResult = {
      collected: 0,
      deduplicated: 0,
      validated: 0,
      analyzed: 0,
      persisted: 0,
      notified: 0,
      failures: []
    };

    logger.info('Pipeline started', { component: 'pipeline', event: 'pipeline.started' });

    // 1. Collect
    const collectedItems = [];
    for (const collector of this.collectors) {
      try {
        logger.info(`Collector started`, { component: 'pipeline', event: 'collector.started', collector: collector.constructor.name });
        const items = await collector.collect();
        logger.info(`Collector completed`, { component: 'pipeline', event: 'collector.completed', collector: collector.constructor.name, itemsCollected: items.length });
        collectedItems.push(...items);
      } catch (e) {
        logger.error(`Collector failed`, { component: 'pipeline', event: 'collector.failed', collector: collector.constructor.name, error: e });
        result.failures.push(new Error(`Collector failure: ${(e as Error).message}`));
      }
    }
    result.collected = collectedItems.length;

    // 2. Deduplicate
    let deduplicatedItems;
    try {
      deduplicatedItems = this.deduplicator.deduplicate(collectedItems);
      result.deduplicated = deduplicatedItems.length;
      logger.info('Deduplication completed', { component: 'pipeline', event: 'dedup.completed', deduplicatedCount: result.deduplicated });
    } catch (e) {
      logger.error('Deduplication failed', { component: 'pipeline', event: 'dedup.failed', error: e });
      result.failures.push(new Error(`Deduplicator failure: ${(e as Error).message}`));
      return result; // Fatal pipeline error
    }

    // 3-6. Process each deduplicated item
    for (const item of deduplicatedItems) {
      // 3. Validate
      const validation = this.validator.validate(item);
      if (!validation.valid || validation.status === 'invalid') {
        result.failures.push(new Error(`Validation failed for item ${item.id}: ${validation.errors.join(', ')}`));
        continue; // Skip invalid items
      }
      result.validated++;
      logger.debug('Validation completed', { component: 'pipeline', event: 'validation.completed', itemId: item.id });

      // 4. Analyze
      let analyzedItem: AnalyzedNewsItem;
      try {
        logger.debug('AI Analysis started', { component: 'pipeline', event: 'ai.analysis.started', itemId: item.id });
        analyzedItem = await this.analyzer.analyzeItem(item);
        result.analyzed++;
        logger.debug('AI Analysis completed', { component: 'pipeline', event: 'ai.analysis.completed', itemId: item.id });
      } catch (e) {
        logger.warn('AI Analysis failed', { component: 'pipeline', event: 'ai.analysis.failed', itemId: item.id, error: e });
        result.failures.push(new Error(`Analysis failed for item ${item.id}: ${(e as Error).message}`));
        // AI failure -> preserve validated news; don't fabricate analysis.
        analyzedItem = {
          item: Object.freeze({ ...item }),
          validation: Object.freeze({ ...validation })
        };
      }

      // 5. Persist
      try {
        await this.repository.save(analyzedItem);
        result.persisted++;
        logger.debug('Repository persisted', { component: 'pipeline', event: 'repository.persisted', itemId: item.id });
      } catch (e) {
        logger.error('Repository persist failed', { component: 'pipeline', event: 'repository.failed', itemId: item.id, error: e });
        result.failures.push(new Error(`Persistence failed for item ${item.id}: ${(e as Error).message}`));
        continue; // If not persisted, we shouldn't notify (could lead to duplicate notifications if next run tries again)
      }

      // 6. Notify
      try {
        logger.debug('Notification started', { component: 'pipeline', event: 'notification.started', itemId: item.id });
        const notified = await this.telegram.notify(analyzedItem);
        if (notified) {
          result.notified++;
          logger.debug('Notification completed', { component: 'pipeline', event: 'notification.completed', itemId: item.id });
        }
      } catch (e) {
        logger.error('Notification failed', { component: 'pipeline', event: 'notification.failed', itemId: item.id, error: e });
        result.failures.push(new Error(`Telegram notification failed for item ${item.id}: ${(e as Error).message}`));
      }
    }

    logger.info('Pipeline completed', { 
      component: 'pipeline', 
      event: 'pipeline.completed',
      itemsCollected: result.collected,
      itemsPersisted: result.persisted,
      failures: result.failures.length
    });

    return result;
  }
}
