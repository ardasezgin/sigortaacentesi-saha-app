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

  // Visit management routes
  visits: router({
    // Get all visits
    getAll: publicProcedure.query(async () => {
      return await db.getAllVisits();
    }),

    // Get visits by agency
    getByAgency: publicProcedure
      .input(z.object({ levhaNo: z.string() }))
      .query(async ({ input }) => {
        return await db.getVisitsByAgency(input.levhaNo);
      }),

    // Get recent visits
    getRecent: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getRecentVisits(input.limit);
      }),

    // Add a new visit
    add: publicProcedure
      .input(
        z.object({
          iletisimTuru: z.string(),
          isOrtagi: z.string(),
          levhaNo: z.string(),
          acenteAdi: z.string(),
          kimleGorusuldu: z.string(),
          tarih: z.string(),
          gundem: z.string(),
          detayAciklama: z.string(),
          hatirlatma: z.string().optional(),
          hatirlatmaTarihi: z.string().optional(),
          dosyalar: z.string().optional(),
          createdBy: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.addVisit(input);
        return { success: true, id };
      }),

    // Update a visit
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            iletisimTuru: z.string().optional(),
            isOrtagi: z.string().optional(),
            kimleGorusuldu: z.string().optional(),
            tarih: z.string().optional(),
            gundem: z.string().optional(),
            detayAciklama: z.string().optional(),
            hatirlatma: z.string().optional(),
            hatirlatmaTarihi: z.string().optional(),
            dosyalar: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateVisit(input.id, input.data);
        return { success: true };
      }),

    // Delete a visit
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVisit(input.id);
        return { success: true };
      }),
  }),

  // Communication management routes
  communications: router({
    // Get all communications
    getAll: publicProcedure.query(async () => {
      return await db.getAllCommunications();
    }),

    // Add a new communication
    add: publicProcedure
      .input(
        z.object({
          levhaNo: z.string(),
          acenteAdi: z.string().optional(),
          type: z.string(),
          subject: z.string(),
          notes: z.string(),
          createdBy: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.addCommunication(input);
        return { success: true, id };
      }),
  }),

  // Request management routes
  requests: router({
    // Get all requests
    getAll: publicProcedure.query(async () => {
      return await db.getAllRequests();
    }),

    // Get recent requests
    getRecent: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getRecentRequests(input.limit);
      }),

    // Add a new request
    add: publicProcedure
      .input(
        z.object({
          levhaNo: z.string(),
          acenteAdi: z.string().optional(),
          requestType: z.string(),
          priority: z.string(),
          status: z.string(),
          subject: z.string(),
          description: z.string(),
          response: z.string().optional(),
          createdBy: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.addRequest(input);
        return { success: true, id };
      }),

    // Update a request
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            status: z.string().optional(),
            priority: z.string().optional(),
            response: z.string().optional(),
            resolvedAt: z.date().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateRequest(input.id, input.data);
        return { success: true };
      }),
  }),

  // Dashboard metrics
  dashboard: router({
    // Get dashboard metrics
    getMetrics: publicProcedure.query(async () => {
      const metrics = await db.getDashboardMetrics();
      const recentVisits = await db.getRecentVisits(5);
      const recentRequests = await db.getRecentRequests(5);
      return {
        ...metrics,
        recentVisits,
        recentRequests,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
