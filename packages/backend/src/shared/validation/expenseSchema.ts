import { z } from 'zod';

export const splitInputSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  value: z.number().min(0).optional(),
  amount: z.number().min(0).optional(), // for backwards compatibility
});

export const createExpenseSchema = z.object({
  body: z.object({
    groupId: z.string().uuid().optional().nullable(),
    paidBy: z.string().uuid('Invalid paidBy user ID format').optional(),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().min(3).max(3).default('INR'),
    description: z.string().min(1, 'Description is required').max(255),
    splitType: z.enum(['equal', 'exact', 'percentage']).default('equal'),
    category: z.string().max(50).optional(),
    dueDate: z.string().optional(), // date string
    participants: z.array(splitInputSchema).optional(),
    splits: z.array(splitInputSchema).optional(),
    tags: z.array(z.string().max(50)).optional(),
  }).refine(data => data.participants || data.splits, {
    message: "Either 'participants' or 'splits' must be provided",
    path: ['participants'],
  })
});

export const updateExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    currency: z.string().min(3).max(3).optional(),
    description: z.string().min(1).max(255).optional(),
    splitType: z.enum(['equal', 'exact', 'percentage']).optional(),
    category: z.string().max(50).optional(),
    dueDate: z.string().optional(),
    participants: z.array(splitInputSchema).optional(),
    splits: z.array(splitInputSchema).optional(),
    tags: z.array(z.string().max(50)).optional(),
  })
});
