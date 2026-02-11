import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { importAgenciesFromExcel } from "./excel-import";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Hardcoded login for presentation (test@demo.com / 123123123)
    login: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Hardcoded credentials check
        if (input.email === "test@demo.com" && input.password === "123123123") {
          // Create mock user
          const mockUser = {
            id: 1,
            openId: "demo-user",
            name: "Demo Kullanıcı",
            email: "test@demo.com",
            loginMethod: "hardcoded",
            role: "user" as const,
            lastSignedIn: new Date().toISOString(),
          };

          // Set session cookie
          const sessionToken = "demo-session-" + Date.now();
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user: mockUser,
            sessionToken,
          };
        }

        throw new Error("Email veya şifre hatalı");
      }),
  }),

  // Agency management routes (public - no auth required for shared data)
  agencies: router({
    // Get all agencies
    getAll: publicProcedure.query(async () => {
      return await db.getAllAgencies();
    }),

    // Find agency by levha number
    findByLevhaNo: publicProcedure
      .input(z.object({ levhaNo: z.string() }))
      .query(async ({ input }) => {
        return await db.findAgencyByLevhaNo(input.levhaNo);
      }),

    // Find agency by name (partial match)
    findByName: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        return await db.findAgencyByName(input.name);
      }),

    // Search agencies
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchAgencies(input.query);
      }),

    // Update agency (isActive, notes, etc.)
    update: publicProcedure
      .input(
        z.object({
          levhaNo: z.string(),
          isActive: z.number().optional(),
          notlar: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { levhaNo, ...data } = input;
        await db.updateAgency(levhaNo, data);
        return { success: true };
      }),

    // Get agency count
    getCount: publicProcedure.query(async () => {
      return await db.getAgencyCount();
    }),

    // Bulk insert agencies (for Excel import)
    bulkInsert: publicProcedure
      .input(
        z.array(
          z.object({
            levhaNo: z.string(),
            acenteTuru: z.string().optional(),
            acenteUnvani: z.string(),
            adres: z.string().optional(),
            il: z.string().optional(),
            ilce: z.string().optional(),
            telefon: z.string().optional(),
            ePosta: z.string().optional(),
            teknikPersonel: z.string().optional(),
            levhaKayTar: z.string().optional(),
            levhaYenKayTar: z.string().optional(),
            isActive: z.number().optional(),
            notlar: z.string().optional(),
          })
        )
      )
      .mutation(async ({ input }) => {
        await db.bulkInsertAgencies(input);
        return { success: true, count: input.length };
      }),

    // Import agencies from Excel (server-side)
    importFromExcel: publicProcedure.mutation(async () => {
      return await importAgenciesFromExcel();
    }),
  }),
});

export type AppRouter = typeof appRouter;
