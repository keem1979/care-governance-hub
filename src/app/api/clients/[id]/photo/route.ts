import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, getPrivateFile, putPrivateFile } from "@/lib/private-storage";
import { validateProfilePhoto } from "@/lib/profile-photo";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  let photo: Awaited<ReturnType<typeof validateProfilePhoto>>;
  try {
    photo = await validateProfilePhoto(form.get("photo"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Choose a valid profile picture." },
      { status: 400 },
    );
  }

  const db = createDb();
  const key = `${context.organisation.id}/clients/${id}/profile-${crypto.randomUUID()}`;
  let uploaded = false;
  try {
    const client = await db.client.findFirst({
      where: { id, ...clientScopeWhere(context) },
      select: { id: true, locationId: true, profilePhotoKey: true },
    });
    if (!client) return NextResponse.json({ error: "Client record not found." }, { status: 404 });

    await putPrivateFile(key, photo.bytes);
    uploaded = true;
    await db.$transaction([
      db.client.update({
        where: { id },
        data: { profilePhotoKey: key, profilePhotoType: photo.contentType },
      }),
      db.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          locationId: client.locationId,
          userId: context.user.id,
          action: "UPDATE",
          recordType: "Client",
          recordId: id,
          summary: "Updated client profile picture",
        },
      }),
    ]);
    uploaded = false;
    if (client.profilePhotoKey) {
      await deletePrivateFile(client.profilePhotoKey).catch(() => undefined);
    }
    return NextResponse.json({ message: "Client profile picture updated." });
  } catch (error) {
    if (uploaded) await deletePrivateFile(key).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload the profile picture." },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  try {
    const client = await db.client.findFirst({
      where: { id, ...clientScopeWhere(context) },
      select: { profilePhotoKey: true, profilePhotoType: true },
    });
    if (!client?.profilePhotoKey) return new NextResponse(null, { status: 404 });
    const body = await getPrivateFile(client.profilePhotoKey);
    if (!body) return new NextResponse(null, { status: 404 });
    return new NextResponse(body, {
      headers: {
        "Content-Type": client.profilePhotoType ?? "image/jpeg",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    const client = await db.client.findFirst({
      where: { id, ...clientScopeWhere(context) },
      select: { id: true, locationId: true, profilePhotoKey: true },
    });
    if (!client) return NextResponse.json({ error: "Client record not found." }, { status: 404 });
    if (!client.profilePhotoKey) return NextResponse.json({ message: "No client profile picture is stored." });

    await db.$transaction([
      db.client.update({
        where: { id },
        data: { profilePhotoKey: null, profilePhotoType: null },
      }),
      db.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          locationId: client.locationId,
          userId: context.user.id,
          action: "UPDATE",
          recordType: "Client",
          recordId: id,
          summary: "Removed client profile picture",
        },
      }),
    ]);
    await deletePrivateFile(client.profilePhotoKey).catch(() => undefined);
    return NextResponse.json({ message: "Client profile picture removed." });
  } finally {
    await db.$disconnect();
  }
}
