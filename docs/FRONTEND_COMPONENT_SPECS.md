# Frontend Component Specifications

**For:** Claude Code (Frontend Build Agent)
**Scope:** Concrete React components and implementation examples
**Last Updated:** 2026-02-27

---

## 1. Component Library Structure

```
components/
├── ai-agent/
│   ├── MessageRenderer.tsx       # Main message display
│   ├── MessageBubble.tsx         # User/AI message wrapper
│   ├── StreamingIndicator.tsx    # Typewriter/streaming animation
│   ├── blocks/
│   │   ├── TextBlock.tsx
│   │   ├── TableBlock.tsx
│   │   ├── CardBlock.tsx
│   │   ├── ChartBlock.tsx
│   │   ├── ListBlock.tsx
│   │   ├── ErrorBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── ButtonBlock.tsx
│   │   ├── FormBlock.tsx
│   │   ├── SelectorBlock.tsx
│   │   ├── FilterBlock.tsx
│   │   ├── RecommendationBlock.tsx
│   │   ├── DecisionBlock.tsx
│   │   └── ProgressBlock.tsx
│   ├── BlockRenderer.tsx         # Switches block type to component
│   └── index.ts
├── ui/                          # Reusable shadcn/ui components
│   ├── DataTable.tsx
│   ├── MetricCard.tsx
│   ├── ChartContainer.tsx
│   ├── CodeBlock.tsx
│   ├── ErrorBoundary.tsx
│   └── SkeletonLoader.tsx
└── hooks/
    ├── useAIStream.ts          # SSE streaming hook
    ├── useBlockActions.ts      # Action handler hook
    └── useChatSession.ts       # Chat session management
```

---

## 2. Core Components

### 2.1 MessageRenderer
**File:** `components/ai-agent/MessageRenderer.tsx`

```tsx
'use client';

import { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { BlockRenderer } from './BlockRenderer';
import { StreamingIndicator } from './StreamingIndicator';
import type { SkillOutput, Message } from '@/types/ai-agent';

interface MessageRendererProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
  onAction: (actionId: string, params: Record<string, unknown>) => void;
}

export function MessageRenderer({
  messages,
  isStreaming,
  streamingContent,
  onSkillInvoke,
  onAction,
}: MessageRendererProps) {
  return (
    <div className="space-y-6 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.type}
          timestamp={message.createdAt}
        >
          {message.output ? (
            <BlockRenderer
              blocks={message.output.blocks}
              onSkillInvoke={onSkillInvoke}
              onAction={onAction}
            />
          ) : (
            <p className="text-gray-900">{message.text}</p>
          )}
        </MessageBubble>
      ))}

      {isStreaming && (
        <MessageBubble role="assistant" isStreaming>
          {streamingContent ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          ) : (
            <StreamingIndicator />
          )}
        </MessageBubble>
      )}
    </div>
  );
}
```

---

### 2.2 MessageBubble
**File:** `components/ai-agent/MessageBubble.tsx`

```tsx
'use client';

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
  timestamp?: string;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  children,
  timestamp,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-100' : 'bg-purple-100'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-blue-600" />
        ) : (
          <Bot className="w-5 h-5 text-purple-600" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-3xl',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block px-4 py-3 rounded-lg',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          {children}
        </div>

        {timestamp && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}

        {isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
            </div>
            <span>Zetty is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 2.3 BlockRenderer
**File:** `components/ai-agent/BlockRenderer.tsx`

```tsx
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
```

---

## 3. Block Components

### 3.1 TableBlock
**File:** `components/ai-agent/blocks/TableBlock.tsx`

```tsx
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import type { TableBlock as TableBlockType } from '@/types/ai-agent';

interface TableBlockProps extends TableBlockType {
  onAction: (actionId: string, row: Record<string, unknown>) => void;
}

