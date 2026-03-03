'use client';

import type { Block } from '@/types/ai-agent';
import { TextBlock } from './blocks/TextBlock';
import { TableBlock } from './blocks/TableBlock';
import { CardBlock } from './blocks/CardBlock';
import { ChartBlock } from './blocks/ChartBlock';
import { ListBlock } from './blocks/ListBlock';
import { ErrorBlock } from './blocks/ErrorBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { FormBlock } from './blocks/FormBlock';
import { SelectorBlock } from './blocks/SelectorBlock';
import { FilterBlock } from './blocks/FilterBlock';
import { RecommendationBlock } from './blocks/RecommendationBlock';
import { DecisionBlock } from './blocks/DecisionBlock';
import { ProgressBlock } from './blocks/ProgressBlock';

interface BlockRendererProps {
  blocks: Block[];
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
  onAction: (actionId: string, params: Record<string, unknown>) => Promise<void>;
}

export function BlockRenderer({ blocks, onSkillInvoke, onAction }: BlockRendererProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case 'text':
            return <TextBlock key={key} {...block} />;

          case 'table':
            return <TableBlock key={key} {...block} onAction={onAction} />;

          case 'cards':
            return <CardBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'chart':
            return <ChartBlock key={key} {...block} />;

          case 'list':
            return <ListBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'error':
            return <ErrorBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'code':
            return <CodeBlock key={key} {...block} />;

          case 'buttons':
            return <ButtonBlock key={key} {...block} onAction={onAction} />;

          case 'form':
            return <FormBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'selector':
            return <SelectorBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'filters':
            return <FilterBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'recommendations':
            return <RecommendationBlock
              key={key}
              {...block}
              onSkillInvoke={onSkillInvoke}
              onDismiss={onAction}
            />;

          case 'decision':
            return <DecisionBlock key={key} {...block} onSkillInvoke={onSkillInvoke} />;

          case 'progress':
            return <ProgressBlock key={key} {...block} />;

          default:
            console.warn(`Unknown block type: ${(block as Block).type}`);
            return null;
        }
      })}
    </div>
  );
}
