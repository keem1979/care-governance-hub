import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { encryptMfaSecret } from "@/lib/auth/mfa";
import { hashRateLimitKey } from "@/lib/auth/rate-limit";
import { createDb } from "@/lib/db";
import { permissionLabel, ROLE_KEYS, ROLE_PERMISSION_MAP, type RoleKey } from "@/lib/permissions";

export const runtime = "nodejs";

function hasValidSetupRequest(request: Request) {
  const setupToken = process.env.E2E_SETUP_TOKEN;
  const localReleaseGate = process.env.E2E_LOCAL_RELEASE_GATE === "1";
  return (
    (process.env.NODE_ENV !== "production" || localReleaseGate) &&
    Boolean(setupToken) &&
    request.headers.get("x-e2e-setup-token") === setupToken
  );
}

async function removeGeneratedFixtures(db: ReturnType<typeof createDb>, organisationId: string) {
  const audits=await db.audit.findMany({where:{organisationId,title:{startsWith:"E2E-AUDIT-"}},select:{id:true,findings:{select:{actionId:true}}}}),auditIds=audits.map(item=>item.id),auditActionIds=audits.flatMap(item=>item.findings.map(finding=>finding.actionId).filter((id):id is string=>Boolean(id)));
  const risks = await db.risk.findMany({
    where: { organisationId, reference: { startsWith: "E2E-RSK-" } },
    select: { id: true },
  });
  const riskIds = risks.map(({ id }) => id);
  const incidents = await db.registerEntry.findMany({ where: { organisationId, reference: { startsWith: "E2E-INC-" }, definition: { key: "incidents" } }, select: { id: true, incidentAssuranceReviews: { select: { id: true } } } });
  const incidentIds = incidents.map(({ id }) => id), incidentReviewIds = incidents.flatMap((item) => item.incidentAssuranceReviews.map(({ id }) => id));
  const complaints = await db.registerEntry.findMany({ where: { organisationId, reference: { startsWith: "E2E-CMP-" }, definition: { key: "complaints" } }, select: { id: true, complaintAssuranceReviews: { select: { id: true } } } });
  const complaintIds = complaints.map(({ id }) => id), complaintReviewIds = complaints.flatMap((item) => item.complaintAssuranceReviews.map(({ id }) => id));
  const safeguarding = await db.registerEntry.findMany({ where: { organisationId, reference: { startsWith: "E2E-SG-" }, definition: { key: "safeguarding" } }, select: { id: true, safeguardingAssuranceReviews: { select: { id: true } } } });
  const safeguardingIds = safeguarding.map(({id})=>id), safeguardingReviewIds=safeguarding.flatMap(item=>item.safeguardingAssuranceReviews.map(({id})=>id));

  const actions = await db.action.findMany({
    where: {
      organisationId,
      OR: [
        { reference: { startsWith: "E2E-ACT-ASSURANCE-" } },
        ...(riskIds.length ? [{ sourceType: "RISK" as const, sourceRecordId: { in: riskIds } }] : []),
        ...(incidentIds.length ? [{ sourceType: "INCIDENT" as const, sourceRecordId: { in: incidentIds } }] : []),
        ...(complaintIds.length ? [{ sourceType: "COMPLAINT" as const, sourceRecordId: { in: complaintIds } }] : []),
        ...(safeguardingIds.length ? [{ sourceType: "SAFEGUARDING" as const, sourceRecordId: { in: safeguardingIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const actionIds = [...new Set([...actions.map(({ id }) => id),...auditActionIds])];
  const proposals=riskIds.length?await db.riskClosureProposal.findMany({where:{organisationId,riskId:{in:riskIds}},select:{id:true}}):[],proposalIds=proposals.map(({id})=>id);

  await db.$transaction(async (transaction) => {
    await transaction.activityLog.deleteMany({
      where: {
        organisationId,
        recordId: { in: [...riskIds, ...actionIds, ...proposalIds,...auditIds,...incidentIds,...incidentReviewIds,...complaintIds,...complaintReviewIds,...safeguardingIds,...safeguardingReviewIds] },
      },
    });
    if(auditIds.length>0) {
      // Re-audits are deliberately append-only and restrict parent deletion in the
      // product. This test-only reset removes them explicitly before generated
      // Audit fixtures; production code has no equivalent destructive route.
      await transaction.auditReaudit.deleteMany({where:{finding:{auditId:{in:auditIds}}}});
      await transaction.audit.deleteMany({where:{id:{in:auditIds},organisationId}});
    }
    if (actionIds.length > 0) {
      await transaction.action.deleteMany({ where: { id: { in: actionIds }, organisationId } });
    }
    if (incidentIds.length > 0) {
      await transaction.incidentAssuranceReview.deleteMany({ where: { incidentId: { in: incidentIds }, organisationId } });
      await transaction.incidentInvestigation.deleteMany({ where: { incidentId: { in: incidentIds }, organisationId } });
      await transaction.registerEntry.deleteMany({ where: { id: { in: incidentIds }, organisationId } });
    }
    if (complaintIds.length > 0) {
      await transaction.complaintAssuranceReview.deleteMany({ where: { complaintId: { in: complaintIds }, organisationId } });
      await transaction.complaintCommunication.deleteMany({ where: { complaintId: { in: complaintIds }, organisationId } });
      await transaction.complaintIssue.deleteMany({ where: { complaintId: { in: complaintIds }, organisationId } });
      await transaction.complaintInvestigation.deleteMany({ where: { complaintId: { in: complaintIds }, organisationId } });
      await transaction.registerEntry.deleteMany({ where: { id: { in: complaintIds }, organisationId } });
    }
    if(safeguardingIds.length>0){await transaction.safeguardingAssuranceReview.deleteMany({where:{safeguardingId:{in:safeguardingIds},organisationId}});await transaction.safeguardingEvent.deleteMany({where:{safeguardingId:{in:safeguardingIds},organisationId}});await transaction.safeguardingCase.deleteMany({where:{safeguardingId:{in:safeguardingIds},organisationId}});await transaction.registerEntry.deleteMany({where:{id:{in:safeguardingIds},organisationId}})}
    if(proposalIds.length){await transaction.riskClosureApproval.deleteMany({where:{proposalId:{in:proposalIds},organisationId}});await transaction.riskClosureProposalEvidence.deleteMany({where:{proposalId:{in:proposalIds}}});await transaction.riskClosureProposal.deleteMany({where:{id:{in:proposalIds},organisationId}})}
    if (riskIds.length > 0) await transaction.risk.deleteMany({ where: { id: { in: riskIds }, organisationId } });
  });

  return { risks: riskIds.length, actions: actionIds.length, complaints: complaintIds.length, safeguarding: safeguardingIds.length };
}

export async function DELETE(request: Request) {
  if (!hasValidSetupRequest(request)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const db = createDb();
  try {
    const organisation = await db.organisation.findFirst({
      where: { slug: "meadow-view-home-care", isDemo: true },
      select: { id: true },
    });
    if (!organisation) {
      return NextResponse.json({ error: "The fictional demo tenant was not found." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, removed: await removeGeneratedFixtures(db, organisation.id) });
  } finally {
    await db.$disconnect();
  }
}

export async function GET(request:Request){
  if(!hasValidSetupRequest(request))return NextResponse.json({error:"Not found."},{status:404});
  const db=createDb();try{const [risks,actions,incidents,complaints,safeguarding,evidence,correctedEvidence,medicinesTemplate,guildford]=await Promise.all([db.risk.findMany({where:{reference:{startsWith:"E2E-RSK-SEC-"}},select:{id:true,reference:true,locationId:true,status:true,residualScore:true},orderBy:{reference:"asc"}}),db.action.findMany({where:{reference:{startsWith:"E2E-ACT-ASSURANCE-"}},select:{id:true,reference:true,locationId:true,status:true},orderBy:{reference:"asc"}}),db.registerEntry.findMany({where:{reference:{startsWith:"E2E-INC-"},definition:{key:"incidents"}},select:{id:true,reference:true,status:true,locationId:true},orderBy:{reference:"asc"}}),db.registerEntry.findMany({where:{reference:{startsWith:"E2E-CMP-"},definition:{key:"complaints"}},select:{id:true,reference:true,status:true,locationId:true},orderBy:{reference:"asc"}}),db.registerEntry.findMany({where:{reference:{startsWith:"E2E-SG-"},definition:{key:"safeguarding"}},select:{id:true,reference:true,status:true,locationId:true},orderBy:{reference:"asc"}}),db.evidence.findFirst({where:{sourceReference:"E2E-SRC-001"},select:{id:true}}),db.evidence.findFirst({where:{sourceReference:"E2E-CORRECTED-001"},select:{id:true}}),db.auditTemplate.findFirst({where:{key:"medicines-audit",isPublished:true},select:{id:true,key:true,name:true}}),db.serviceLocation.findFirst({where:{code:"GUILDFORD",organisation:{slug:"meadow-view-home-care"}},select:{id:true}})]);return NextResponse.json({risks:Object.fromEntries(risks.map(risk=>[risk.reference,{id:risk.id,locationId:risk.locationId,status:risk.status,residualScore:risk.residualScore}])),actions:Object.fromEntries(actions.map(action=>[action.reference,{id:action.id,locationId:action.locationId,status:action.status}])),incidents:Object.fromEntries(incidents.map(incident=>[incident.reference,{id:incident.id,locationId:incident.locationId,status:incident.status}])),complaints:Object.fromEntries(complaints.map(complaint=>[complaint.reference,{id:complaint.id,locationId:complaint.locationId,status:complaint.status}])),safeguarding:Object.fromEntries(safeguarding.map(item=>[item.reference,{id:item.id,locationId:item.locationId,status:item.status}])),evidenceId:evidence?.id??null,correctedEvidenceId:correctedEvidence?.id??null,audit:{template:medicinesTemplate,locationId:guildford?.id??null}})}finally{await db.$disconnect()}
}

export async function POST(request: Request) {
  const email = process.env.E2E_USER_EMAIL;
  const name = process.env.E2E_USER_NAME;
  const password = process.env.E2E_USER_PASSWORD;
  const mfaSecret = process.env.E2E_MFA_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;
  type FixtureUser={name:string;email:string;password:string;roleKey:RoleKey;mfaSecret:string;allLocations?:boolean;tenant?:"other"};
  const configuredUsers = JSON.parse(process.env.E2E_USERS_JSON ?? "[]") as Array<FixtureUser> | Record<string,FixtureUser>;
  const e2eUsers=Array.isArray(configuredUsers)?configuredUsers:Object.values(configuredUsers);

  // This route is included in source so the real application runtime can create
  // fixtures. It is unavailable unless Playwright explicitly enables it. A
  // compiled local release gate additionally requires E2E_LOCAL_RELEASE_GATE,
  // the setup token; deployments do not set either release-gate variable.
  if (
    !hasValidSetupRequest(request) ||
    !email ||
    !name ||
    !password ||
    !mfaSecret ||
    !sessionSecret
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const db = createDb();
  try {
    const organisation = await db.organisation.upsert({where:{slug:"meadow-view-home-care"},update:{name:"Meadow View Fictional Care",isDemo:true},create:{name:"Meadow View Fictional Care",slug:"meadow-view-home-care",isDemo:true},select:{id:true}});
    const otherOrganisation=await db.organisation.upsert({where:{slug:"release-gate-other-care"},update:{name:"Other Fictional Care",isDemo:true},create:{name:"Other Fictional Care",slug:"release-gate-other-care",isDemo:true},select:{id:true}});
    await removeGeneratedFixtures(db, organisation.id);
    const usersToProvision=e2eUsers.length?e2eUsers:[{name,email,password,roleKey:ROLE_KEYS.QUALITY_MANAGER,mfaSecret}];
    const roleIds=new Map<string,string>();
    for(const fixtureUser of usersToProvision){
      const role=await db.role.upsert({where:{key:fixtureUser.roleKey},update:{name:permissionLabel(fixtureUser.roleKey)},create:{key:fixtureUser.roleKey,name:permissionLabel(fixtureUser.roleKey),description:"Fictional release-gate role"},select:{id:true}});roleIds.set(fixtureUser.roleKey,role.id);
      const permissionKeys=ROLE_PERMISSION_MAP[fixtureUser.roleKey]??[];
      for(const permissionKey of permissionKeys){const permission=await db.permission.upsert({where:{key:permissionKey},update:{},create:{key:permissionKey,description:permissionLabel(permissionKey)},select:{id:true}});await db.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}})}
    }
    const provisionedUsers=new Map<string,{id:string,membershipId:string}>();
    for(const fixtureUser of usersToProvision){const passwordHash=await hash(fixtureUser.password,12);const fixture=await db.user.upsert({where:{email:fixtureUser.email},update:{name:fixtureUser.name,passwordHash,isActive:true,mfaSecretCiphertext:encryptMfaSecret(fixtureUser.mfaSecret,process.env.MFA_ENCRYPTION_KEY??sessionSecret),mfaEnabledAt:new Date(),mfaRecoveryCodeHashes:[]},create:{name:fixtureUser.name,email:fixtureUser.email,passwordHash,isActive:true,mfaSecretCiphertext:encryptMfaSecret(fixtureUser.mfaSecret,process.env.MFA_ENCRYPTION_KEY??sessionSecret),mfaEnabledAt:new Date(),mfaRecoveryCodeHashes:[]},select:{id:true}});const targetOrganisation=fixtureUser.tenant==="other"?otherOrganisation:organisation;const roleId=roleIds.get(fixtureUser.roleKey)!;const membership=await db.organisationMembership.upsert({where:{organisationId_userId:{organisationId:targetOrganisation.id,userId:fixture.id}},update:{roleId,status:"ACTIVE",allLocations:fixtureUser.allLocations??true,deactivatedAt:null},create:{organisationId:targetOrganisation.id,userId:fixture.id,roleId,status:"ACTIVE",allLocations:fixtureUser.allLocations??true,joinedAt:new Date()},select:{id:true}});provisionedUsers.set(fixtureUser.email,{id:fixture.id,membershipId:membership.id});await db.session.deleteMany({where:{userId:fixture.id}});}
    const user=provisionedUsers.get(email)!;
    const guildfordLocation=await db.serviceLocation.upsert({where:{organisationId_code:{organisationId:organisation.id,code:"GUILDFORD"}},update:{name:"Guildford Branch",isActive:true},create:{organisationId:organisation.id,code:"GUILDFORD",name:"Guildford Branch"},select:{id:true}});
    const oxfordLocation=await db.serviceLocation.upsert({where:{organisationId_code:{organisationId:organisation.id,code:"OXFORD"}},update:{name:"Oxford Branch",isActive:true},create:{organisationId:organisation.id,code:"OXFORD",name:"Oxford Branch"},select:{id:true}});
    const restricted=usersToProvision.find(item=>item.allLocations===false);if(restricted){const membershipId=provisionedUsers.get(restricted.email)!.membershipId;await db.membershipLocation.deleteMany({where:{membershipId}});await db.membershipLocation.create({data:{membershipId,locationId:oxfordLocation.id}})}
    const existingFramework=await db.riskFrameworkVersion.findFirst({where:{organisationId:organisation.id,status:"EFFECTIVE"},select:{id:true}});
    if(!existingFramework){
      const maximum=await db.riskFrameworkVersion.aggregate({where:{organisationId:organisation.id},_max:{versionNumber:true}}),versionNumber=(maximum._max.versionNumber??0)+1,oldEffectiveFrom=new Date("2025-01-01T00:00:00.000Z"),currentEffectiveFrom=new Date("2026-01-01T00:00:00.000Z");
      await db.$transaction(async transaction=>{const oldPolicy=await transaction.riskClosurePolicyVersion.create({data:{organisationId:organisation.id,versionNumber,status:"SUPERSEDED",effectiveFrom:oldEffectiveFrom,effectiveTo:currentEffectiveFrom,changeRationale:"Fictional earlier closure policy for framework-change testing.",createdById:user.id,approvedById:user.id,approvedAt:oldEffectiveFrom,rules:{create:["LOW","MODERATE","HIGH","CRITICAL"].map((riskLevel,index)=>({organisationId:organisation.id,riskLevel:riskLevel as never,categoryKey:"*",proposerRoleKeys:["registered-manager","quality-compliance-manager"],approverRoleKeys:["registered-manager","nominated-individual"],selfApprovalAllowed:index===0,requiredApprovalCount:riskLevel==="CRITICAL"?2:1,verifiedEvidenceRequired:["HIGH","CRITICAL"].includes(riskLevel),effectivenessEvidenceRequired:["HIGH","CRITICAL"].includes(riskLevel)}))}}});await transaction.riskFrameworkVersion.create({data:{organisationId:organisation.id,versionNumber,status:"SUPERSEDED",effectiveFrom:oldEffectiveFrom,effectiveTo:currentEffectiveFrom,defaultAppetite:"LOW",defaultToleranceScore:9,changeRationale:"Fictional v1 tolerance used to test historical preservation.",closurePolicyVersionId:oldPolicy.id,createdById:user.id,approvedById:user.id,approvedAt:oldEffectiveFrom,rules:{create:{organisationId:organisation.id,categoryKey:"MEDICINES",categoryLabel:"Medicines",appetite:"LOW",toleranceScore:9}}}});const policy=await transaction.riskClosurePolicyVersion.create({data:{organisationId:organisation.id,versionNumber:versionNumber+1,status:"EFFECTIVE",effectiveFrom:currentEffectiveFrom,changeRationale:"Fictional E2E Risk Framework used only for authenticated browser testing.",createdById:user.id,approvedById:user.id,approvedAt:currentEffectiveFrom,rules:{create:["LOW","MODERATE","HIGH","CRITICAL"].map((riskLevel,index)=>({organisationId:organisation.id,riskLevel:riskLevel as never,categoryKey:"*",proposerRoleKeys:["organisation-owner","registered-manager","quality-compliance-manager"],approverRoleKeys:["organisation-owner","registered-manager","quality-compliance-manager","nominated-individual"],selfApprovalAllowed:index===0,requiredApprovalCount:riskLevel==="CRITICAL"?2:1,verifiedEvidenceRequired:["HIGH","CRITICAL"].includes(riskLevel),effectivenessEvidenceRequired:["HIGH","CRITICAL"].includes(riskLevel)}))}}});await transaction.riskFrameworkVersion.create({data:{organisationId:organisation.id,versionNumber:versionNumber+1,status:"EFFECTIVE",effectiveFrom:currentEffectiveFrom,defaultAppetite:"LOW",defaultToleranceScore:4,changeRationale:"Fictional E2E Risk Framework used only for authenticated browser testing.",closurePolicyVersionId:policy.id,createdById:user.id,approvedById:user.id,approvedAt:currentEffectiveFrom,rules:{create:{organisationId:organisation.id,categoryKey:"MEDICINES",categoryLabel:"Medicines",appetite:"LOW",toleranceScore:4,escalationIndicator:"Escalate residual Medicines Risks above four."}}}})});
    }
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.authRateLimit.deleteMany({
      where: {
        keyHash: {
          in: ["local", "127.0.0.1", "::1"].map((address) => hashRateLimitKey(`${address}:${email}`, sessionSecret)),
        },
      },
    });

    const sourceReference = "E2E-SRC-001";
    const existingEvidence = await db.evidence.findFirst({
      where: { organisationId: organisation.id, sourceReference },
      select: { id: true },
    });
    const evidence = existingEvidence
      ? await db.evidence.update({
          where: { id: existingEvidence.id },
          data: {
            title: "E2E verified governance source",
            category: "Audits",
            evidenceType: "Record",
            taxonomyFamilyKey: "MEDICINES",
            taxonomyTypeKey: "MEDICATION_AUDIT",
            taxonomyFamilySnapshot: "Medicines",
            taxonomyTypeSnapshot: "Medication audit",
            currentnessMode: "HISTORICAL_NON_EXPIRING",
            currentnessStatus: "CURRENT",
            ownerId: user.id,
            uploadedById: user.id,
            relatedModule: "E2EFixture",
            sourceType: "INTERNAL_RECORD",
            sourceName: "Fictional E2E fixture",
            sourceReference,
            status: "ACTIVE",
            archivedAt: null,
            reviewExpiryDate: null,
            provenanceNote: "Created only for authenticated browser testing in the fictional demo tenant.",
          },
          select: { id: true },
        })
      : await db.evidence.create({
          data: {
            organisationId: organisation.id,
            title: "E2E verified governance source",
            description: "Fictional governed source used to test source linking and closure assurance.",
            category: "Audits",
            evidenceType: "Record",
            taxonomyFamilyKey: "MEDICINES",
            taxonomyTypeKey: "MEDICATION_AUDIT",
            taxonomyFamilySnapshot: "Medicines",
            taxonomyTypeSnapshot: "Medication audit",
            currentnessMode: "HISTORICAL_NON_EXPIRING",
            currentnessStatus: "CURRENT",
            ownerId: user.id,
            uploadedById: user.id,
            relatedModule: "E2EFixture",
            sourceType: "INTERNAL_RECORD",
            sourceName: "Fictional E2E fixture",
            sourceReference,
            provenanceNote: "Created only for authenticated browser testing in the fictional demo tenant.",
          },
          select: { id: true },
        });
    await db.evidenceVerification.deleteMany({ where: { evidenceId: evidence.id } });
    await db.evidenceVerification.create({
      data: {
        organisationId: organisation.id,
        evidenceId: evidence.id,
        outcome: "VERIFIED",
        relevance: "Supports the fictional E2E Risk workflow.",
        currencyAssessment: "Current for this test run.",
        authenticityCheck: "Provisioned by guarded demo-only E2E setup.",
        verifiedById: user.id,
      },
    });

    const existingUnverified=await db.evidence.findFirst({where:{organisationId:organisation.id,sourceReference:"E2E-UNVERIFIED-001"},select:{id:true}});
    const unverifiedEvidence=existingUnverified?await db.evidence.update({where:{id:existingUnverified.id},data:{title:"E2E unverified source",ownerId:user.id,uploadedById:user.id,status:"ACTIVE"},select:{id:true}}):await db.evidence.create({data:{organisationId:organisation.id,title:"E2E unverified source",description:"Fictional unverified Evidence for direct API security testing.",category:"Audits",evidenceType:"Record",ownerId:user.id,uploadedById:user.id,sourceType:"INTERNAL_RECORD",sourceName:"Release gate",sourceReference:"E2E-UNVERIFIED-001"},select:{id:true}});
    await db.evidenceVerification.deleteMany({where:{evidenceId:unverifiedEvidence.id}});
    const existingCorrected=await db.evidence.findFirst({where:{organisationId:organisation.id,sourceReference:"E2E-CORRECTED-001"},select:{id:true}});
    const correctedEvidence=existingCorrected?await db.evidence.update({where:{id:existingCorrected.id},data:{title:"E2E corrected completion evidence",description:"Fictional corrected record added after a rejected verification.",category:"Audits",evidenceType:"Record",taxonomyFamilyKey:"MEDICINES",taxonomyTypeKey:"MEDICATION_AUDIT",taxonomyFamilySnapshot:"Medicines",taxonomyTypeSnapshot:"Medication audit",currentnessMode:"HISTORICAL_NON_EXPIRING",currentnessStatus:"CURRENT",ownerId:user.id,uploadedById:user.id,status:"ACTIVE",archivedAt:null},select:{id:true}}):await db.evidence.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,title:"E2E corrected completion evidence",description:"Fictional corrected record added after a rejected verification.",category:"Audits",evidenceType:"Record",taxonomyFamilyKey:"MEDICINES",taxonomyTypeKey:"MEDICATION_AUDIT",taxonomyFamilySnapshot:"Medicines",taxonomyTypeSnapshot:"Medication audit",currentnessMode:"HISTORICAL_NON_EXPIRING",currentnessStatus:"CURRENT",ownerId:user.id,uploadedById:user.id,sourceType:"INTERNAL_RECORD",sourceName:"Release gate",sourceReference:"E2E-CORRECTED-001",provenanceNote:"Created only for the rejected-then-corrected verification scenario."},select:{id:true}});
    await db.evidenceVerification.deleteMany({where:{evidenceId:correctedEvidence.id}});
    await db.evidenceVerification.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,evidenceId:correctedEvidence.id,outcome:"VERIFIED",relevance:"Supports corrected fictional completion evidence.",currencyAssessment:"Current for this test run.",authenticityCheck:"Provisioned by guarded demo-only E2E setup.",verifiedById:user.id}});
    const scenarioDefinitions=[
      {reference:"E2E-RSK-SEC-MISSING-EVIDENCE",score:2,evidenceId:null,effective:true,openAction:false},
      {reference:"E2E-RSK-SEC-MISSING-VERIFICATION",score:2,evidenceId:unverifiedEvidence.id,effective:true,openAction:false},
      {reference:"E2E-RSK-SEC-MISSING-EFFECTIVENESS",score:2,evidenceId:evidence.id,effective:false,openAction:false},
      {reference:"E2E-RSK-SEC-OUTSIDE-TOLERANCE",score:6,evidenceId:evidence.id,effective:true,openAction:false},
      {reference:"E2E-RSK-SEC-UNRESOLVED-ACTION",score:2,evidenceId:evidence.id,effective:true,openAction:true},
      {reference:"E2E-RSK-SEC-READY",score:2,evidenceId:evidence.id,effective:true,openAction:false},
      {reference:"E2E-RSK-SEC-POLICY-CHANGED",score:2,evidenceId:evidence.id,effective:true,openAction:false,policyChanged:true},
    ] as const;
    for(const scenario of scenarioDefinitions){const residualLikelihood=scenario.score===6?2:1,residualImpact=scenario.score===6?3:2;const scenarioRisk=await db.risk.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:scenario.reference,title:scenario.reference.replaceAll("E2E-RSK-SEC-","").replaceAll("-"," "),description:"Fictional direct API release-gate scenario.",category:"Medicines",cause:"A required assurance condition is absent.",riskEvent:"Closure may be attempted prematurely.",consequence:"Governance assurance could be overstated.",existingControls:"Release-gate test control.",likelihood:5,impact:5,initialScore:25,initialLevel:"CRITICAL",residualLikelihood,residualImpact,residualScore:scenario.score,residualLevel:scenario.score>=20?"CRITICAL":scenario.score>=10?"HIGH":scenario.score>=5?"MODERATE":"LOW",appetite:"LOW",toleranceScore:4,reviewFrequency:"Monthly",nextReviewDate:new Date("2026-10-01T00:00:00.000Z"),ownerId:user.id,createdById:user.id,evidenceLinks:scenario.evidenceId?{create:{evidenceId:scenario.evidenceId}}:undefined}});if(scenario.effective)await db.riskReview.create({data:{riskId:scenarioRisk.id,reviewedById:user.id,reviewDate:new Date(),notes:"Fictional effectiveness review for the direct API release gate.",likelihood:residualLikelihood,impact:residualImpact,score:scenario.score,level:scenario.score>=5?"MODERATE":"LOW",controlsEffective:true,assuranceChecked:"Fictional evidence checked.",nextReviewDate:new Date("2026-10-01T00:00:00.000Z")}});if(scenario.openAction)await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:`E2E-ACT-${scenarioRisk.id.slice(0,8)}`,title:"Unresolved fictional treatment",description:"Must block closure.",sourceType:"RISK",sourceRecordId:scenarioRisk.id,sourceReference:scenario.reference,ownerId:user.id,dueDate:new Date("2026-10-01T00:00:00.000Z"),createdById:user.id}});if("policyChanged" in scenario&&scenario.policyChanged){await db.riskClosureProposal.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,riskId:scenarioRisk.id,policyVersionId:null,previousRiskStatus:"OPEN",residualScoreSnapshot:2,toleranceScoreSnapshot:4,appetiteSnapshot:"LOW",rationale:"Fictional proposal raised under a prior policy position.",proposedById:user.id,proposedRoleKeySnapshot:ROLE_KEYS.QUALITY_MANAGER,evidenceLinks:{create:{evidenceId:evidence.id}}}});await db.risk.update({where:{id:scenarioRisk.id},data:{status:"CLOSURE_PROPOSED"}})}}
    const oldFramework=await db.riskFrameworkVersion.findFirst({where:{organisationId:organisation.id,status:"SUPERSEDED"},include:{rules:{where:{categoryKey:"MEDICINES"}}},orderBy:{versionNumber:"asc"}});
    if(oldFramework){for(const legacy of [{reference:"E2E-RSK-SEC-FRAMEWORK-CHANGE",withFramework:true},{reference:"E2E-RSK-SEC-LEGACY",withFramework:false}])await db.risk.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:legacy.reference,title:legacy.withFramework?"Framework change exception":"Legacy Risk-level position",description:"Fictional historical Risk for provenance validation.",category:"Medicines",cause:"Historical exposure was assessed under an earlier governance position.",riskEvent:"The organisation may later change its tolerance.",consequence:"The Risk may become outside current tolerance without worsening.",existingControls:"Historical monitoring control.",likelihood:4,impact:4,initialScore:16,initialLevel:"HIGH",residualLikelihood:2,residualImpact:4,residualScore:8,residualLevel:"HIGH",appetite:"LOW",toleranceScore:9,reviewFrequency:"Monthly",nextReviewDate:new Date("2026-10-01T00:00:00.000Z"),ownerId:user.id,createdById:user.id,riskFrameworkVersionId:legacy.withFramework?oldFramework.id:null,riskFrameworkRuleId:legacy.withFramework?oldFramework.rules[0]?.id:null,frameworkAppetiteSnapshot:legacy.withFramework?"LOW":null,frameworkToleranceSnapshot:legacy.withFramework?9:null,frameworkInheritedAppetiteSnapshot:legacy.withFramework?"LOW":null,frameworkInheritedToleranceSnapshot:legacy.withFramework?9:null,frameworkAppliedAt:legacy.withFramework?new Date("2025-06-01T00:00:00.000Z"):null}})}

    const readyRisk=await db.risk.findFirstOrThrow({where:{organisationId:organisation.id,reference:"E2E-RSK-SEC-READY"},select:{id:true,reference:true}});
    const registeredManagerFixture=usersToProvision.find(item=>item.roleKey===ROLE_KEYS.REGISTERED_MANAGER),registeredManagerId=registeredManagerFixture?provisionedUsers.get(registeredManagerFixture.email)?.id:user.id;
    const ownerFixture=usersToProvision.find(item=>item.roleKey===ROLE_KEYS.OWNER),organisationOwnerId=ownerFixture?provisionedUsers.get(ownerFixture.email)?.id:user.id;
    const now=new Date(),dueDate=new Date(Date.now()+30*86_400_000);
    const highAction=await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-ASSURANCE-HIGH",title:"High Medicines assurance Action",description:"Implement and test the medicines control identified by the fictional Risk.",category:"Medicines",expectedOutcome:"The medicines control operates without repeat exception.",successMeasure:"A subsequent audit sample demonstrates no repeat exception.",sourceType:"RISK",sourceRecordId:readyRisk.id,sourceReference:readyRisk.reference,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"AWAITING_VERIFICATION",lifecycleStatus:"AWAITING_VERIFICATION",progressPercent:100,completionDate:now,createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id}},rootCauseReview:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,method:"FIVE_WHYS",problemStatement:"The previous medicines control did not reliably detect the fictional exception.",immediateCauses:["Review step was missed"],contributingFactors:["No exception prompt"],systemCauses:["Control design gap"],lessons:"Exception monitoring must be explicit and attributable.",preventiveControls:"Use a defined audit sample followed by management review.",status:"APPROVED",reviewedById:registeredManagerId!,approvedById:registeredManagerId,approvedAt:now}}}});
    const ineffectiveAction=await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-ASSURANCE-INEFFECTIVE",title:"Ineffective Medicines assurance Action",description:"Test that an ineffective outcome reopens the improvement path.",category:"Medicines",expectedOutcome:"No recurring documentation exception.",successMeasure:"Follow-up audit shows no repeat exception.",sourceType:"RISK",sourceRecordId:readyRisk.id,sourceReference:readyRisk.reference,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"AWAITING_VERIFICATION",lifecycleStatus:"AWAITING_EFFECTIVENESS",progressPercent:100,completionDate:now,verifiedById:registeredManagerId,verificationDate:now,completedActionSummary:"The planned control was implemented.",evidenceReviewedSummary:"The fictional completion record was checked.",verificationRationale:"Completion evidence supports that the activity occurred.",createdById:user.id,evidenceLinks:{create:[{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id},{evidenceId:evidence.id,role:"VERIFICATION",linkedById:registeredManagerId}]},verifications:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,verificationType:"CLOSURE",outcome:"VERIFIED",completedWork:"The planned control was implemented.",evidenceSummary:"The fictional completion record was checked.",evidenceIds:[evidence.id],successMeasureResult:"Implementation was confirmed; effectiveness remains to be tested.",independenceConfirmed:true,rationale:"Completion evidence supports that the activity occurred.",verifierId:registeredManagerId!,verifiedAt:now}}}});
    const lowAction=await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-ASSURANCE-LOW",title:"Low administration Action",description:"Update a non-material internal index entry.",category:"Governance",expectedOutcome:"The index entry is current.",successMeasure:"The revised entry is present.",sourceType:"MANUAL",ownerId:user.id,oversightOwnerId:organisationOwnerId,priority:"LOW",dueDate,status:"AWAITING_EVIDENCE",lifecycleStatus:"READY_FOR_CLOSURE",progressPercent:100,completionDate:now,createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id}}}});
    const rejectedAction=await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-ASSURANCE-REJECTED",title:"Rejected then corrected verification Action",description:"Demonstrate that a rejected verification remains historical while a later decision governs current assurance.",category:"Medicines",expectedOutcome:"Corrective work is evidenced and accepted by a separate verifier.",successMeasure:"The corrected record satisfies the defined verification check.",sourceType:"RISK",sourceRecordId:readyRisk.id,sourceReference:readyRisk.reference,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"AWAITING_VERIFICATION",lifecycleStatus:"AWAITING_VERIFICATION",progressPercent:100,completionDate:now,createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id}},rootCauseReview:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,method:"SYSTEMS_REVIEW",problemStatement:"The first completion claim needs a controlled verification decision.",immediateCauses:["Initial completion evidence was insufficient"],contributingFactors:["Verification criteria were not met"],systemCauses:["Corrective evidence required"],lessons:"Rejected verification must remain attributable.",preventiveControls:"Record corrected evidence and a new verification decision.",status:"APPROVED",reviewedById:registeredManagerId!,approvedById:registeredManagerId,approvedAt:now}}}});
    const dependencyAction=await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-ASSURANCE-DEPENDENCY",title:"External professional outcome Action",description:"Provider work is complete but a fictional professional outcome remains outstanding.",category:"Governance",expectedOutcome:"The external outcome is received and reviewed.",successMeasure:"A controlled response is recorded.",sourceType:"MANUAL",ownerId:user.id,oversightOwnerId:organisationOwnerId,priority:"LOW",dueDate,status:"AWAITING_EVIDENCE",lifecycleStatus:"READY_FOR_CLOSURE",progressPercent:100,completionDate:now,createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id}},externalDependencies:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,partyName:"Fictional Specialist Service",contactEmail:"specialist@example.invalid",request:"Provide the fictional professional outcome.",requestedAt:now,dueDate,interimControl:"Registered Manager maintains the interim control while awaiting the response.",escalationRoute:"Escalate through provider governance if the response is overdue.",ownerId:user.id}}}});
    const incidentDefinition=await db.registerDefinition.findFirstOrThrow({where:{key:"incidents",organisationId:null},select:{id:true}}),incidentData={incidentType:"Care delivery",immediateResponse:"The person was supported, immediate risk was controlled and the RM was informed.",harmLevel:"Moderate harm",emergencyServices:"Not required",safeguardingReferral:"Not required — rationale in investigation",cqcNotification:"Not required — rationale in investigation",dutyOfCandour:"Required / completed"};
    const readyIncident=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:incidentDefinition.id,locationId:guildfordLocation.id,reference:"E2E-INC-READY",eventDate:now,title:"Fictional incident ready for assurance",summary:"A fictional care-delivery exception used to prove separate Incident and Action closure.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:incidentData,createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id}},incidentInvestigation:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,status:"COMPLETED",factualChronology:"The contemporaneous records and accounts were reconciled into a verified chronology.",informationSources:"Incident record, care record and management account.",personRepresentativeInvolvement:"The person and representative reviewed the factual outcome.",immediateCauses:["Escalation prompt was missed"],contributingFactors:["Handover did not highlight the exception"],systemCauses:["The control was not visible at the decision point"],rootCause:"The escalation control was not reliably presented at the decision point.",notificationDecisionSummary:"The RM considered safeguarding, CQC and Duty of Candour, recorded each decision and completed the applicable candour response.",learning:"Escalation controls must be visible and tested.",learningSharedWith:"Shared through team learning and a recorded understanding check.",affectedRecordsReviewed:"The care plan and risk assessment were reviewed through controlled change.",outcome:"Immediate harm was addressed and the preventive control was tested.",investigatorId:user.id,completedById:user.id,completedAt:now}}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-INCIDENT-EFFECTIVE",title:"Effective fictional Incident Action",description:"Implement and test the control arising from E2E-INC-READY.",category:"Incidents and accidents",expectedOutcome:"The incident control operates consistently.",successMeasure:"Follow-up observation shows no repeat exception.",sourceType:"INCIDENT",sourceRecordId:readyIncident.id,sourceReference:readyIncident.reference,sourceUrl:`/registers/incidents/${readyIncident.id}`,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"COMPLETED",lifecycleStatus:"CLOSED_VERIFIED",progressPercent:100,completionDate:now,verifiedById:registeredManagerId,verificationDate:now,closedById:organisationOwnerId,closedAt:now,closureAssuranceRationale:"Fictional completion, verification and effectiveness are evidenced.",createdById:user.id,evidenceLinks:{create:[{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id},{evidenceId:evidence.id,role:"VERIFICATION",linkedById:registeredManagerId},{evidenceId:evidence.id,role:"EFFECTIVENESS",linkedById:registeredManagerId},{evidenceId:evidence.id,role:"CLOSURE",linkedById:organisationOwnerId}]},effectivenessReviews:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,reviewDate:now,outcome:"EFFECTIVE",successMeasure:"Follow-up observation shows no repeat exception.",baseline:"One fictional incident exception.",target:"No repeat in follow-up observation.",observedResult:"The follow-up observation found no repeat exception.",evidenceIds:[evidence.id],recurrenceFound:false,decision:"The tested control was effective.",reviewerId:registeredManagerId!}}}});
    const blockedIncident=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:incidentDefinition.id,locationId:guildfordLocation.id,reference:"E2E-INC-BLOCKED",eventDate:now,title:"Fictional incident with unresolved Action",summary:"A fictional incident that must remain open while its central Action is unresolved.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:incidentData,createdById:user.id,incidentInvestigation:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,status:"COMPLETED",factualChronology:"A verified fictional chronology.",personRepresentativeInvolvement:"The fictional person was involved.",rootCause:"A process control was absent.",notificationDecisionSummary:"All statutory routes were considered with rationale.",learning:"Add and test the missing control.",learningSharedWith:"Shared through a recorded briefing.",affectedRecordsReviewed:"The relevant governed records were reviewed.",outcome:"Corrective Action remains outstanding.",investigatorId:user.id,completedById:user.id,completedAt:now}}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-INCIDENT-OPEN",title:"Unresolved fictional Incident Action",description:"This Action must block Incident closure.",category:"Incidents and accidents",expectedOutcome:"The control is implemented.",successMeasure:"The control is verified and effective.",sourceType:"INCIDENT",sourceRecordId:blockedIncident.id,sourceReference:blockedIncident.reference,sourceUrl:`/registers/incidents/${blockedIncident.id}`,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"IN_PROGRESS",lifecycleStatus:"ACTION_IN_PROGRESS",progressPercent:50,createdById:user.id}});

    const complaintDefinition=await db.registerDefinition.findFirstOrThrow({where:{key:"complaints",organisationId:null},select:{id:true}});
    const complaintInvestigationBase={organisationId:organisation.id,locationId:guildfordLocation.id,status:"COMPLETED" as const,complainantName:"Fictional complainant",complainantRelationship:"Representative",representationAuthority:"Authority confirmed for the fictional scenario.",contactPreference:"Email",accessibilityNeeds:"Plain English response.",category:"Care quality",immediateSafetyConcern:"No immediate safety concern identified",safeguardingDecision:"Considered — not required; no safeguarding facts identified.",incidentDecision:"Considered — not required; no separate incident identified.",triageSummary:"A proportionate evidence-led Complaint investigation is required.",acknowledgementDueAt:new Date(now.getTime()+2*86_400_000),responseDueAt:new Date(now.getTime()+20*86_400_000),investigationApproach:"Review the record, speak with the complainant and compare the service process.",evidenceSources:"Governed test Evidence and communication chronology.",complainantInvolvement:"The fictional complainant reviewed the issues and received the outcome.",investigationOutcome:"The concern was investigated and a reasoned finding was recorded.",remedy:"A written response, apology where appropriate and tracked improvement.",learning:"Complaint findings must become attributable Actions when improvement is required.",learningScopes:["TEAM","SERVICE_LOCATION"],affectedRecordsReviewed:"Relevant service process and staff instruction reviewed.",recurrenceReview:"No matching structured category at this location in the fixture period.",responsePreparedAt:now,responseSummary:"The final response explains each finding, remedy and escalation route.",responseApprovedById:registeredManagerId,responseApprovedAt:now,findingsCommunicated:true,remedyCommunicated:true,learningCommunicated:true,escalationRightsConfirmed:true,investigatorId:registeredManagerId!,completedById:registeredManagerId,completedAt:now};
    const communicationBase={organisationId:organisation.id,locationId:guildfordLocation.id,authorId:registeredManagerId!,participants:"Fictional complainant and Registered Manager"};

    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:complaintDefinition.id,locationId:guildfordLocation.id,reference:"E2E-CMP-LOW",eventDate:now,title:"Fictional low-complexity Complaint",summary:"A proportionate Complaint that can close without unnecessary evidence bureaucracy.",riskLevel:"LOW",status:"IN_REVIEW",ownerId:registeredManagerId,data:{category:"Communication",immediateSafetyConcern:"No immediate safety concern identified"},createdById:user.id,complaintInvestigation:{create:{...complaintInvestigationBase,category:"Communication",responseApprovedById:null,responseApprovedAt:null,recurrenceReview:null}},complaintIssues:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,sequence:1,category:"Communication",concern:"A routine update was not explained clearly.",finding:"NOT_UPHELD",reasoning:"The communication record shows the required update was issued, while the clarity concern was acknowledged.",outcomeSummary:"Explanation provided.",actionRequired:false}},complaintCommunications:{create:[{...communicationBase,type:"ACKNOWLEDGEMENT",direction:"OUTBOUND",occurredAt:now,summary:"Complaint acknowledged and scope confirmed."},{...communicationBase,type:"FINAL_RESPONSE",direction:"OUTBOUND",occurredAt:now,summary:"Final response issued with findings and escalation information."}]}}});

    const readyComplaint=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:complaintDefinition.id,locationId:guildfordLocation.id,reference:"E2E-CMP-READY",eventDate:now,title:"Fictional Complaint ready for assurance",summary:"A material Complaint with an effective central Action and governed final response.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:{category:"Care quality",immediateSafetyConcern:"No immediate safety concern identified"},createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id}},complaintInvestigation:{create:complaintInvestigationBase},complaintIssues:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,sequence:1,category:"Care quality",concern:"A service control was not consistently applied.",finding:"UPHELD",reasoning:"The governed record confirms one missed application of the control.",outcomeSummary:"Control corrected and tested.",actionRequired:true,evidenceLinks:{create:{evidenceId:evidence.id}}}},complaintCommunications:{create:[{...communicationBase,type:"ACKNOWLEDGEMENT",direction:"OUTBOUND",occurredAt:now,summary:"Material Complaint acknowledged and investigation scope confirmed."},{...communicationBase,type:"FINAL_RESPONSE",direction:"OUTBOUND",occurredAt:now,summary:"Approved final response issued with finding, remedy, learning and escalation route.",evidenceId:evidence.id}]}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-COMPLAINT-EFFECTIVE",title:"Effective fictional Complaint Action",description:"Implement and test the service control arising from E2E-CMP-READY.",category:"Complaints",expectedOutcome:"The service control operates consistently.",successMeasure:"A follow-up sample demonstrates no repeat exception.",sourceType:"COMPLAINT",sourceRecordId:readyComplaint.id,sourceReference:readyComplaint.reference,sourceUrl:`/registers/complaints/${readyComplaint.id}`,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"COMPLETED",lifecycleStatus:"CLOSED_VERIFIED",progressPercent:100,completionDate:now,verifiedById:registeredManagerId,verificationDate:now,closedById:organisationOwnerId,closedAt:now,closureAssuranceRationale:"Fictional completion, verification and effectiveness are evidenced.",createdById:user.id,evidenceLinks:{create:[{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id},{evidenceId:evidence.id,role:"VERIFICATION",linkedById:registeredManagerId},{evidenceId:evidence.id,role:"EFFECTIVENESS",linkedById:registeredManagerId},{evidenceId:evidence.id,role:"CLOSURE",linkedById:organisationOwnerId}]},effectivenessReviews:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,reviewDate:now,outcome:"EFFECTIVE",successMeasure:"A follow-up sample demonstrates no repeat exception.",baseline:"One fictional control exception.",target:"No repeat in follow-up sample.",observedResult:"The follow-up sample found no repeat exception.",evidenceIds:[evidence.id],recurrenceFound:false,decision:"The tested improvement was effective.",reviewerId:registeredManagerId!}}}});

    const blockedComplaint=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:complaintDefinition.id,locationId:guildfordLocation.id,reference:"E2E-CMP-BLOCKED",eventDate:now,title:"Fictional Complaint with unresolved Action",summary:"A Complaint that must remain open while its central Action is unresolved.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:{category:"Care quality"},createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id}},complaintInvestigation:{create:complaintInvestigationBase},complaintIssues:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,sequence:1,category:"Care quality",concern:"An improvement remains outstanding.",finding:"UPHELD",reasoning:"Evidence supports the concern and the corrective Action remains incomplete.",outcomeSummary:"Action in progress.",actionRequired:true,evidenceLinks:{create:{evidenceId:evidence.id}}}},complaintCommunications:{create:[{...communicationBase,type:"ACKNOWLEDGEMENT",direction:"OUTBOUND",occurredAt:now,summary:"Complaint acknowledged."},{...communicationBase,type:"FINAL_RESPONSE",direction:"OUTBOUND",occurredAt:now,summary:"Interim governed outcome communicated.",evidenceId:evidence.id}]}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-COMPLAINT-OPEN",title:"Unresolved fictional Complaint Action",description:"This central Action must block Complaint closure.",category:"Complaints",expectedOutcome:"The improvement is implemented.",successMeasure:"The improvement is verified and effective.",sourceType:"COMPLAINT",sourceRecordId:blockedComplaint.id,sourceReference:blockedComplaint.reference,sourceUrl:`/registers/complaints/${blockedComplaint.id}`,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"IN_PROGRESS",lifecycleStatus:"ACTION_IN_PROGRESS",progressPercent:50,createdById:user.id}});

    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:complaintDefinition.id,locationId:guildfordLocation.id,reference:"E2E-CMP-CRITICAL",eventDate:now,title:"Fictional Critical Complaint authority test",summary:"A Critical Complaint requiring a separate authorised assurance decision.",riskLevel:"CRITICAL",status:"IN_REVIEW",ownerId:registeredManagerId,data:{category:"Care quality"},createdById:registeredManagerId!,evidenceLinks:{create:{evidenceId:evidence.id}},complaintInvestigation:{create:{...complaintInvestigationBase,responseApprovedById:organisationOwnerId,responseApprovedAt:now}},complaintIssues:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,sequence:1,category:"Care quality",concern:"A serious allegation required full investigation.",finding:"NOT_UPHELD",reasoning:"The available governed evidence does not support the allegation, and the rationale is recorded.",outcomeSummary:"No service failure found; escalation route provided.",actionRequired:false,evidenceLinks:{create:{evidenceId:evidence.id}}}},complaintCommunications:{create:[{...communicationBase,type:"ACKNOWLEDGEMENT",direction:"OUTBOUND",occurredAt:now,summary:"Critical Complaint acknowledged."},{...communicationBase,type:"FINAL_RESPONSE",direction:"OUTBOUND",occurredAt:now,summary:"Approved final response issued.",evidenceId:evidence.id}]}}});

    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:complaintDefinition.id,locationId:guildfordLocation.id,reference:"E2E-CMP-OVERDUE",eventDate:new Date(now.getTime()-10*86_400_000),title:"Fictional Complaint with overdue deadlines",summary:"A deliberately incomplete Complaint used to prove exception-based oversight.",riskLevel:"MEDIUM",status:"OPEN",ownerId:registeredManagerId,data:{category:"Communication",immediateSafetyConcern:"Unknown / evidence required"},createdById:user.id,complaintInvestigation:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,status:"DRAFT",complainantName:"Fictional complainant",category:"Communication",immediateSafetyConcern:"Unknown / evidence required",triageSummary:"Initial triage is incomplete and requires management attention.",acknowledgementDueAt:new Date(now.getTime()-8*86_400_000),responseDueAt:new Date(now.getTime()-2*86_400_000),investigatorId:registeredManagerId!}}}});

    const safeguardingDefinition=await db.registerDefinition.findFirstOrThrow({where:{key:"safeguarding",organisationId:null},select:{id:true}}),safeguardingBase={organisationId:organisation.id,locationId:guildfordLocation.id,status:"READY_FOR_ASSURANCE" as const,safetyPosition:"SAFE_NOW" as const,immediateControl:"The person was supported and the immediate concern was controlled.",concernCategories:["Neglect / acts of omission"],triageRationale:"The Registered Manager applied the provider safeguarding pathway and recorded professional judgement.",referralDecision:"NOT_REQUIRED" as const,referredTo:[] as string[],externalResponseStatus:"No external response required.",investigationQuestion:"What occurred and are further protections required?",investigationSummary:"The governed records and relevant accounts were reviewed proportionately.",peopleConsulted:"The person and representative were involved using fictional safe references.",findings:"The concern was investigated and the human finding was recorded.",outcome:"The current protection plan remains appropriate.",externalDependencies:"No external dependency remains.",learning:"The handover control was clarified and tested.",affectedRecordsReviewed:"Care plan and risk assessment reviewed without automatic overwrite.",recurrenceReview:"No controlled recurrence identified in the fixture period.",noFurtherActionRationale:"No further improvement Action is proportionate.",investigatorId:registeredManagerId!,completedAt:now};
    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:safeguardingDefinition.id,locationId:guildfordLocation.id,reference:"E2E-SG-LOW",eventDate:now,title:"Fictional low-complexity safeguarding concern",summary:"A proportionate safeguarding concern ready for accountable closure.",riskLevel:"LOW",status:"IN_REVIEW",ownerId:registeredManagerId,data:{safetyPosition:"Safe now",immediateResponse:"Person supported."},createdById:user.id,safeguardingCase:{create:{...safeguardingBase,immediateControl:null}},safeguardingEvents:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,type:"CONCERN_RAISED",occurredAt:now,summary:"Fictional low concern recorded.",authorId:user.id}}}});
    const readySafeguarding=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:safeguardingDefinition.id,locationId:guildfordLocation.id,reference:"E2E-SG-READY",eventDate:now,title:"Fictional safeguarding ready for assurance",summary:"A material concern with governed Evidence and an effective central Action.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:{safetyPosition:"Safe now"},createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id}},safeguardingCase:{create:safeguardingBase},safeguardingEvents:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,type:"CONCERN_RAISED",occurredAt:now,summary:"Fictional material concern recorded.",authorId:user.id,evidenceId:evidence.id}}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-SAFEGUARDING-EFFECTIVE",title:"Effective fictional safeguarding Action",description:"Implement and test the protection arising from E2E-SG-READY.",category:"Safeguarding",expectedOutcome:"The protection operates consistently.",successMeasure:"Follow-up review demonstrates no repeat exception.",sourceType:"SAFEGUARDING",sourceRecordId:readySafeguarding.id,sourceReference:readySafeguarding.reference,sourceUrl:`/registers/safeguarding/${readySafeguarding.id}`,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"COMPLETED",lifecycleStatus:"CLOSED_VERIFIED",progressPercent:100,completionDate:now,verifiedById:registeredManagerId,verificationDate:now,closedById:organisationOwnerId,closedAt:now,closureAssuranceRationale:"Fictional completion, verification and effectiveness are evidenced.",createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id,role:"COMPLETION",linkedById:user.id}},effectivenessReviews:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,reviewDate:now,outcome:"EFFECTIVE",successMeasure:"Follow-up review demonstrates no repeat exception.",baseline:"One fictional concern.",target:"No repeat in follow-up.",observedResult:"No repeat found.",evidenceIds:[evidence.id],recurrenceFound:false,decision:"The tested protection was effective.",reviewerId:registeredManagerId!}}}});
    const blockedSafeguarding=await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:safeguardingDefinition.id,locationId:guildfordLocation.id,reference:"E2E-SG-BLOCKED",eventDate:now,title:"Fictional safeguarding with unresolved Action",summary:"Must remain open until central Action is resolved.",riskLevel:"HIGH",status:"IN_REVIEW",ownerId:registeredManagerId,data:{},createdById:user.id,evidenceLinks:{create:{evidenceId:evidence.id}},safeguardingCase:{create:{...safeguardingBase,noFurtherActionRationale:null}}}});
    await db.action.create({data:{organisationId:organisation.id,locationId:guildfordLocation.id,reference:"E2E-ACT-SAFEGUARDING-OPEN",title:"Unresolved fictional safeguarding Action",description:"Must block closure.",category:"Safeguarding",expectedOutcome:"Protection implemented.",successMeasure:"Protection verified and effective.",sourceType:"SAFEGUARDING",sourceRecordId:blockedSafeguarding.id,sourceReference:blockedSafeguarding.reference,ownerId:user.id,oversightOwnerId:registeredManagerId,priority:"HIGH",dueDate,status:"IN_PROGRESS",lifecycleStatus:"ACTION_IN_PROGRESS",createdById:user.id}});
    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:safeguardingDefinition.id,locationId:guildfordLocation.id,reference:"E2E-SG-CRITICAL",eventDate:now,title:"Fictional Critical safeguarding authority test",summary:"Requires separate authorised closure.",riskLevel:"CRITICAL",status:"IN_REVIEW",ownerId:registeredManagerId,data:{},createdById:registeredManagerId!,evidenceLinks:{create:{evidenceId:evidence.id}},safeguardingCase:{create:{...safeguardingBase,investigatorId:registeredManagerId!}}}});
    await db.registerEntry.create({data:{organisationId:organisation.id,definitionId:safeguardingDefinition.id,locationId:guildfordLocation.id,reference:"E2E-SG-OVERDUE",eventDate:new Date(now.getTime()-10*86_400_000),title:"Fictional safeguarding external response overdue",summary:"Exception-based oversight fixture.",riskLevel:"HIGH",status:"OPEN",ownerId:registeredManagerId,data:{},createdById:user.id,safeguardingCase:{create:{organisationId:organisation.id,locationId:guildfordLocation.id,status:"AWAITING_EXTERNAL_RESPONSE",safetyPosition:"CONTROLLED_IMMEDIATE_RISK",immediateControl:"Interim protection remains in place.",concernCategories:["Neglect / acts of omission"],triageRationale:"Referral required and made.",referralDecision:"MADE",referredTo:["Local authority safeguarding team"],referralDate:new Date(now.getTime()-9*86_400_000),externalResponseDueAt:new Date(now.getTime()-2*86_400_000),investigatorId:registeredManagerId!}}}});

    await db.activityLog.createMany({data:[highAction,ineffectiveAction,lowAction,rejectedAction,dependencyAction].map(action=>({organisationId:organisation.id,locationId:action.locationId,userId:user.id,action:"CREATE",recordType:"E2EActionFixture",recordId:action.id,summary:`Created ${action.reference} for the Action assurance release gate.`}))});

    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