export function TableBlock({
  title,
  description,
  headers,
  rows,
  pagination,
  rowActions,
  onAction,
}: TableBlockProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Sort rows if configured
  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderCell = (value: unknown, cellType?: string) => {
    if (value && typeof value === 'object' && 'value' in value) {
      const { value: val, href, variant, icon } = value as {
        value: string;
        href?: string;
        variant?: string;
        icon?: string;
      };

      if (href) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {val}
          </a>
        );
      }

      if (variant) {
        return <Badge variant={variant as 'default' | 'success' | 'warning' | 'error' | 'info'}>{val}</Badge>;
      }

      return val;
    }

    // Format by type
    switch (cellType) {
      case 'currency':
        return formatCurrency(value as number);
      case 'percent':
        return formatPercent(value as number);
      case 'date':
        return formatDate(value as string);
      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      )}
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead
                  key={header.key}
                  className={cn(
                    header.sortable && 'cursor-pointer hover:bg-gray-50',
                    header.width === 'small' && 'w-24',
                    header.width === 'medium' && 'w-32',
                    header.width === 'large' && 'w-48'
                  )}
                  onClick={() => header.sortable && handleSort(header.key)}
                >
                  <div className="flex items-center gap-1">
                    {header.label}
                    {header.sortable && sortConfig?.key === header.key && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableHead className="w-20">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((header) => (
                  <TableCell key={header.key}>
                    {renderCell(row[header.key], header.type)}
                  </TableCell>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions.map((action) => (
                          <DropdownMenuItem
                            key={action.id}
                            onClick={() => onAction(action.id, row)}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} -
            {' '}{Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 3.2 CardBlock
**File:** `components/ai-agent/blocks/CardBlock.tsx`

```tsx
'use client';

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CardBlock as CardBlockType } from '@/types/ai-agent';

interface CardBlockProps extends CardBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

export function CardBlock({ layout, cards, onSkillInvoke }: CardBlockProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        layout === 'grid' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        layout === 'row' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {cards.map((card) => {
        const TrendIcon =
          card.trend?.direction === 'up'
            ? TrendingUp
            : card.trend?.direction === 'down'
            ? TrendingDown
            : ArrowRight;

        const trendColor =
          card.trend?.direction === 'up'
            ? 'text-green-600'
            : card.trend?.direction === 'down'
            ? 'text-red-600'
            : 'text-gray-500';

        return (
          <Card
            key={card.id}
            className={cn(
              'cursor-pointer transition-shadow hover:shadow-md',
              card.variant === 'success' && 'border-green-200 bg-green-50',
              card.variant === 'warning' && 'border-yellow-200 bg-yellow-50',
              card.variant === 'error' && 'border-red-200 bg-red-50',
              card.variant === 'info' && 'border-blue-200 bg-blue-50'
            )}
            onClick={() =>
              card.action && onSkillInvoke(card.action.skillId, card.action.params)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              {card.icon && (
                <card.icon className="w-4 h-4 text-gray-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.subtitle && (
                <p className="text-xs text-gray-600 mt-1">{card.subtitle}</p>
              )}
              {card.trend && (
                <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {card.trend.value}
                  </span>
                  {card.trend.period && (
                    <span className="text-xs text-gray-500">
                      {card.trend.period}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

---

### 3.3 FormBlock
**File:** `components/ai-agent/blocks/FormBlock.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FormBlock as FormBlockType } from '@/types/ai-agent';

interface FormBlockProps extends FormBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
}

export function FormBlock({
  id,
  title,
  description,
  fields,
  submitLabel = 'Submit',
  cancelLabel,
  submitSkillId,
  onSkillInvoke,
}: FormBlockProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required && !values[field.id]) {
        newErrors[field.id] = 'This field is required';
      }
      if (field.pattern && values[field.id]) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(String(values[field.id]))) {
          newErrors[field.id] = 'Invalid format';
        }
      }
      if (field.min && Number(values[field.id]) < field.min) {
        newErrors[field.id] = `Minimum value is ${field.min}`;
      }
      if (field.max && Number(values[field.id]) > field.max) {
        newErrors[field.id] = `Maximum value is ${field.max}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSkillInvoke(submitSkillId, values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormBlockType['fields'][0]) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={String(values[field.id] || '')}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
            }
            className={cn(errors[field.id] && 'border-red-500')}
          />
        );

      case 'select':
        return (
          <Select
            value={String(values[field.id] || '')}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, [field.id]: value }))
            }
          >
            <SelectTrigger className={cn(errors[field.id] && 'border-red-500')}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option.value}`}
                  checked={Array.isArray(values[field.id])
                    ? (values[field.id] as string[]).includes(option.value)
                    : false}
                  onCheckedChange={(checked) => {
                    const current = (values[field.id] as string[]) || [];
                    if (checked) {
                      setValues((prev) => ({
                        ...prev,
                        [field.id]: [...current, option.value],
                      }));
                    } else {
                      setValues((prev) => ({
                        ...prev,
                        [field.id]: current.filter((v) => v !== option.value),
                      }));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${option.value}`}>
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={String(values[field.id] || '')}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, [field.id]: value }))
            }
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            placeholder={field.placeholder}
            value={String(values[field.id] || '')}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
            }
            className={cn(errors[field.id] && 'border-red-500')}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {title && <h4 className="text-sm font-semibold">{title}</h4>}
      {description && <p className="text-sm text-gray-600">{description}</p>}

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderField(field)}
            {errors[field.id] && (
              <p className="text-sm text-red-500">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
        {cancelLabel && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setValues({})}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
```

---

## 4. Types Definition

**File:** `types/ai-agent.ts`

```typescript
// Block types
export interface TextBlock {
  type: 'text';
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface TableBlock {
  type: 'table';
  title?: string;
  description?: string;
  headers: Array<{
    key: string;
    label: string;
    type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'link' | 'badge';
    width?: 'auto' | 'small' | 'medium' | 'large';
    sortable?: boolean;
  }>;
  rows: Array<Record<string, unknown>>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  rowActions?: Array<{
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'primary' | 'danger';
  }>;
}

export interface CardBlock {
  type: 'cards';
  layout: 'row' | 'grid';
  cards: Array<{
    id: string;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
      direction: 'up' | 'down' | 'flat';
      value: string;
      period?: string;
    };
    icon?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}

export interface ChartBlock {
  type: 'chart';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'funnel';
  title?: string;
  description?: string;
  data: Array<{
    label: string;
    value: number;
    series?: Record<string, number>;
    date?: string;
  }>;
  xAxis?: { label?: string; format?: 'date' | 'number' | 'text' };
  yAxis?: { label?: string; format?: 'number' | 'currency' | 'percent' };
  colors?: string[];
  height?: number;
}

export interface ListBlock {
  type: 'list';
  style: 'bullet' | 'numbered' | 'checklist';
  title?: string;
  items: Array<{
    id: string;
    text: string;
    subtext?: string;
    icon?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
    action?: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
  }>;
}

export interface ErrorBlock {
  type: 'error';
  message: string;
  code?: string;
  details?: string;
  suggestions?: string[];
  retryable?: boolean;
  retrySkillId?: string;
  retryParams?: Record<string, unknown>;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
  filename?: string;
  output?: string;
  exitCode?: number;
  actions?: Array<{
    id: string;
    label: string;
    action: 'copy' | 'download' | 'execute';
  }>;
}

export interface ButtonBlock {
  type: 'buttons';
  message?: string;
  buttons: Array<{
    id: string;
    label: string;
    variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';
    icon?: string;
    action: {
      type: 'skill' | 'url' | 'modal' | 'confirm';
      skillId?: string;
      params?: Record<string, unknown>;
      url?: string;
      modalContent?: Block[];
      confirmText?: string;
    };
  }>;
}

export interface FormBlock {
  type: 'form';
  id: string;
  title?: string;
  description?: string;
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'radio';
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    pattern?: string;
  }>;
  submitLabel?: string;
  cancelLabel?: string;
  submitSkillId: string;
}

export interface SelectorBlock {
  type: 'selector';
  id: string;
  title?: string;
  description?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    metadata?: Record<string, unknown>;
  }>;
  layout: 'dropdown' | 'cards' | 'list';
  selectSkillId: string;
}

export interface FilterBlock {
  type: 'filters';
  id: string;
  title?: string;
  currentFilters: Record<string, unknown>;
  filters: Array<{
    id: string;
    label: string;
    type: 'text' | 'select' | 'date_range' | 'number_range' | 'checkboxes';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
  }>;
  changeSkillId: string;
  resultCount?: number;
  resultLabel?: string;
}

export interface RecommendationBlock {
  type: 'recommendations';
  title?: string;
  description?: string;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    confidenceScore: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    evidence?: Array<{
      label: string;
      value: string;
      trend?: 'up' | 'down' | 'flat';
    }>;
    action: {
      skillId: string;
      params: Record<string, unknown>;
      label: string;
    };
    dismissable?: boolean;
  }>;
}

export interface DecisionBlock {
  type: 'decision';
  id: string;
  title: string;
  description: string;
  impact: {
    summary: string;
    details?: string[];
    affectedResources?: Array<{
      type: string;
      name: string;
      currentValue: string;
      newValue: string;
    }>;
  };
  options: {
    approve: {
      label: string;
      skillId: string;
      params: Record<string, unknown>;
    };
    reject: {
      label: string;
      feedbackForm?: FormBlock;
    };
    postpone?: {
      label: string;
      duration: string;
    };
  };
}

export interface ProgressBlock {
  type: 'progress';
  id: string;
  title?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress?: number;
  steps?: Array<{
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
    details?: string;
  }>;
  startedAt?: string;
  estimatedCompletion?: string;
  elapsedMs?: number;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    action: 'pause' | 'resume' | 'cancel' | 'retry';
  }>;
}

export type Block =
  | TextBlock
  | TableBlock
  | CardBlock
  | ChartBlock
  | ListBlock
  | ErrorBlock
  | CodeBlock
  | ButtonBlock
  | FormBlock
  | SelectorBlock
  | FilterBlock
  | RecommendationBlock
  | DecisionBlock
  | ProgressBlock;

// Skill output
export interface SkillOutput {
  skillId: string;
  status: 'success' | 'partial_success' | 'error';
  blocks: Block[];
  followUps: Array<{
    text: string;
    skillId: string;
    params: Record<string, unknown>;
  }>;
  executionMs: number;
  dataFreshness: 'live' | 'cached' | 'mock' | 'offline';
  context?: {
    lastQuery?: string;
    entities?: Record<string, unknown>;
    intent?: string;
  };
}

// Message
export interface Message {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system' | 'tool_result' | 'error';
  text: string;
  clientId?: string;
  output?: SkillOutput;
  tokensUsed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// SSE Events
export interface StatusEvent {
  phase: 'matching' | 'executing' | 'connecting' | 'streaming' | 'complete' | 'error';
  message: string;
  ts: number;
  skillId?: string;
  skillName?: string;
  progress?: number;
}

export interface DeltaEvent {
  content: string;
}

export interface DoneEvent {
  done: true;
}
```

---

## 5. Key Implementation Notes

### 5.1 Streaming Messages
- Messages should appear as they're received (SSE)
- Store partial content in state
- Render markdown incrementally
- Show typing indicator between events

### 5.2 Error Boundaries
```tsx
<ErrorBoundary
  fallback={<div className="p-4 text-red-600">Failed to render message</div>}
>
  <BlockRenderer blocks={blocks} />
</ErrorBoundary>
```

### 5.3 Loading States
- Skeleton loaders for each block type
- Show during skill execution
- Hide when data arrives

### 5.4 Action Handling
- All block actions go through `onSkillInvoke` or `onAction`
- Loading state on buttons during execution
- Disable buttons to prevent double-clicks

### 5.5 Accessibility
- ARIA labels on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus management
- Screen reader announcements

---

## 6. Package Dependencies

The following shadcn/ui components are needed:

```bash
npx shadcn add button
npx shadcn add card
npx shadcn add input
npx shadcn add label
npx shadcn add textarea
npx shadcn add select
npx shadcn add checkbox
npx shadcn add radio-group
npx shadcn add dropdown-menu
npx shadcn add table
npx shadcn add badge
npx shadcn add progress
npx shadcn add skeleton

# Additional packages
npm install react-markdown lucide-react recharts
```

---

**Claude Code: Build these components in order:**
1. Types (`types/ai-agent.ts`)
2. Core components (MessageBubble, BlockRenderer)
3. Block components (start with TextBlock, TableBlock, CardBlock)
4. Complex blocks (FormBlock, RecommendationBlock, DecisionBlock)
5. MessageRenderer integration
6. Chat page with streaming support