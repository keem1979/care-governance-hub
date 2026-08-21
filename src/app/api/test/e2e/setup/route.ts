import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { encryptMfaSecret } from "@/lib/auth/mfa";
import { hashRateLimitKey } from "@/lib/auth/rate-limit";
import { createDb } from "@/lib/db";
import { permissionLabel, ROLE_KEYS, ROLE_PERMISSION_MAP, type RoleKey } from "@/lib/permissions";

export const runtime = "nodejs";

function hasValidSetupRequest(request: Request) {
  const setupToken = process.env.E2E_SETUP_TOKEN;
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(setupToken) &&
    request.headers.get("x-e2e-setup-token") === setupToken
  );
}

async function removeGeneratedFixtures(db: ReturnType<typeof createDb>, organisationId: string) {
  const risks = await db.risk.findMany({
    where: { organisationId, reference: { startsWith: "E2E-RSK-" } },
    select: { id: true },
  });
  const riskIds = risks.map(({ id }) => id);
  if (riskIds.length === 0) return { risks: 0, actions: 0 };

  const actions = await db.action.findMany({
    where: {
      organisationId,
      sourceType: "RISK",
      sourceRecordId: { in: riskIds },
    },
    select: { id: true },
  });
  const actionIds = actions.map(({ id }) => id);
  const proposals=await db.riskClosureProposal.findMany({where:{organisationId,riskId:{in:riskIds}},select:{id:true}}),proposalIds=proposals.map(({id})=>id);

  await db.$transaction(async (transaction) => {
    await transaction.activityLog.deleteMany({
      where: {
        organisationId,
        recordId: { in: [...riskIds, ...actionIds, ...proposalIds] },
      },
    });
    if (actionIds.length > 0) {
      await transaction.action.deleteMany({ where: { id: { in: actionIds }, organisationId } });
    }
    if(proposalIds.length){await transaction.riskClosureApproval.deleteMany({where:{proposalId:{in:proposalIds},organisationId}});await transaction.riskClosureProposalEvidence.deleteMany({where:{proposalId:{in:proposalIds}}});await transaction.riskClosureProposal.deleteMany({where:{id:{in:proposalIds},organisationId}})}
    await transaction.risk.deleteMany({ where: { id: { in: riskIds }, organisationId } });
  });

  return { risks: riskIds.length, actions: actionIds.length };
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
  const db=createDb();try{const risks=await db.risk.findMany({where:{reference:{startsWith:"E2E-RSK-SEC-"}},select:{id:true,reference:true,locationId:true},orderBy:{reference:"asc"}});return NextResponse.json({risks:Object.fromEntries(risks.map(risk=>[risk.reference,{id:risk.id,locationId:risk.locationId}]))})}finally{await db.$disconnect()}
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
  // fixtures. It is unavailable unless Playwright explicitly enables it and is
  // always unavailable in a production process.
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

    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
