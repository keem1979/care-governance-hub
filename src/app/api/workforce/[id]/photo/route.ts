import { NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, getPrivateFile, putPrivateFile } from "@/lib/private-storage";
import { workforceScopeWhere } from "@/lib/workforce";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE); const { id } = await params;
  const form = await request.formData(); const photo = form.get("photo");
  if (!(photo instanceof File) || !photo.size || photo.size > 2 * 1024 * 1024 || !allowed.has(photo.type)) return NextResponse.json({ error: "Choose a JPG, PNG or WebP picture no larger than 2 MB." }, { status: 400 });
  const db = createDb(); const key = `${context.organisation.id}/workforce/${id}/profile-${crypto.randomUUID()}`;
  try {
    const staff = await db.staffMember.findFirst({ where: { id, ...workforceScopeWhere(context) }, select: { id: true, locationId: true, profilePhotoKey: true } });
    if (!staff) return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
    await putPrivateFile(key, await photo.arrayBuffer());
    await db.$transaction([
      db.staffMember.update({ where: { id }, data: { profilePhotoKey: key, profilePhotoType: photo.type } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: staff.locationId, userId: context.user.id, action: "UPDATE", recordType: "StaffMember", recordId: id, summary: "Updated staff profile picture" } }),
    ]);
    if (staff.profilePhotoKey) await deletePrivateFile(staff.profilePhotoKey);
    return NextResponse.json({ ok: true });
  } catch (error) { await deletePrivateFile(key); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload the profile picture." }, { status: 400 }); } finally { await db.$disconnect(); }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE]); const { id } = await params; const db = createDb();
  try { const staff = await db.staffMember.findFirst({ where: { id, ...workforceScopeWhere(context) }, select: { profilePhotoKey: true, profilePhotoType: true } }); if (!staff?.profilePhotoKey) return new NextResponse(null, { status: 404 }); const body = await getPrivateFile(staff.profilePhotoKey); if (!body) return new NextResponse(null, { status: 404 }); return new NextResponse(body, { headers: { "Content-Type": staff.profilePhotoType ?? "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } }); } finally { await db.$disconnect(); }
}
