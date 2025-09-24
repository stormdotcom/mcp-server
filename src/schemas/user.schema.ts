import { z } from "zod";

export const UserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  phone: z.string().min(3),
});

export const UserSchema = UserInputSchema.extend({
  id: z.number().int().positive(),
});

export type UserInput = z.infer<typeof UserInputSchema>;
export type User = z.infer<typeof UserSchema>;
