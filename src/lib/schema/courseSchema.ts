import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(1),
  sections: z.array(z.object({
    type: z.string(),
    payload: z.any()
  }))
});

export type CourseDoc = z.infer<typeof courseSchema>;
