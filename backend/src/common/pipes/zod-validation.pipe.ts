import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || 'value';
        errors[key] = errors[key] ?? [];
        errors[key].push(issue.message);
      }
      throw new BadRequestException({ success: false, message: 'Validation failed', errors });
    }
    return result.data;
  }
}
