/**
 * Repeatable seed script: `npm run db:seed`.
 *
 * Safe to run any number of times - every record is upserted by a natural key
 * (category slug, resource name) or a fixed id, so nothing is duplicated and
 * nothing created by users is touched or deleted.
 */
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const categories = [
  { slug: "meeting-rooms", name: "Meeting Rooms", description: "Bookable rooms for meetings, interviews and workshops." },
  { slug: "projectors", name: "Projectors", description: "Portable projectors and presentation equipment." },
  { slug: "workstations", name: "Workstations", description: "Hot desks and high-spec workstations." },
  { slug: "vehicles", name: "Vehicles", description: "Company cars and vans for business travel." },
] as const;

type CategorySlug = (typeof categories)[number]["slug"];

const resources: Array<{
  name: string;
  category: CategorySlug;
  description: string;
  location: string;
  capacity: number | null;
  isActive?: boolean;
}> = [
  { name: "Board Room", category: "meeting-rooms", description: "Large room with video conferencing and a 75\" display.", location: "Level 5, East Wing", capacity: 16 },
  { name: "Huddle Room A", category: "meeting-rooms", description: "Small room for quick stand-ups.", location: "Level 3", capacity: 4 },
  { name: "Training Room", category: "meeting-rooms", description: "Classroom layout with whiteboards.", location: "Level 2", capacity: 30 },
  { name: "Epson Projector EB-X51", category: "projectors", description: "XGA portable projector with HDMI.", location: "IT Store, Level 1", capacity: null },
  { name: "BenQ 4K Projector", category: "projectors", description: "4K projector for large presentations.", location: "IT Store, Level 1", capacity: null },
  { name: "Workstation WS-01", category: "workstations", description: "Dual 27\" monitors, 64 GB RAM.", location: "Engineering Bay, Level 4", capacity: 1 },
  { name: "Workstation WS-02", category: "workstations", description: "GPU workstation for ML workloads.", location: "Engineering Bay, Level 4", capacity: 1 },
  { name: "Toyota Prius (CAB-1234)", category: "vehicles", description: "Hybrid sedan for client visits.", location: "Basement Parking B2", capacity: 4 },
  { name: "Nissan Caravan (CAD-5678)", category: "vehicles", description: "Van for equipment transport. Currently under maintenance.", location: "Basement Parking B2", capacity: 8, isActive: false },
];

/** Demo USER account for local development. Change or delete it in any shared environment. */
const DEMO_USER = { email: "user@example.com", name: "Demo User", password: "User@12345" };

/**
 * Creates the demo user, and the administrator from .env (ADMIN_EMAIL /
 * ADMIN_PASSWORD). The admin website has no signup, so this (or the first
 * admin login) is how the admin account comes to exist.
 */
async function seedUsers(): Promise<{ userId: string; adminId: string | null }> {
  const demo =
    (await prisma.user.findUnique({ where: { email: DEMO_USER.email }, select: { id: true } })) ??
    (await prisma.user.create({
      data: { email: DEMO_USER.email, name: DEMO_USER.name, role: "USER", passwordHash: await hashPassword(DEMO_USER.password) },
      select: { id: true },
    }));

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set in .env - skipping the admin account.");
    return { userId: demo.id, adminId: null };
  }
  const passwordHash = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash }, // keep the account in sync with .env
    create: { email: adminEmail, name: "Administrator", role: "ADMIN", passwordHash },
    select: { id: true },
  });
  return { userId: demo.id, adminId: admin.id };
}

async function main() {
  const { userId, adminId } = await seedUsers();
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const saved = await prisma.resourceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categoryIds.set(category.slug, saved.id);
  }

  for (const resource of resources) {
    const categoryId = categoryIds.get(resource.category)!;
    const existing = await prisma.resource.findFirst({
      where: { name: { equals: resource.name, mode: "insensitive" } },
    });
    if (!existing) {
      await prisma.resource.create({
        data: {
          name: resource.name,
          description: resource.description,
          location: resource.location,
          capacity: resource.capacity,
          isActive: resource.isActive ?? true,
          categoryId,
        },
      });
    }
  }

  await seedReservations({ user: userId, admin: adminId ?? userId });

  const [categoryCount, resourceCount, reservationCount, userCount] = await Promise.all([
    prisma.resourceCategory.count(),
    prisma.resource.count(),
    prisma.reservation.count(),
    prisma.user.count(),
  ]);
  console.log(
    `Seed complete: ${userCount} users, ${categoryCount} categories, ${resourceCount} resources, ${reservationCount} reservations.`,
  );
}

