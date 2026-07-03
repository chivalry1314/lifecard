import { z } from "zod";

// Common name validator: 1-20 non-whitespace characters, no HTML tags
export const nameSchema = z
  .string()
  .trim()
  .min(1, "名称不能为空")
  .max(20, "名称不能超过 20 个字符")
  .refine(
    (val) => !/^\s*$/.test(val),
    "名称不能只包含空白字符"
  )
  .refine(
    (val) => !/[<>]/.test(val),
    "名称不能包含特殊字符"
  );

// Room ID: exactly 6 uppercase alphanumeric characters
// (alphanumeric to stay compatible with legacy Math.random-based IDs)
export const roomIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "房间号应为6位字母或数字");
