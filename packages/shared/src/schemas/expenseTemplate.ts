import { z } from 'zod';

export const createTemplateSchema = z.object({
  groupId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  amount: z.number().min(0, 'Amount must be positive'),
  splitMode: z.string(),
  category: z.string().optional().nullable(),
  participants: z.array(
    z.object({
      userId: z.string().uuid(),
      amount: z.number(),
      shares: z.number().optional().nullable(),
      weight: z.number().optional().nullable()
    })
  )
});

export type CreateTemplateRequest = z.infer<typeof createTemplateSchema>;
