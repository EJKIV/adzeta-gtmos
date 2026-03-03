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
      if (field.min !== undefined && Number(values[field.id]) < field.min) {
        newErrors[field.id] = `Minimum value is ${field.min}`;
      }
      if (field.max !== undefined && Number(values[field.id]) > field.max) {
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
      {title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>}
      {description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1" style={{ color: 'var(--color-error)' }}>*</span>}
            </Label>
            {renderField(field)}
            {errors[field.id] && (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{errors[field.id]}</p>
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
