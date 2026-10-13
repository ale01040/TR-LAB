import { z } from 'zod';
export const workbookSchema = z
  .object({
    sheets: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            cells: z
              .array(
                z
                  .object({
                    address: z.string().regex(/^[A-Z]{1,3}[1-9]\d{0,4}$/),
                    row: z.number().int().min(1).max(50000),
                    column: z.number().int().min(1).max(16384),
                    value: z.union([
                      z.string().max(32768),
                      z.number().finite(),
                      z.boolean(),
                      z.null(),
                    ]),
                    formula: z.string().max(32768).nullable(),
                  })
                  .strict(),
              )
              .max(100000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export type WorkbookData = z.infer<typeof workbookSchema>;
export type ImportIssue = {
  severity: 'error' | 'choice' | 'info';
  code: string;
  sheet: string;
  cell: string | null;
  message: string;
};