/** A UTC instant `dayOffset` days from today at hh:mm. */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

/**
 * Sample reservations relative to the day the seed first runs. Fixed ids make
 * the script idempotent: an existing id is left untouched on re-runs.
 */
/**
 * owner "user": booked by the Demo User for themselves.
 * owner "admin": booked by the administrator on behalf of a named colleague.
 */
async function seedReservations(owners: { user: string; admin: string }) {
  const samples = [
    { id: "5eed0000-0000-4000-8000-000000000001", resource: "Board Room", owner: "user", bookedBy: "Demo User", purpose: "Weekly leadership sync", start: at(1, 9), end: at(1, 10, 30) },
    { id: "5eed0000-0000-4000-8000-000000000002", resource: "Board Room", owner: "admin", bookedBy: "Sam Lee", purpose: "Client presentation (back-to-back with the sync)", start: at(1, 10, 30), end: at(1, 12) },
    { id: "5eed0000-0000-4000-8000-000000000003", resource: "Huddle Room A", owner: "user", bookedBy: "Demo User", purpose: "Daily stand-up", start: at(0, 15), end: at(0, 15, 30) },
    { id: "5eed0000-0000-4000-8000-000000000004", resource: "Epson Projector EB-X51", owner: "admin", bookedBy: "Taylor Brown", purpose: "Offsite workshop", start: at(2, 13), end: at(2, 17) },
    { id: "5eed0000-0000-4000-8000-000000000005", resource: "Toyota Prius (CAB-1234)", owner: "user", bookedBy: "Demo User", purpose: "Client site visit", start: at(3, 8), end: at(3, 18) },
    { id: "5eed0000-0000-4000-8000-000000000006", resource: "Training Room", owner: "admin", bookedBy: "Riley Chen", purpose: "Onboarding session", start: at(2, 9), end: at(2, 12), cancelled: "Trainer unavailable" },
    { id: "5eed0000-0000-4000-8000-000000000007", resource: "Workstation WS-01", owner: "admin", bookedBy: "Morgan Patel", purpose: "Data processing job", start: at(-1, 9), end: at(-1, 17) },
  ];

  for (const sample of samples) {
    const ownerId = owners[sample.owner as "user" | "admin"];
    const existing = await prisma.reservation.findUnique({ where: { id: sample.id }, select: { userId: true, bookedBy: true } });
    if (existing) {
      // Keep sample bookings attached to the right demo account (only these fixed-id samples are touched).
      if (existing.userId !== ownerId || existing.bookedBy !== sample.bookedBy) {
        await prisma.reservation.update({ where: { id: sample.id }, data: { userId: ownerId, bookedBy: sample.bookedBy } });
      }
      continue;
    }
    const resource = await prisma.resource.findFirst({
      where: { name: { equals: sample.resource, mode: "insensitive" } },
      select: { id: true },
    });
    if (!resource) continue;
    try {
      await prisma.reservation.create({
        data: {
          id: sample.id,
          resourceId: resource.id,
          userId: ownerId,
          bookedBy: sample.bookedBy,
          purpose: sample.purpose,
          startTime: sample.start,
          endTime: sample.end,
          status: sample.cancelled ? "CANCELLED" : "CONFIRMED",
          cancelledAt: sample.cancelled ? new Date() : null,
          cancellationReason: sample.cancelled ?? null,
        },
      });
    } catch (error) {
      // The slot may already be taken by a real booking - never override it.
      console.warn(`Skipped sample reservation for ${sample.resource}: ${(error as Error).message.split("\n")[0]}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
